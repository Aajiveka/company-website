import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import argon2 from 'argon2';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/modules/storage/storage.service';
import { AuditService } from '@/modules/audit/audit.service';
import { JobMapStatus, SubscriberStatus, JOB_STATUS_ACTIVE } from '@/shared/status';
import type {
  CreateJobAlertDto,
  CreateSavedSearchDto,
  UpdateNotificationPrefsDto,
  UpdatePersonalDto,
  UpdateProfessionalDto,
  UpsertCertificateDto,
  UpsertEducationDto,
  UpsertEmploymentDto,
} from './dto/candidates.dto';

/* ------------------------------------------------------------------ *
 * Activity timeline
 * ------------------------------------------------------------------ */

/** The event vocabulary the timeline UI renders — kept in step with ActivityTimelinePage. */
type ActivityEventType =
  | 'applied'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'interview_completed'
  | 'selected'
  | 'rejected'
  | 'document_uploaded'
  | 'profile_updated';

interface ActivityEvent {
  eventId: number;
  type: ActivityEventType;
  title: string;
  description: string;
  /** ISO 8601. */
  timestamp: string;
  jobTitle?: string;
  company?: string;
}

const ACTIVITY_PAGE_SIZE = 20;
/** Per-source ceiling before merging, so one very active candidate cannot load unbounded rows. */
const ACTIVITY_SOURCE_LIMIT = 200;

/**
 * Primary keys are unique only within their own table, so each source gets its own numeric
 * range. The client uses eventId as a React key; colliding ids would drop rows from the list.
 */
const ID_BASE = {
  application: 1_000_000_000,
  status: 2_000_000_000,
  interview: 3_000_000_000,
  document: 4_000_000_000,
  profile: 5_000_000_000,
} as const;

/**
 * tblMstrJobMappingStatus -> timeline vocabulary. MAPPED is deliberately absent: the
 * application row itself already yields the `applied` event, so mapping it here too would
 * show every application twice.
 */
const STATUS_EVENT_TYPE: Record<number, ActivityEventType | undefined> = {
  [JobMapStatus.SHORTLISTED]: 'shortlisted',
  [JobMapStatus.INTERVIEW_SCHEDULED]: 'interview_scheduled',
  [JobMapStatus.SELECTED]: 'selected',
  [JobMapStatus.REJECTED]: 'rejected',
  [JobMapStatus.INTERVIEW_ATTENDED]: 'interview_completed',
  [JobMapStatus.RESCHEDULE_REQUESTED]: 'interview_scheduled',
  [JobMapStatus.RESCHEDULED]: 'interview_scheduled',
  [JobMapStatus.INTERVIEW_NOT_ATTENDED]: 'interview_completed',
};

const STATUS_TITLE: Record<ActivityEventType, string> = {
  applied: 'Application submitted',
  shortlisted: 'Shortlisted',
  interview_scheduled: 'Interview scheduled',
  interview_completed: 'Interview completed',
  selected: 'Selected',
  rejected: 'Not selected',
  document_uploaded: 'Document uploaded',
  profile_updated: 'Profile updated',
};

/**
 * The subscriber (candidate) side.
 *
 * A login does NOT imply a subscriber id. The legacy schema has no link between
 * tblSecUser and tblSubscriberRegistration — the C# put SubscriberID straight into
 * Session, and we did not recover it. This used to pass user.userId straight through as
 * the subscriber id, which only worked because UserID 1 and SubscriberID 1 happened to
 * collide in the dev data. They are independent identity sequences.
 *
 * The link is now explicit (tblSecUser.SubscriberID). It is NULL for the migrated legacy
 * rows, because the mapping is not discoverable from the data and guessing it would hand
 * one candidate another candidate's CV.
 */
