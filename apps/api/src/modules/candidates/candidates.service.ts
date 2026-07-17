import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import argon2 from 'argon2';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/modules/storage/storage.service';
import { AuditService } from '@/modules/audit/audit.service';
import { SubscriberStatus } from '@/shared/status';
import type {
  CreateJobAlertDto,
  UpdatePersonalDto,
  UpdateProfessionalDto,
  UpsertCertificateDto,
  UpsertEducationDto,
  UpsertEmploymentDto,
} from './dto/candidates.dto';

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
        include: { degree: { select: { degreeName: true } } },
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
        degree: e.degree?.degreeName ?? '',
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

  /** id-backed lookup lists for the CV editor — every axis on tblSubscriberCVDetails is an FK, not free text. */
  async cvMasters() {
    const [cities, subFunctions, industries, skills, courseTypes, degrees, designations, empTypes] = await Promise.all([
      this.db.mstrCily.findMany({ orderBy: { descr: 'asc' } }),
      this.db.mstrSubFunctions.findMany({ orderBy: { descr: 'asc' } }),
      this.db.mstrIndustryType.findMany({ orderBy: { industryType: 'asc' } }),
      this.db.mstrSkills.findMany({ orderBy: { descr: 'asc' } }),
      this.db.mstrCourseType.findMany({ orderBy: { descr: 'asc' } }),
      this.db.mstrEducationDegree.findMany({ orderBy: { degreeName: 'asc' } }),
      this.db.mstrDesignation.findMany({ orderBy: { descr: 'asc' } }),
      this.db.mstrEmpType.findMany({ orderBy: { descr: 'asc' } }),
    ]);
    const opt = (id: number, label: string | null) => ({ id, label: label ?? '' });
    return {
      cities: cities.map((c) => opt(c.cityID, c.descr)),
      subFunctions: subFunctions.map((s) => opt(s.subFunctionID, s.descr)),
      industries: industries.map((i) => opt(i.industryTypeID, i.industryType)),
      skills: skills.map((s) => opt(s.skillID, s.descr)),
      courseTypes: courseTypes.map((c) => opt(c.courseTypeID, c.descr)),
      educationDegrees: degrees.map((d) => opt(d.degreeID, d.degreeName)),
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
    const rows = await this.db.jobSubscriberMapping.findMany({
      where: { subscriberID: subscriberId },
      orderBy: { mapDate: 'desc' },
      include: {
        job: {
          include: {
            client: { select: { clientName: true } },
            jobCity: { select: { descr: true } },
            designation: { select: { descr: true } },
          },
        },
        jobMapStatus: { select: { descr: true } },
      },
    });

    return rows.map((r) => {
      const descr = r.jobMapStatus?.descr ?? 'Mapped';
      return {
        jobId: Number(r.jobID),
        designation: r.job?.designation?.descr ?? '',
        company: r.job?.client?.clientName ?? '',
        city: r.job?.jobCity?.descr ?? '',
        appliedOn: r.mapDate?.toISOString().slice(0, 10) ?? '',
        status: descr === 'Mapped' ? 'Applied' : descr,
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
}