@Injectable()
export class CandidatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  private fmtDate(d: Date | null) {
    return d && d.getFullYear() > 1900 ? d.toISOString().slice(0, 10) : '';
  }

  /** Resolves the caller's own subscriber id, or fails loudly. */
  async subscriberIdFor(userId: number): Promise<number> {
    const user = await this.db.secUser.findUnique({
      where: { userID: userId },
      select: { subscriberID: true },
    });
    if (!user?.subscriberID) {
      throw new NotFoundException('This login is not linked to a candidate profile');
    }
    return Number(user.subscriberID);
  }

  /** Port of spSubscriberGetCVToDisplay. */
  async profile(subscriberId: number) {
    const cv = await this.db.subscriberCVDetails.findUnique({
      where: { subscriberID: subscriberId },
      include: {
        city: { select: { descr: true } },
        subFunction: { select: { descr: true } },
        industryType: { select: { industryType: true } },
      },
    });
    if (!cv) throw new NotFoundException('Candidate profile not found');

    const [tags, education, employers] = await Promise.all([
      // Skills are tags, not tblMstrSkills — the proc builds them from tblSubscriberTags.
      this.db.subscriberTags.findMany({
        where: { subscriberID: subscriberId },
        include: { tag: { select: { tagName: true } } },
      }),
      this.db.subscriberEducation.findMany({
        where: { subscriberID: subscriberId },
        include: { degree: { select: { descr: true } } },
        orderBy: { subscriberEducationID: 'asc' },
      }),
      this.db.subscriberEmployer.findMany({
        where: { subscriberID: subscriberId },
        include: { designation: { select: { descr: true } } },
        orderBy: { joiningDate: 'desc' },
      }),
    ]);

    const gender = cv.gender === 'M' ? 'Male' : cv.gender === 'F' ? 'Female' : 'Others';
    const date = (d: Date | null) => this.fmtDate(d);

    return {
      subscriberId,
      fullName: cv.fullName?.trim() || cv.mobileNo1 || '',
      email: cv.emailID ?? '',
      mobile: cv.mobileNo1 ?? '',
      gender,
      city: cv.city?.descr ?? '',
      designation: cv.subFunction?.descr ?? '',
      totalExperience: cv.totalExp != null ? String(cv.totalExp) : '',
      photoUrl: cv.photoName?.trim() ? `/files/${cv.photoName}` : null,
      skills: tags.map((t) => t.tag?.tagName ?? '').filter(Boolean),
      education: education.map((e) => ({
        degree: e.degree?.descr ?? '',
        institute: '', // tblSubscriberEducation records no institute — the column does not exist.
        year: date(e.timestampIns).slice(0, 4),
      })),
      experience: employers.map((e) => ({
        company: e.employer ?? '',
        designation: e.designation?.descr ?? '',
        from: date(e.joiningDate),
        to: e.flgCurrent ? 'Present' : date(e.releavingDate),
      })),
    };
  }

  /**
   * Records that the candidate finished the onboarding wizard.
   *
   * Idempotent: the first timestamp wins, so re-running the wizard later does not rewrite when
   * they actually completed it.
   */
  async completeOnboarding(subscriberId: number) {
    await this.db.subscriberCVDetails.updateMany({
      where: { subscriberID: subscriberId, onboardedAt: null },
      data: { onboardedAt: new Date(), timestampUpd: new Date() },
    });
    return { isOnboarded: true };
  }

  /** id-backed lookup lists for the CV editor — every axis on tblSubscriberCVDetails is an FK, not free text. */
  async cvMasters() {
    const [states, cities, subFunctions, industries, skills, courses, degrees, designations, empTypes] = await Promise.all([
      this.db.mstrState.findMany({ orderBy: { descr: 'asc' } }),
      this.db.mstrCily.findMany({ orderBy: { descr: 'asc' } }),
      this.db.mstrSubFunctions.findMany({ orderBy: { descr: 'asc' } }),
      this.db.mstrIndustryType.findMany({ orderBy: { industryType: 'asc' } }),
      this.db.mstrSkills.findMany({ orderBy: { descr: 'asc' } }),
      // Course list. tblMstrCourse, NOT tblMstrCourseType: foreign-keys.psv guesses the latter
      // but flags it "dirty", and the legacy procs settle it — spSubscriberCVGetDetails joins
      // `tblMstrCourse AS b ON a.CourseTypeID = b.DegreeID`, and spSubscriberCVUpdate_Education
      // writes CourseTypeID from a variable it calls @CoureID. tblMstrCourseType has no rows and
      // no extracted source anywhere, so reading it left the Course dropdown permanently empty.
      this.db.mstrCourse.findMany({ orderBy: { degreeName: 'asc' } }),
      // Degree list = education LEVELS (10th, 12th, Graduation, Post Graduation), which is what
      // candidate-profile.aspx binds: fnBindDegreeDropdown reads EducationTypeID/Descr, i.e.
      // tblMstrEducationType. tblMstrEducationDegree is a byte-identical copy of tblMstrCourse
      // and is the COURSE list, not the degree list — using it made both dropdowns show the
      // same eight courses.
      this.db.mstrEducationType.findMany({ orderBy: { highestSeq: 'asc' } }),
      this.db.mstrDesignation.findMany({ orderBy: { descr: 'asc' } }),
      this.db.mstrEmpType.findMany({ orderBy: { descr: 'asc' } }),
    ]);
    const opt = (id: number, label: string | null) => ({ id, label: label ?? '' });
    return {
      states: states.map((s) => opt(s.stateID, s.descr)),
      cities: cities.map((c) => ({ id: c.cityID, label: c.descr ?? '', stateId: c.stateID })),
      subFunctions: subFunctions.map((s) => opt(s.subFunctionID, s.descr)),
      industries: industries.map((i) => opt(i.industryTypeID, i.industryType)),
      skills: skills.map((s) => opt(s.skillID, s.descr)),
      // Courses carry their level so the UI can cascade: picking a degree filters the courses,
      // exactly as fnDegree() does in candidate-profile.aspx.
      courses: courses.map((c) => ({ ...opt(c.degreeID, c.degreeName), degreeId: c.educationTypeID })),
      degrees: degrees.map((d) => opt(d.educationTypeID, d.descr)),
      designations: designations.map((d) => opt(d.designationID, d.descr)),
      employmentTypes: empTypes.map((e) => opt(e.employeeTypeID, e.descr)),
    };
  }

  /** The candidate's own CV in edit-friendly shape — raw ids, not display strings. */
  async editProfile(subscriberId: number) {
    const [cv, education, employers, certificates, preferredLocations, tags] = await Promise.all([
      this.db.subscriberCVDetails.findUnique({ where: { subscriberID: subscriberId } }),
      this.db.subscriberEducation.findMany({ where: { subscriberID: subscriberId }, orderBy: { subscriberEducationID: 'asc' } }),
      this.db.subscriberEmployer.findMany({ where: { subscriberID: subscriberId }, orderBy: { joiningDate: 'desc' } }),
      this.db.subscriberCertificate.findMany({ where: { subscriberID: subscriberId }, orderBy: { subscriberCertificateID: 'asc' } }),
      this.db.subscriberPrefferedLocations.findMany({ where: { subscriberID: subscriberId } }),
      this.db.subscriberTags.findMany({ where: { subscriberID: subscriberId }, include: { tag: { select: { tagName: true } } } }),
    ]);

    return {
      personal: cv && {
        fullName: cv.fullName ?? '',
        email: cv.emailID ?? '',
        mobile: cv.mobileNo1,
        dob: this.fmtDate(cv.dOB),
        gender: (cv.gender?.trim() === 'F' ? 'F' : 'M') as 'M' | 'F',
        address: cv.addressLine1 ?? '',
        cityId: cv.cityID,
      },
      professional: cv && {
        subFunctionId: cv.subFunctionID,
        skillId: cv.skillID,
        totalExp: cv.totalExp ?? 0,
        currentCtc: cv.currentCTC != null ? Number(cv.currentCTC) : null,
        currentCityId: cv.currentCityID,
        flgReadyToRelocate: cv.flgReadyToRelocate === 1,
        noticePeriod: cv.noticePeriod,
        industryTypeId: cv.industryTypeID,
        preferredCityIds: preferredLocations.map((p) => p.cityID),
        tagNames: tags.map((t) => t.tag?.tagName ?? '').filter(Boolean),
      },
      education: education.map((e) => ({
        subscriberEducationId: Number(e.subscriberEducationID),
        courseTypeId: e.courseTypeID,
        degreeId: e.degreeID,
      })),
      employment: employers.map((e) => ({
        subscriberEmployerId: Number(e.subscriberEmployerID),
        employer: e.employer,
        designationId: e.designationID,
        employeeTypeId: e.employeeTypeID,
        joiningDate: this.fmtDate(e.joiningDate),
        releavingDate: this.fmtDate(e.releavingDate),
        flgCurrent: e.flgCurrent === 1,
        salary: e.salary,
        jobDescr: e.jobDescr ?? '',
        noticePeriodDays: e.noticePeriodDays,
      })),
      certificates: certificates.map((c) => ({
        subscriberCertificateId: Number(c.subscriberCertificateID),
        certificateName: c.certificateName,
      })),
    };
  }

  /** Port of spSubscriberCVUpdate_Personal. First-ever save also marks the CV as created. */
  async updatePersonal(userId: number, subscriberId: number, dto: UpdatePersonalDto) {
    const now = new Date();
    const isFirstSave = !(await this.db.subscriberCVDetails.findUnique({
      where: { subscriberID: subscriberId },
      select: { subscriberID: true },
    }));

    await this.db.subscriberCVDetails.upsert({
      where: { subscriberID: subscriberId },
      create: {
        subscriberID: subscriberId,
        fullName: dto.fullName,
        emailID: dto.email ?? null,
        mobileNo1: dto.mobile,
        dOB: dto.dob ? new Date(dto.dob) : null,
        gender: dto.gender,
        addressLine1: dto.address ?? null,
        cityID: dto.cityId ?? null,
        timestampIns: now,
        loginIDIns: userId,
      },
      update: {
        fullName: dto.fullName,
        emailID: dto.email ?? null,
        mobileNo1: dto.mobile,
        dOB: dto.dob ? new Date(dto.dob) : null,
        gender: dto.gender,
        addressLine1: dto.address ?? null,
        cityID: dto.cityId ?? null,
        timestampUpd: now,
        loginIDUpd: userId,
      },
    });

    if (isFirstSave) {
      await this.db.subscriberRegistration.update({
        where: { subscriberID: subscriberId },
        data: { flgCVUploaded: 1 },
      });
      await this.db.subscriberStatusHistory.create({
        data: {
          subscriberID: subscriberId,
          statusID: SubscriberStatus.CV_CREATED,
          userID: userId,
          timestampIns: now,
          loginIDIns: userId,
        },
      });
    }
    return { ok: true };
  }

  /** Port of spSubscriberCVUpdate_Professional, plus preferred locations and skill tags. */
  async updateProfessional(userId: number, subscriberId: number, dto: UpdateProfessionalDto) {
    const cv = await this.db.subscriberCVDetails.findUnique({
      where: { subscriberID: subscriberId },
      select: { subscriberID: true },
    });
    if (!cv) throw new BadRequestException('Save your personal details first');

    const now = new Date();
    await this.db.subscriberCVDetails.update({
      where: { subscriberID: subscriberId },
      data: {
        ...(dto.subFunctionId !== undefined && { subFunctionID: dto.subFunctionId }),
        ...(dto.skillId !== undefined && { skillID: dto.skillId }),
        ...(dto.totalExp !== undefined && { totalExp: dto.totalExp }),
        ...(dto.currentCtc !== undefined && { currentCTC: dto.currentCtc }),
        ...(dto.currentCityId !== undefined && { currentCityID: dto.currentCityId }),
        ...(dto.flgReadyToRelocate !== undefined && { flgReadyToRelocate: dto.flgReadyToRelocate ? 1 : 0 }),
        ...(dto.noticePeriod !== undefined && { noticePeriod: dto.noticePeriod }),
        ...(dto.industryTypeId !== undefined && { industryTypeID: dto.industryTypeId }),
        timestampUpd: now,
        loginIDUpd: userId,
      },
    });

    if (dto.preferredCityIds) {
      await this.db.subscriberPrefferedLocations.deleteMany({ where: { subscriberID: subscriberId } });
      if (dto.preferredCityIds.length) {
        await this.db.subscriberPrefferedLocations.createMany({
          data: dto.preferredCityIds.map((cityID) => ({
            subscriberID: subscriberId,
            cityID,
            loginIDIns: userId,
            timestampIns: now,
          })),
        });
      }
    }

    if (dto.tagNames) {
      // Tags are scoped to a skill category (tblMstrTags.SkillID is required), so free-typed
      // names are matched against the existing master list; unmatched names are dropped —
      // creating new tags is master-data administration, out of scope here.
      const allTags = await this.db.mstrTags.findMany();
      const wanted = new Set(dto.tagNames.map((t) => t.trim().toLowerCase()));
      const matched = allTags.filter((t) => wanted.has(t.tagName.toLowerCase()));
      await this.db.subscriberTags.deleteMany({ where: { subscriberID: subscriberId } });
      if (matched.length) {
        await this.db.subscriberTags.createMany({
          data: matched.map((t) => ({ subscriberID: subscriberId, tagID: t.tagID })),
        });
      }
    }

    return { ok: true };
  }

  /** Port of spSubscriberCVUpdate_Education — create when no id, else update in place. */
  async upsertEducation(userId: number, subscriberId: number, dto: UpsertEducationDto) {
    const now = new Date();
    if (dto.subscriberEducationId) {
      await this.db.subscriberEducation.updateMany({
        where: { subscriberEducationID: dto.subscriberEducationId, subscriberID: subscriberId },
        data: { courseTypeID: dto.courseTypeId, degreeID: dto.degreeId, timestampUpd: now, loginIDUpd: userId },
      });
      return { subscriberEducationId: dto.subscriberEducationId };
    }
    const row = await this.db.subscriberEducation.create({
      data: {
        subscriberID: subscriberId,
        courseTypeID: dto.courseTypeId,
        degreeID: dto.degreeId,
        timestampIns: now,
        loginIDIns: userId,
      },
    });
    return { subscriberEducationId: Number(row.subscriberEducationID) };
  }

  async deleteEducation(subscriberId: number, id: number) {
    await this.db.subscriberEducation.deleteMany({ where: { subscriberEducationID: id, subscriberID: subscriberId } });
    return { ok: true };
  }

  /** New (the legacy app never wrote to tblSubscriberEmployer, only read it) — same upsert shape as education. */
  async upsertEmployment(userId: number, subscriberId: number, dto: UpsertEmploymentDto) {
    const now = new Date();
    const data = {
      employer: dto.employer,
      designationID: dto.designationId ?? null,
      employeeTypeID: dto.employeeTypeId ?? null,
      joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : null,
      releavingDate: dto.flgCurrent ? null : dto.releavingDate ? new Date(dto.releavingDate) : null,
      flgCurrent: dto.flgCurrent ? 1 : 0,
      salary: dto.salary ?? null,
      jobDescr: dto.jobDescr ?? null,
      noticePeriodDays: dto.noticePeriodDays ?? null,
    };
    if (dto.subscriberEmployerId) {
      await this.db.subscriberEmployer.updateMany({
        where: { subscriberEmployerID: dto.subscriberEmployerId, subscriberID: subscriberId },
        data: { ...data, timestampUpd: now, loginIDUpd: userId },
      });
      return { subscriberEmployerId: dto.subscriberEmployerId };
    }
    const row = await this.db.subscriberEmployer.create({
      data: { subscriberID: subscriberId, ...data, timestampIns: now, loginIDIns: userId },
    });
    return { subscriberEmployerId: Number(row.subscriberEmployerID) };
  }

  async deleteEmployment(subscriberId: number, id: number) {
    await this.db.subscriberEmployer.deleteMany({ where: { subscriberEmployerID: id, subscriberID: subscriberId } });
    return { ok: true };
  }

  async upsertCertificate(userId: number, subscriberId: number, dto: UpsertCertificateDto) {
    const now = new Date();
    if (dto.subscriberCertificateId) {
      await this.db.subscriberCertificate.updateMany({
        where: { subscriberCertificateID: dto.subscriberCertificateId, subscriberID: subscriberId },
        data: { certificateName: dto.certificateName, timestampUpd: now, loginIDUpd: userId },
      });
      return { subscriberCertificateId: dto.subscriberCertificateId };
    }
    const row = await this.db.subscriberCertificate.create({
      data: { subscriberID: subscriberId, certificateName: dto.certificateName, timestampIns: now, loginIDIns: userId },
    });
    return { subscriberCertificateId: Number(row.subscriberCertificateID) };
  }

  async deleteCertificate(subscriberId: number, id: number) {
    await this.db.subscriberCertificate.deleteMany({ where: { subscriberCertificateID: id, subscriberID: subscriberId } });
    return { ok: true };
  }

  /**
   * Jobs the candidate has applied to (tblJobSubscriberMapping + its status).
   *
   * tblMstrJobMappingStatus's own text for the initial state is "Mapped" — the UI's
   * AppliedJob.status union speaks "Applied" instead, so that one value is translated here.
   * Every other status (Shortlisted, Interview scheduled, Selected, Rejected, ...) passes
   * through as-is.
   */
  async appliedJobs(subscriberId: number) {
    // Load the status master list so we can resolve jobMapStatusID → text
    // (JobSubscriberStatus has no Prisma relation to MstrJobMappingStatus).
    const [rows, statuses] = await Promise.all([
      this.db.jobSubscriberMapping.findMany({
        where: { subscriberID: subscriberId },
        orderBy: { mapDate: 'desc' },
        include: {
          job: {
            include: {
              client: { select: { clientName: true } },
              jobCity: { select: { descr: true } },
              designation: { select: { descr: true } },
              industryType: { select: { industryType: true } },
              workMode: { select: { descr: true } },
              employeeType: { select: { descr: true } },
            },
          },
          jobMapStatus: { select: { descr: true } },
          JobSubscriberStatus: { orderBy: { mappedTimestamp: 'asc' } },
          JobInterviewStatus: {
            include: { interviewMode: { select: { descr: true } } },
            orderBy: { interviewScheduledOn: 'desc' },
          },
        },
      }),
      this.db.mstrJobMappingStatus.findMany(),
    ]);

    const statusName = new Map(statuses.map((s) => [s.jobMapStatusID, s.descr ?? 'Unknown']));

    return rows.map((r) => {
      const descr = r.jobMapStatus?.descr ?? 'Mapped';

      // Build the status history timeline.
      // Always start with the initial "Applied" entry derived from mapDate.
      const statusHistory: Array<{ status: string; timestamp: string; comments: string | null }> = [];

      statusHistory.push({
        status: 'Applied',
        timestamp: r.mapDate?.toISOString() ?? '',
        comments: null,
      });

      for (const sh of r.JobSubscriberStatus) {
        const name = sh.jobMapStatusID != null ? (statusName.get(sh.jobMapStatusID) ?? 'Unknown') : 'Unknown';
        statusHistory.push({
          status: name === 'Mapped' ? 'Applied' : name,
          timestamp: sh.mappedTimestamp?.toISOString() ?? '',
          comments: sh.comments ?? null,
        });
      }

      // Latest interview entry (if any).
      const latestInterview = r.JobInterviewStatus.length > 0 ? r.JobInterviewStatus[0] : null;

      return {
        jobId: Number(r.jobID),
        designation: r.job?.designation?.descr ?? '',
        company: r.job?.client?.clientName ?? '',
        industry: r.job?.industryType?.industryType ?? '',
        city: r.job?.jobCity?.descr ?? '',
        workMode: r.job?.workMode?.descr ?? '',
        employmentType: r.job?.employeeType?.descr ?? '',
        minExp: r.job?.minExp ?? 0,
        minCtc: r.job?.minCTC ?? 0,
        maxCtc: r.job?.maxCTC ?? 0,
        appliedOn: r.mapDate?.toISOString().slice(0, 10) ?? '',
        status: descr === 'Mapped' ? 'Applied' : descr,
        statusHistory,
        interview: latestInterview
          ? {
              scheduledOn: latestInterview.interviewScheduledOn?.toISOString() ?? '',
              mode: latestInterview.interviewMode?.descr ?? '',
              location: latestInterview.interviewLocation ?? null,
            }
          : null,
      };
    });
  }

  /** Documents mapped to the candidate, and whether each has been uploaded yet. */
  async documents(subscriberId: number) {
    const [mapped, uploaded, master] = await Promise.all([
      this.db.candidateDocumentMap.findMany({ where: { subscriberID: subscriberId } }),
      this.db.candidateDocumentUploaded.findMany({ where: { subscriberID: subscriberId } }),
      this.db.mstrDocuments.findMany(),
    ]);
    const nameOf = new Map(master.map((m) => [Number(m.documentID), m.documentName ?? '']));

    return mapped.map((m) => {
      const up = uploaded.find((u) => Number(u.documentMapID) === Number(m.documentMapID));
      return {
        documentId: Number(m.documentMapID),
        documentTypeId: m.documentTypeID,
        name: nameOf.get(Number(m.documentTypeID)) ?? '',
        status: up ? (up.flgStatus === 1 ? 'Verified' : up.flgStatus === 2 ? 'Rejected' : 'Uploaded') : 'Pending',
        uploadedOn: up?.timestampIns?.toISOString().slice(0, 10) ?? null,
      };
    });
  }

  /**
   * Upload a document the candidate has been asked for (candidate-doc.aspx). A
   * tblCandidateDocumentMap row must already exist — QC decides what's required, not the
   * candidate — otherwise there is nothing for the upload to satisfy.
   */
  async uploadDocument(userId: number, subscriberId: number, documentTypeId: number, file: Express.Multer.File) {
    const map = await this.db.candidateDocumentMap.findFirst({
      where: { subscriberID: subscriberId, documentTypeID: documentTypeId },
    });
    if (!map) throw new BadRequestException('This document has not been requested');

    const stored = await this.storage.upload(documentTypeId, userId, file);

    const existing = await this.db.candidateDocumentUploaded.findFirst({
      where: { documentMapID: map.documentMapID },
    });
    const now = new Date();
    if (existing) {
      await this.db.candidateDocumentUploaded.update({
        where: { docUploadID: existing.docUploadID },
        data: { documentPath: stored.key, flgStatus: 0, timestampUpd: now, loginIDUpd: userId },
      });
    } else {
      await this.db.candidateDocumentUploaded.create({
        data: {
          documentMapID: map.documentMapID,
          subscriberID: subscriberId,
          documentTypeID: documentTypeId,
          documentPath: stored.key,
          flgStatus: 0,
          timestampIns: now,
          loginIDIns: userId,
        },
      });
    }

    await this.audit.record({
      userId,
      action: 'candidate.document_uploaded',
      entity: 'CandidateDocumentUploaded',
      entityId: documentTypeId,
      detail: { key: stored.key },
    });
    return { ok: true };
  }

  /**
   * Job alerts. There is NO legacy table for these — the feature existed only in the
   * mocks — so this reads and writes tblSubscriberJobAlert, which is new.
   */
  async jobAlerts(subscriberId: number) {
    const rows = await this.db.subscriberJobAlert.findMany({
      where: { subscriberID: subscriberId },
      orderBy: { alertID: 'desc' },
    });
    return rows.map((a) => ({
      alertId: Number(a.alertID),
      keyword: a.keyword,
      location: a.location,
      frequency: a.frequency as 'Daily' | 'Weekly',
    }));
  }

  async createJobAlert(subscriberId: number, dto: CreateJobAlertDto) {
    const a = await this.db.subscriberJobAlert.create({
      data: {
        subscriberID: subscriberId,
        keyword: dto.keyword,
        location: dto.location,
        frequency: dto.frequency,
      },
    });
    return {
      alertId: Number(a.alertID),
      keyword: a.keyword,
      location: a.location,
      frequency: a.frequency as 'Daily' | 'Weekly',
    };
  }

  /** Saved / bookmarked jobs. */
  async savedJobs(subscriberId: number) {
    const rows = await this.db.savedJob.findMany({
      where: { subscriberID: subscriberId },
      orderBy: { timestampIns: 'desc' },
      include: {
        job: {
          include: {
            client: { select: { clientName: true } },
            jobCity: { select: { descr: true } },
            designation: { select: { descr: true } },
            industryType: { select: { industryType: true } },
            workMode: { select: { descr: true } },
            employeeType: { select: { descr: true } },
          },
        },
      },
    });

    return rows.map((r) => ({
      jobId: Number(r.jobID),
      designation: r.job.designation?.descr ?? '',
      company: r.job.client?.clientName ?? '',
      industry: r.job.industryType?.industryType ?? '',
      city: r.job.jobCity?.descr ?? '',
      workMode: r.job.workMode?.descr ?? '',
      employmentType: r.job.employeeType?.descr ?? '',
      minExp: r.job.minExp ?? 0,
      minCtc: r.job.minCTC,
      maxCtc: r.job.maxCTC,
      postedOn: r.job.timestampIns.toISOString(),
      savedOn: r.timestampIns.toISOString().slice(0, 10),
    }));
  }

  async saveJob(subscriberId: number, jobId: number) {
    // Verify the job exists
    const job = await this.db.clientJobs.findUnique({ where: { jobID: jobId }, select: { jobID: true } });
    if (!job) throw new NotFoundException('Job not found');

    await this.db.savedJob.upsert({
      where: { subscriberID_jobID: { subscriberID: subscriberId, jobID: jobId } },
      create: { subscriberID: subscriberId, jobID: jobId },
      update: {},
    });
    return { ok: true };
  }

  async unsaveJob(subscriberId: number, jobId: number) {
    await this.db.savedJob.deleteMany({
      where: { subscriberID: subscriberId, jobID: jobId },
    });
    return { ok: true };
  }

  async savedJobIds(subscriberId: number): Promise<number[]> {
    const rows = await this.db.savedJob.findMany({
      where: { subscriberID: subscriberId },
      select: { jobID: true },
    });
    return rows.map((r) => Number(r.jobID));
  }

  /** Verifies the current password against the Argon2 hash before replacing it. */
  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.db.secUser.findUnique({
      where: { userID: userId },
      select: { password: true },
    });
    const ok = user?.password
      ? await argon2.verify(user.password, currentPassword).catch(() => false)
      : false;
    if (!ok) throw new BadRequestException('Current password is incorrect');

    await this.db.secUser.update({
      where: { userID: userId },
      data: {
        password: await argon2.hash(newPassword, { type: argon2.argon2id }),
        // The legacy PwdStatus flag: 1 = the user has set their own password.
        pwdStatus: 1,
      },
    });
    return { message: 'Password changed successfully' };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // NEW ENDPOINTS
  // ────────────────────────────────────────────────────────────────────────────

  /** Dashboard summary for the candidate. */
  async dashboard(subscriberId: number) {
    const [appliedCount, savedCount, interviewMappings, cv, tags, education, employers] = await Promise.all([
      this.db.jobSubscriberMapping.count({ where: { subscriberID: subscriberId } }),
      this.db.savedJob.count({ where: { subscriberID: subscriberId } }),
      this.db.jobSubscriberMapping.findMany({
        where: { subscriberID: subscriberId },
        select: {
          JobInterviewStatus: { select: { interviewStatusID: true }, take: 1 },
        },
      }),
      this.db.subscriberCVDetails.findUnique({
        where: { subscriberID: subscriberId },
        select: {
          fullName: true,
          emailID: true,
          mobileNo1: true,
          dOB: true,
          gender: true,
          addressLine1: true,
          cityID: true,
          skillID: true,
          subFunctionID: true,
          totalExp: true,
          currentCTC: true,
          industryTypeID: true,
          photoName: true,
        },
      }),
      this.db.subscriberTags.count({ where: { subscriberID: subscriberId } }),
      this.db.subscriberEducation.count({ where: { subscriberID: subscriberId } }),
      this.db.subscriberEmployer.count({ where: { subscriberID: subscriberId } }),
    ]);

    const interviewCount = interviewMappings.filter((m) => m.JobInterviewStatus.length > 0).length;

    // Profile completion: check key fields
    let filled = 0;
    const total = 10;
    if (cv) {
      if (cv.fullName?.trim()) filled++;
      if (cv.emailID?.trim()) filled++;
      if (cv.mobileNo1?.trim()) filled++;
      if (cv.dOB) filled++;
      if (cv.gender?.trim()) filled++;
      if (cv.cityID) filled++;
      if (cv.subFunctionID) filled++;
      if (cv.totalExp != null) filled++;
    }
    if (tags > 0) filled++;
    if (education > 0 || employers > 0) filled++;

    const profileCompletion = Math.round((filled / total) * 100);

    return { appliedCount, savedCount, interviewCount, profileCompletion };
  }

  /** Get notification preferences, returning defaults if none stored. */
  async notificationPrefs(subscriberId: number) {
    const defaults = { emailAlerts: true, pushAlerts: true, smsAlerts: false, jobAlertFrequency: 'Daily' as const };
    try {
      const row = await this.db.notificationPreference.findUnique({
        where: { subscriberID: subscriberId },
      });
      if (!row) return defaults;
      return {
        emailAlerts: row.emailAlerts ?? defaults.emailAlerts,
        pushAlerts: row.pushAlerts ?? defaults.pushAlerts,
        smsAlerts: row.smsAlerts ?? defaults.smsAlerts,
        jobAlertFrequency: row.jobAlertFrequency ?? defaults.jobAlertFrequency,
      };
    } catch {
      // Table may not exist yet if migration hasn't run — return defaults gracefully.
      return defaults;
    }
  }

  /** Upsert notification preferences. */
  async updateNotificationPrefs(subscriberId: number, dto: UpdateNotificationPrefsDto) {
    try {
      await this.db.notificationPreference.upsert({
        where: { subscriberID: subscriberId },
        create: {
          subscriberID: subscriberId,
          emailAlerts: dto.emailAlerts ?? true,
          pushAlerts: dto.pushAlerts ?? true,
          smsAlerts: dto.smsAlerts ?? false,
          jobAlertFrequency: dto.jobAlertFrequency ?? 'Daily',
        },
        update: {
          ...(dto.emailAlerts !== undefined && { emailAlerts: dto.emailAlerts }),
          ...(dto.pushAlerts !== undefined && { pushAlerts: dto.pushAlerts }),
          ...(dto.smsAlerts !== undefined && { smsAlerts: dto.smsAlerts }),
          ...(dto.jobAlertFrequency !== undefined && { jobAlertFrequency: dto.jobAlertFrequency }),
        },
      });
    } catch {
      // Table may not exist yet — fail gracefully rather than crashing the API.
      throw new BadRequestException('Notification preferences are not available yet');
    }
    return { ok: true };
  }

  /** List saved searches for the candidate. */
  async savedSearches(subscriberId: number) {
    try {
      const rows = await this.db.savedSearch.findMany({
        where: { subscriberID: subscriberId },
        orderBy: { createdAt: 'desc' },
      });
      return rows.map((r) => ({
        id: Number(r.id),
        name: r.name,
        query: r.query ?? null,
        filters: r.filters ? JSON.parse(r.filters) : null,
        createdAt: r.createdAt?.toISOString() ?? null,
      }));
    } catch {
      return [];
    }
  }

  /** Create a saved search. */
  async createSavedSearch(subscriberId: number, dto: CreateSavedSearchDto) {
    try {
      const row = await this.db.savedSearch.create({
        data: {
          subscriberID: subscriberId,
          name: dto.name,
          query: dto.query ?? null,
          filters: dto.filters ? JSON.stringify(dto.filters) : null,
        },
      });
      return {
        id: Number(row.id),
        name: row.name,
        query: row.query ?? null,
        filters: row.filters ? JSON.parse(row.filters) : null,
        createdAt: row.createdAt?.toISOString() ?? null,
      };
    } catch {
      throw new BadRequestException('Saved searches are not available yet');
    }
  }

  /** Delete a saved search, verifying ownership. */
  async deleteSavedSearch(subscriberId: number, id: number) {
    try {
      const deleted = await this.db.savedSearch.deleteMany({
        where: { id, subscriberID: subscriberId },
      });
      if (deleted.count === 0) {
        throw new NotFoundException('Saved search not found');
      }
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw new BadRequestException('Saved searches are not available yet');
    }
    return { ok: true };
  }

  /** Recommended jobs based on candidate skills, city, and industry. */
  async recommendations(subscriberId: number) {
    const [cv, tags] = await Promise.all([
      this.db.subscriberCVDetails.findUnique({
        where: { subscriberID: subscriberId },
        select: { cityID: true, industryTypeID: true },
      }),
      this.db.subscriberTags.findMany({
        where: { subscriberID: subscriberId },
        include: { tag: { select: { tagName: true } } },
      }),
    ]);

    // Build OR conditions: match by skills (tag names), city, or industry.
    const orConditions: Record<string, unknown>[] = [];

    const tagNames = tags.map((t) => t.tag?.tagName).filter(Boolean);
    if (tagNames.length) {
      orConditions.push({
        ClientJobSkill: {
          some: { skill: { descr: { in: tagNames, mode: 'insensitive' } } },
        },
      });
    }
    if (cv?.cityID) {
      orConditions.push({ jobCityID: cv.cityID });
    }
    if (cv?.industryTypeID) {
      orConditions.push({ industryTypeID: cv.industryTypeID });
    }

    // If we have nothing to match on, return empty.
    if (orConditions.length === 0) {
      return { rows: [], total: 0 };
    }

    const where = {
      statusID: JOB_STATUS_ACTIVE,
      OR: orConditions,
    };

    const [rows, total] = await Promise.all([
      this.db.clientJobs.findMany({
        where,
        take: 20,
        orderBy: { timestampIns: 'desc' },
        include: {
          client: { select: { clientName: true } },
          jobCity: { select: { descr: true } },
          designation: { select: { descr: true } },
          industryType: { select: { industryType: true } },
          employeeType: { select: { descr: true } },
          workMode: { select: { descr: true } },
        },
      }),
      this.db.clientJobs.count({ where }),
    ]);

    return {
      rows: rows.map((j) => ({
        jobId: Number(j.jobID),
        designation: j.designation?.descr ?? '',
        company: j.client?.clientName ?? '',
        industry: j.industryType?.industryType ?? '',
        city: j.jobCity?.descr ?? '',
        workMode: j.workMode?.descr ?? '',
        employmentType: j.employeeType?.descr ?? '',
        minExp: j.minExp ?? 0,
        minCtc: j.minCTC,
        maxCtc: j.maxCTC,
        postedOn: j.timestampIns.toISOString().slice(0, 10),
      })),
      total,
    };
  }

  /**
   * Activity timeline for the signed-in candidate.
   *
   * Built from the domain tables rather than the audit log: the audit log records what the
   * SYSTEM did (auth.login, register.verified) keyed by user id, which is neither interesting
   * to a candidate nor expressible in the eight event types the timeline renders. Applications,
   * status transitions, interviews and document uploads are the things that actually happened
   * to them.
   *
   * Paged by offset. The events are merged from five sources and re-sorted, so there is no
   * single column a keyset cursor could walk; `cursor` is therefore the index to resume from,
   * which is what the client round-trips as nextCursor.
   */
  async activity(subscriberId: number, cursor = 0, pageSize = ACTIVITY_PAGE_SIZE) {
    const [applications, statusRows, interviews, documents, cv] = await Promise.all([
      this.db.jobSubscriberMapping.findMany({
        where: { subscriberID: subscriberId },
        orderBy: { mapDate: 'desc' },
        take: ACTIVITY_SOURCE_LIMIT,
        include: {
          job: {
            include: {
              designation: { select: { descr: true } },
              client: { select: { clientName: true } },
            },
          },
        },
      }),
      this.db.jobSubscriberStatus.findMany({
        where: { jobSubscriberMap: { subscriberID: subscriberId } },
        orderBy: { mappedTimestamp: 'desc' },
        take: ACTIVITY_SOURCE_LIMIT,
        include: {
          jobSubscriberMap: {
            include: {
              job: {
                include: {
                  designation: { select: { descr: true } },
                  client: { select: { clientName: true } },
                },
              },
            },
          },
        },
      }),
      this.db.jobInterviewStatus.findMany({
        where: { jobSubscriberMap: { subscriberID: subscriberId } },
        orderBy: { interviewScheduledOn: 'desc' },
        take: ACTIVITY_SOURCE_LIMIT,
        include: {
          interviewMode: { select: { descr: true } },
          jobSubscriberMap: {
            include: {
              job: {
                include: {
                  designation: { select: { descr: true } },
                  client: { select: { clientName: true } },
                },
              },
            },
          },
        },
      }),
      this.db.candidateDocumentUploaded.findMany({
        where: { subscriberID: subscriberId },
        orderBy: { timestampIns: 'desc' },
        take: ACTIVITY_SOURCE_LIMIT,
        include: { documentType: { select: { documentType: true } } },
      }),
      this.db.subscriberCVDetails.findUnique({
        where: { subscriberID: subscriberId },
        select: { timestampIns: true, timestampUpd: true },
      }),
    ]);

    const events: ActivityEvent[] = [];
    const jobOf = (job?: { designation?: { descr: string | null } | null; client?: { clientName: string | null } | null } | null) => ({
      jobTitle: job?.designation?.descr ?? undefined,
      company: job?.client?.clientName ?? undefined,
    });

    for (const a of applications) {
      if (!a.mapDate) continue;
      const { jobTitle, company } = jobOf(a.job);
      events.push({
        // Ids are namespaced per source table: the primary keys are only unique within their
        // own table, and the client uses eventId as a list key.
        eventId: ID_BASE.application + Number(a.jobSubscriberMapID),
        type: 'applied',
        title: 'Application submitted',
        description: `You applied for ${jobTitle ?? 'a job'}${company ? ` at ${company}` : ''}.`,
        timestamp: a.mapDate.toISOString(),
        jobTitle,
        company,
      });
    }

    for (const st of statusRows) {
      const type = STATUS_EVENT_TYPE[st.jobMapStatusID ?? -1];
      // Skip "Mapped" — the application itself already produced an `applied` event — and any
      // status this timeline has no vocabulary for.
      if (!type || !st.mappedTimestamp) continue;
      const { jobTitle, company } = jobOf(st.jobSubscriberMap?.job);
      events.push({
        eventId: ID_BASE.status + Number(st.statusID),
        type,
        title: STATUS_TITLE[type],
        description:
          st.comments?.trim() ||
          `${STATUS_TITLE[type]} for ${jobTitle ?? 'a job'}${company ? ` at ${company}` : ''}.`,
        timestamp: st.mappedTimestamp.toISOString(),
        jobTitle,
        company,
      });
    }

    for (const iv of interviews) {
      const when = iv.interviewTime ?? iv.interviewScheduledOn;
      if (!when) continue;
      const { jobTitle, company } = jobOf(iv.jobSubscriberMap?.job);
      const mode = iv.interviewMode?.descr;
      // Past interviews read as completed, upcoming ones as scheduled.
      const done = when.getTime() < Date.now();
      events.push({
        eventId: ID_BASE.interview + Number(iv.interviewStatusID),
        type: done ? 'interview_completed' : 'interview_scheduled',
        title: done ? 'Interview completed' : 'Interview scheduled',
        description:
          `${done ? 'Interview held' : 'Interview scheduled'} for ${jobTitle ?? 'a job'}` +
          `${company ? ` at ${company}` : ''}${mode ? ` (${mode})` : ''}.`,
        timestamp: (iv.interviewScheduledOn ?? when).toISOString(),
        jobTitle,
        company,
      });
    }

    for (const d of documents) {
      if (!d.timestampIns) continue;
      events.push({
        eventId: ID_BASE.document + Number(d.docUploadID),
        type: 'document_uploaded',
        title: 'Document uploaded',
        description: `You uploaded ${d.documentType?.documentType ?? 'a document'}.`,
        timestamp: d.timestampIns.toISOString(),
      });
    }

    // One profile event, from the CV row's own audit columns. There is no per-field history
    // table, so this is the most that can honestly be reported.
    const profileAt = cv?.timestampUpd ?? cv?.timestampIns;
    if (profileAt) {
      events.push({
        eventId: ID_BASE.profile + subscriberId,
        type: 'profile_updated',
        title: cv?.timestampUpd ? 'Profile updated' : 'Profile created',
        description: cv?.timestampUpd
          ? 'You updated your profile details.'
          : 'Your profile was created.',
        timestamp: profileAt.toISOString(),
      });
    }

    events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    const from = Math.max(0, cursor);
    const page = events.slice(from, from + pageSize);
    const next = from + pageSize;
    return {
      data: page,
      // Omitted on the last page so the client stops asking.
      ...(next < events.length ? { nextCursor: next } : {}),
    };
  }

  /** Upload resume — stores in CVPath on subscriberCVDetails. */
  async uploadResume(userId: number, subscriberId: number, file: Express.Multer.File) {
    // Use documentTypeId = 1 for resumes (first document type in master table)
    const resumeDocType = await this.db.mstrDocuments.findFirst({
      where: { documentName: { contains: 'Resume', mode: 'insensitive' } },
      select: { documentID: true },
    });
    const docTypeId = resumeDocType ? Number(resumeDocType.documentID) : 1;

    const stored = await this.storage.upload(docTypeId, userId, file);

    await this.db.subscriberCVDetails.update({
      where: { subscriberID: subscriberId },
      data: { cVPath: stored.key },
    });

    await this.audit.record({
      userId,
      action: 'candidate.resume_uploaded',
      entity: 'SubscriberCVDetails',
      entityId: subscriberId,
      detail: { key: stored.key },
    });

    return { url: await this.storage.url(stored.key), fileName: file.originalname };
  }

  /** Delete resume reference from candidate CV. */
  async deleteResume(subscriberId: number) {
    await this.db.subscriberCVDetails.update({
      where: { subscriberID: subscriberId },
      data: { cVPath: null },
    });
    return { ok: true };
  }

  /** Upload avatar photo and update photoName on subscriberCVDetails. */
  async uploadAvatar(userId: number, subscriberId: number, file: Express.Multer.File) {
    // Use documentTypeId = 1 for avatars too (just need a folder); find a photo doc type if available
    const photoDocType = await this.db.mstrDocuments.findFirst({
      where: { documentName: { contains: 'Photo', mode: 'insensitive' } },
      select: { documentID: true },
    });
    const docTypeId = photoDocType ? Number(photoDocType.documentID) : 1;

    const stored = await this.storage.upload(docTypeId, userId, file);

    await this.db.subscriberCVDetails.update({
      where: { subscriberID: subscriberId },
      data: { photoName: stored.key },
    });

    await this.audit.record({
      userId,
      action: 'candidate.avatar_uploaded',
      entity: 'SubscriberCVDetails',
      entityId: subscriberId,
      detail: { key: stored.key },
    });

    return { url: await this.storage.url(stored.key) };
  }
}
