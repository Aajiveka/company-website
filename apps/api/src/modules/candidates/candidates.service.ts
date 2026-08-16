import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import argon2 from 'argon2';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/modules/storage/storage.service';
import { AuditService } from '@/modules/audit/audit.service';
import { JobMapStatus, SubscriberStatus, JOB_STATUS_ACTIVE } from '@/shared/status';
import { EDUCATION_MAX_YEAR_AHEAD, EDUCATION_MIN_YEAR } from './dto/candidates.dto';
import type {
  CreateJobAlertDto,
  CreateSavedSearchDto,
  InstituteSearchDto,
  UpdateCareerProfileDto,
  UpdateDiversityDto,
  UpdateHeadlineDto,
  UpdateKeySkillsDto,
  UpdateNotificationPrefsDto,
  UpdatePersonalDetailsDto,
  UpdatePersonalDto,
  UpdateProfessionalDto,
  UpdateSummaryDto,
  UpsertAccomplishmentDto,
  UpsertCertificateDto,
  UpsertEducationDto,
  UpsertEmploymentDto,
  UpsertItSkillDto,
  UpsertLanguageDto,
  UpsertProjectDto,
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

    const [tags, education, employers, extra, uploadedCv] = await Promise.all([
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
      this.db.subscriberProfileExtra.findUnique({ where: { subscriberID: subscriberId } }),
      this.db.subscriberCVUploaded.findUnique({ where: { subscriberID: subscriberId } }),
    ]);

    const gender = cv.gender === 'M' ? 'Male' : cv.gender === 'F' ? 'Female' : 'Others';
    const date = (d: Date | null) => this.fmtDate(d);
    const current = employers.find((e) => e.flgCurrent === 1) ?? employers[0];

    /**
     * "Last updated" is the newest write across the CV row and every section that hangs off
     * it. Reading only tblSubscriberCVDetails.TimestampUpd would freeze the date the moment a
     * candidate started editing sections that live in their own tables.
     */
    const lastUpdated = [
      cv.timestampUpd,
      cv.timestampIns,
      extra?.timestampUpd,
      ...employers.map((e) => e.timestampUpd ?? e.timestampIns),
      ...education.map((e) => e.timestampUpd ?? e.timestampIns),
    ]
      .filter((d): d is Date => !!d)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    return {
      subscriberId,
      fullName: cv.fullName?.trim() || cv.mobileNo1 || '',
      email: cv.emailID ?? '',
      emailVerified: cv.emailVerified,
      mobile: cv.mobileNo1 ?? '',
      gender,
      city: cv.city?.descr ?? '',
      designation: cv.subFunction?.descr ?? '',
      totalExperience: cv.totalExp != null ? String(cv.totalExp) : '',
      photoUrl: cv.photoName?.trim() ? `/files/${cv.photoName}` : null,
      // The header block the profile page renders above the fold.
      resumeHeadline: extra?.resumeHeadline ?? '',
      currentCompany: current?.employer ?? '',
      currentDesignation: current?.designation?.descr ?? cv.subFunction?.descr ?? '',
      currentCtc: cv.currentCTC != null ? Number(cv.currentCTC) : null,
      noticePeriod: cv.noticePeriod,
      profileUpdatedAt: lastUpdated ? lastUpdated.toISOString() : null,
      // tblSubscriberCVUploaded is where the uploaded file's own name and date live;
      // CVDetails.CVPath only ever held the storage key.
      resumeUrl: uploadedCv ? `/files/resume` : null,
      resumeFileName: uploadedCv?.cVName ?? null,
      resumeUploadedAt: uploadedCv ? date(uploadedCv.tImestampUpd ?? uploadedCv.timestampIns) : null,
      // Same source as cv-edit's tagNames, so the profile header and the chip editor cannot
      // disagree about which skills the candidate has.
      skills: extra?.keySkills
        ? this.csvToList(extra.keySkills)
        : tags.map((t) => t.tag?.tagName ?? '').filter(Boolean),
      education: education.map((e) => ({
        degree: e.degree?.descr ?? '',
        institute: e.instituteName ?? '',
        year: e.passingYear != null ? String(e.passingYear) : date(e.timestampIns).slice(0, 4),
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
    const [states, cities, subFunctions, industries, skills, courses, degrees, designations, empTypes, tags] = await Promise.all([
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
      // Degree list = the QUALIFICATION (10th, ITI, B.Tech, MBA, Ph.D.), which is what
      // candidate-profile.aspx binds: fnBindDegreeDropdown reads EducationTypeID/Descr, i.e.
      // tblMstrEducationType. tblMstrEducationDegree is a byte-identical copy of tblMstrCourse
      // and is the COURSE list, not the degree list — using it made both dropdowns show the
      // same eight courses.
      // HighestSeq is seniority, so ordering by it puts 10th before B.Tech before Ph.D., which
      // is also the order the wizard's category groups run in.
      this.db.mstrEducationType.findMany({ orderBy: { highestSeq: 'asc' } }),
      this.db.mstrDesignation.findMany({ orderBy: { descr: 'asc' } }),
      this.db.mstrEmpType.findMany({ orderBy: { descr: 'asc' } }),
      // The key-skill chips are tblMstrTags, not tblMstrSkills — updateProfessional matches
      // submitted names against tags and drops anything unmatched, so the picker has to offer
      // tag names or every suggestion it made would silently vanish on save.
      this.db.mstrTags.findMany({ orderBy: { tagName: 'asc' } }),
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
      // `category` groups ~90 qualifications into School / Diploma / Undergraduate /
      // Postgraduate / Doctorate so the dropdown can render <optgroup>s. Null for any row added
      // outside prisma/data/india-education.ts; the UI files those under "Other".
      degrees: degrees.map((d) => ({ ...opt(d.educationTypeID, d.descr), category: d.category ?? null })),
      designations: designations.map((d) => opt(d.designationID, d.descr)),
      employmentTypes: empTypes.map((e) => opt(e.employeeTypeID, e.descr)),
      tags: tags.map((t) => opt(Number(t.tagID), t.tagName)),
    };
  }

  /**
   * Institution typeahead for the Education step.
   *
   * Deliberately NOT part of cvMasters: there are hundreds of institutions and the list only
   * grows, so shipping it inside the masters payload would push a large blob at every candidate
   * on every page load to serve one field. This filters server-side and returns at most 50.
   *
   * `stateId` prioritises, it never filters. A candidate living in Bihar most often studied in
   * Bihar, so those rows sort first — but plenty studied elsewhere, and excluding the rest would
   * make the field useless to exactly the people who moved for work, which is most of them.
   */
  async searchInstitutes(dto: InstituteSearchDto) {
    const limit = dto.limit ?? 20;
    const stateId = dto.stateId ?? null;
    // Same normalisation the SearchText column was built with, so "Dr. A.P.J." finds "dr apj".
    const query = (dto.q ?? '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[’']/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\b(the|of|and|for)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Every word has to match, each against either half of SearchText. "iit patna" then finds
    // IIT Patna — "iit" via the initialism, "patna" via the name — without also returning IIT
    // Bombay, which a single substring match on the whole phrase could not manage either way.
    // Capped so a paste of a whole paragraph cannot turn into a hundred-way AND.
    const tokens = query.split(' ').filter(Boolean).slice(0, 6);

    // Raw SQL because the ranking is computed — "my state first, then names starting with what
    // I typed, then names merely containing it" — which Prisma's orderBy cannot express, and
    // which three stitched-together queries would get wrong at the limit boundary.
    const rows = await this.db.$queryRaw<
      { InstituteID: number; Name: string; Kind: string | null; City: string | null; StateID: number | null }[]
    >`
      SELECT "InstituteID", "Name", "Kind", "City", "StateID"
        FROM "tblMstrInstitute"
       WHERE "FlgActive" = 1
         AND (
           cardinality(${tokens}::text[]) = 0
           OR NOT EXISTS (
             SELECT 1 FROM unnest(${tokens}::text[]) AS t(word)
              WHERE COALESCE("SearchText", "SearchKey") NOT LIKE '%' || t.word || '%'
           )
         )
       ORDER BY (${stateId}::int IS NOT NULL AND "StateID" = ${stateId}::int) DESC,
                (COALESCE("SearchText", "SearchKey") LIKE ${query + '%'}) DESC,
                length("Name") ASC,
                "Name" ASC
       LIMIT ${limit}
    `;

    return rows.map((r) => ({
      id: r.InstituteID,
      label: r.Name,
      kind: r.Kind,
      city: r.City,
      stateId: r.StateID,
    }));
  }

  /**
   * The rules a saved qualification has to satisfy, checked here as well as in the wizard.
   *
   * The wizard is not the only writer — the CV manager and the profile dialog post to the same
   * endpoint, and anything holding a token can post to it directly — so the rules that protect
   * the data (a course that belongs to its qualification, years in order, a percentage that is
   * actually a percentage) cannot live only in the form.
   */
  private async validateEducation(subscriberId: number, dto: UpsertEducationDto) {
    const thisYear = new Date().getFullYear();
    const maxYear = thisYear + EDUCATION_MAX_YEAR_AHEAD;

    const degree = await this.db.mstrEducationType.findUnique({
      where: { educationTypeID: dto.degreeId },
      select: { educationTypeID: true, descr: true },
    });
    // Without this the FK violation surfaces as a 500 with a Prisma message.
    if (!degree) throw new BadRequestException('Choose a valid education qualification.');

    if (dto.courseTypeId != null) {
      const course = await this.db.mstrCourse.findUnique({
        where: { degreeID: dto.courseTypeId },
        select: { educationTypeID: true },
      });
      if (!course) throw new BadRequestException('Choose a valid course.');
      // Changing the qualification without clearing the course would otherwise store a B.Tech
      // branch under an MBBS, which no employer filter could make sense of afterwards.
      if (course.educationTypeID !== dto.degreeId) {
        throw new BadRequestException(`That course does not belong to ${degree.descr}.`);
      }
    }

    if (dto.startYear != null && dto.startYear > thisYear) {
      throw new BadRequestException('Start year cannot be in the future.');
    }
    if (dto.passingYear != null && dto.passingYear > maxYear) {
      throw new BadRequestException(`End year cannot be later than ${maxYear}.`);
    }
    if (dto.startYear != null && dto.passingYear != null && dto.passingYear < dto.startYear) {
      throw new BadRequestException('End year cannot be earlier than start year.');
    }
    for (const year of [dto.startYear, dto.passingYear]) {
      if (year != null && year < EDUCATION_MIN_YEAR) {
        throw new BadRequestException(`Year cannot be earlier than ${EDUCATION_MIN_YEAR}.`);
      }
    }

    const marks = dto.marks?.trim();
    if (marks) {
      // The field is labelled "Percentage %", but the column already holds CGPA values typed by
      // candidates ("8.5 CGPA", "8.5/10"), so both forms are accepted and only the plain-number
      // form is range-checked as a percentage.
      const percent = /^(\d{1,3}(\.\d{1,2})?)\s*%?$/.exec(marks);
      const cgpa = /^(\d{1,2}(\.\d{1,2})?)\s*(cgpa|gpa|\/\s*(10|4|5))$/i.exec(marks);
      if (percent) {
        const value = Number(percent[1]);
        if (value < 0 || value > 100) throw new BadRequestException('Percentage must be between 0 and 100.');
      } else if (!cgpa) {
        throw new BadRequestException('Enter a percentage (0-100) or a CGPA such as "8.5 CGPA".');
      }
    }

    // One qualification from one institution finishing in one year is one record. Re-adding it
    // is a double-submit or a mis-click, not a second degree.
    const duplicate = await this.db.subscriberEducation.findFirst({
      where: {
        subscriberID: subscriberId,
        degreeID: dto.degreeId,
        courseTypeID: dto.courseTypeId ?? null,
        passingYear: dto.passingYear ?? null,
        instituteName: dto.instituteName?.trim() || null,
        ...(dto.subscriberEducationId && { subscriberEducationID: { not: dto.subscriberEducationId } }),
      },
      select: { subscriberEducationID: true },
    });
    if (duplicate) throw new BadRequestException('You have already added this qualification.');
  }

  /** Splits a stored comma-separated list back into the array the editor works in. */
  private csvToList(value: string | null | undefined): string[] {
    return (value ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  /** The inverse — NULL rather than '' for an empty list, so "never set" stays distinguishable. */
  private listToCsv(list: string[] | undefined): string | null | undefined {
    if (list === undefined) return undefined;
    const joined = list.map((s) => s.trim()).filter(Boolean).join(', ');
    return joined || null;
  }

  /**
   * Trims, drops blanks and removes case-insensitive duplicates while keeping the order the
   * candidate entered — "React" and "react" are one chip, and it is the first spelling that
   * survives, because that is the one they are looking at.
   */
  private dedupeSkills(list: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of list) {
      const value = raw.trim();
      if (!value) continue;
      const key = value.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(value);
    }
    return out;
  }

  /**
   * Joins as many entries as fit the column, rather than truncating the joined string — a
   * hard cut would store half a skill name and read back as a chip that says "Postgre".
   */
  private csvWithin(list: string[], max: number): string | null {
    let csv = '';
    for (const value of list) {
      const next = csv ? `${csv}, ${value}` : value;
      if (next.length > max) break;
      csv = next;
    }
    return csv || null;
  }

  /** The candidate's own CV in edit-friendly shape — raw ids, not display strings. */
  async editProfile(subscriberId: number) {
    const [
      cv,
      education,
      employers,
      certificates,
      preferredLocations,
      tags,
      extra,
      itSkills,
      projects,
      accomplishments,
      languages,
    ] = await Promise.all([
      this.db.subscriberCVDetails.findUnique({ where: { subscriberID: subscriberId } }),
      this.db.subscriberEducation.findMany({ where: { subscriberID: subscriberId }, orderBy: { subscriberEducationID: 'asc' } }),
      this.db.subscriberEmployer.findMany({ where: { subscriberID: subscriberId }, orderBy: { joiningDate: 'desc' } }),
      this.db.subscriberCertificate.findMany({ where: { subscriberID: subscriberId }, orderBy: { subscriberCertificateID: 'asc' } }),
      this.db.subscriberPrefferedLocations.findMany({ where: { subscriberID: subscriberId } }),
      this.db.subscriberTags.findMany({ where: { subscriberID: subscriberId }, include: { tag: { select: { tagName: true } } } }),
      this.db.subscriberProfileExtra.findUnique({ where: { subscriberID: subscriberId } }),
      this.db.subscriberITSkill.findMany({ where: { subscriberID: subscriberId }, orderBy: { subscriberITSkillID: 'asc' } }),
      this.db.subscriberProject.findMany({ where: { subscriberID: subscriberId }, orderBy: [{ workedFromYear: 'desc' }, { subscriberProjectID: 'desc' }] }),
      this.db.subscriberAccomplishment.findMany({ where: { subscriberID: subscriberId }, orderBy: { subscriberAccomplishmentID: 'asc' } }),
      this.db.subscriberLanguage.findMany({ where: { subscriberID: subscriberId }, orderBy: { subscriberLanguageID: 'asc' } }),
    ]);

    return {
      headline: extra?.resumeHeadline ?? '',
      summary: extra?.profileSummary ?? '',
      careerProfile: {
        industryTypeId: cv?.industryTypeID ?? null,
        department: extra?.department ?? '',
        roleCategory: extra?.roleCategory ?? '',
        jobRole: extra?.jobRole ?? '',
        desiredJobType: this.csvToList(extra?.desiredJobType),
        desiredEmploymentType: this.csvToList(extra?.desiredEmploymentType),
        preferredShift: extra?.preferredShift ?? '',
        preferredWorkModes: this.csvToList(extra?.preferredWorkModes),
        preferredSalary: extra?.preferredSalary != null ? Number(extra.preferredSalary) : null,
        preferredJobRoles: this.csvToList(extra?.preferredJobRoles),
        preferredCityIds: preferredLocations.map((p) => p.cityID),
      },
      personalDetails: {
        maritalStatus: extra?.maritalStatus ?? '',
        personalTraits: this.csvToList(extra?.personalTraits),
        category: extra?.category ?? '',
        workPermitCountries: this.csvToList(extra?.workPermitCountries),
        usWorkPermit: extra?.usWorkPermit ?? '',
      },
      diversity: {
        disabilityStatus: extra?.disabilityStatus ?? '',
        disabilityType: extra?.disabilityType ?? '',
        disabilityPercent: extra?.disabilityPercent ?? null,
        assistanceRequired: extra?.assistanceRequired ?? '',
        militaryStatus: extra?.militaryStatus ?? '',
        militaryServiceType: extra?.militaryServiceType ?? '',
        militaryRank: extra?.militaryRank ?? '',
        militaryEnrolmentDate: this.fmtDate(extra?.militaryEnrolmentDate ?? null),
        careerBreakStatus: extra?.careerBreakStatus ?? '',
        careerBreakReason: extra?.careerBreakReason ?? '',
        careerBreakFrom: this.fmtDate(extra?.careerBreakFrom ?? null),
        careerBreakTo: this.fmtDate(extra?.careerBreakTo ?? null),
      },
      itSkills: itSkills.map((s) => ({
        subscriberItSkillId: Number(s.subscriberITSkillID),
        skillName: s.skillName,
        version: s.version ?? '',
        lastUsedYear: s.lastUsedYear,
        expYears: s.expYears,
        expMonths: s.expMonths,
      })),
      projects: projects.map((p) => ({
        subscriberProjectId: Number(p.subscriberProjectID),
        title: p.title,
        clientName: p.clientName ?? '',
        projectStatus: p.projectStatus ?? '',
        workedFromMonth: p.workedFromMonth,
        workedFromYear: p.workedFromYear,
        workedTillMonth: p.workedTillMonth,
        workedTillYear: p.workedTillYear,
        projectSite: p.projectSite ?? '',
        natureOfEmployment: p.natureOfEmployment ?? '',
        teamSize: p.teamSize,
        roleDescr: p.roleDescr ?? '',
        skillsUsed: this.csvToList(p.skillsUsed),
        details: p.details ?? '',
      })),
      accomplishments: accomplishments.map((a) => ({
        subscriberAccomplishmentId: Number(a.subscriberAccomplishmentID),
        kind: a.kind,
        title: a.title,
        url: a.url ?? '',
        descr: a.descr ?? '',
        eventMonth: a.eventMonth,
        eventYear: a.eventYear,
        patentStatus: a.patentStatus ?? '',
        patentOffice: a.patentOffice ?? '',
      })),
      languages: languages.map((l) => ({
        subscriberLanguageId: Number(l.subscriberLanguageID),
        languageName: l.languageName ?? '',
        proficiencyId: l.proficiencyID ?? 1,
        canRead: l.flgRead === 'Y',
        canWrite: l.flgWrite === 'Y',
        canSpeak: l.flgSpeak === 'Y',
      })),
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
        // The typed list wins: tblSubscriberTags only ever held the names that happened to
        // exist in tblMstrTags, so reading from it dropped every free-typed skill. The join
        // is still the fallback for rows saved before KeySkills existed.
        tagNames: extra?.keySkills
          ? this.csvToList(extra.keySkills)
          : tags.map((t) => t.tag?.tagName ?? '').filter(Boolean),
      },
      education: education.map((e) => ({
        subscriberEducationId: Number(e.subscriberEducationID),
        courseTypeId: e.courseTypeID,
        degreeId: e.degreeID,
        instituteName: e.instituteName ?? '',
        passingYear: e.passingYear,
        startYear: e.startYear,
        specialization: e.specialization ?? '',
        courseMode: e.courseMode ?? '',
        marks: e.marks ?? '',
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
        certificateUrl: c.certificateUrl ?? '',
        certificationId: c.certificationID ?? '',
        validFromMonth: c.validFromMonth,
        validFromYear: c.validFromYear,
        validTillMonth: c.validTillMonth,
        validTillYear: c.validTillYear,
        neverExpires: c.flgNeverExpires,
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
      // Two writes, because the two stores answer different questions.
      //
      // tblSubscriberTags is the searchable index and can only hold names that already exist
      // in tblMstrTags (TagID is a required FK, and minting master rows from free text is
      // master-data administration). Matching against it and keeping only the hits used to be
      // the whole of this method — which meant a candidate who typed "reactjs" got a 200 back
      // and an empty Key Skills card, because nothing they typed survived the round trip.
      //
      // So the typed list is also stored verbatim on the extras row, and that copy is what
      // the profile reads back. The tag join below is unchanged, so recruiter search still
      // sees whatever matched.
      const typed = this.dedupeSkills(dto.tagNames);
      await this.writeExtra(userId, subscriberId, { keySkills: this.csvWithin(typed, 1000) });

      const allTags = await this.db.mstrTags.findMany();
      const wanted = new Set(typed.map((t) => t.toLowerCase()));
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
    await this.validateEducation(subscriberId, dto);
    const now = new Date();
    // Conditional, because two editors write this row and they do not show the same fields.
    // An unconditional mapping made the CV manager blank the institute and passing year it
    // never rendered. An explicit empty string still clears, which is how the profile
    // dialog removes a value.
    const data = {
      courseTypeID: dto.courseTypeId ?? null,
      degreeID: dto.degreeId,
      ...(dto.instituteName !== undefined && { instituteName: dto.instituteName.trim() || null }),
      ...(dto.passingYear !== undefined && { passingYear: dto.passingYear }),
      ...(dto.startYear !== undefined && { startYear: dto.startYear }),
      ...(dto.specialization !== undefined && { specialization: dto.specialization.trim() || null }),
      ...(dto.courseMode !== undefined && { courseMode: dto.courseMode || null }),
      ...(dto.marks !== undefined && { marks: dto.marks.trim() || null }),
    };
    if (dto.subscriberEducationId) {
      await this.db.subscriberEducation.updateMany({
        where: { subscriberEducationID: dto.subscriberEducationId, subscriberID: subscriberId },
        data: { ...data, timestampUpd: now, loginIDUpd: userId },
      });
      return { subscriberEducationId: dto.subscriberEducationId };
    }
    const row = await this.db.subscriberEducation.create({
      data: { subscriberID: subscriberId, ...data, timestampIns: now, loginIDIns: userId },
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
    // A credential flagged as never expiring must not also carry a "valid till" — the two
    // would contradict each other on the profile.
    const neverExpires = !!dto.neverExpires;
    // Conditional for the same reason as education: the CV manager edits only the name.
    const data = {
      certificateName: dto.certificateName.trim(),
      ...(dto.certificateUrl !== undefined && { certificateUrl: dto.certificateUrl.trim() || null }),
      ...(dto.certificationId !== undefined && { certificationID: dto.certificationId.trim() || null }),
      ...(dto.validFromMonth !== undefined && { validFromMonth: dto.validFromMonth }),
      ...(dto.validFromYear !== undefined && { validFromYear: dto.validFromYear }),
      ...(dto.neverExpires !== undefined && {
        flgNeverExpires: neverExpires,
        validTillMonth: neverExpires ? null : (dto.validTillMonth ?? null),
        validTillYear: neverExpires ? null : (dto.validTillYear ?? null),
      }),
    };
    if (dto.subscriberCertificateId) {
      await this.db.subscriberCertificate.updateMany({
        where: { subscriberCertificateID: dto.subscriberCertificateId, subscriberID: subscriberId },
        data: { ...data, timestampUpd: now, loginIDUpd: userId },
      });
      return { subscriberCertificateId: dto.subscriberCertificateId };
    }
    const row = await this.db.subscriberCertificate.create({
      data: { subscriberID: subscriberId, ...data, timestampIns: now, loginIDIns: userId },
    });
    return { subscriberCertificateId: Number(row.subscriberCertificateID) };
  }

  async deleteCertificate(subscriberId: number, id: number) {
    await this.db.subscriberCertificate.deleteMany({ where: { subscriberCertificateID: id, subscriberID: subscriberId } });
    return { ok: true };
  }

  /* ------------------------------------------------------------------ *
   * Profile sections (tblSubscriberProfileExtra and friends)
   * ------------------------------------------------------------------ */

  /**
   * Writes a patch to the 1:1 extras row, creating it on first use.
   *
   * Every caller passes a partial: a section editor must not blank out the sections it does
   * not render. Prisma's `update` half of an upsert only touches the keys present in the
   * object, and each DTO→data mapper below omits `undefined` fields for the same reason.
   */
  private async writeExtra(
    userId: number,
    subscriberId: number,
    data: Record<string, unknown>,
  ) {
    const now = new Date();
    await this.db.subscriberProfileExtra.upsert({
      where: { subscriberID: subscriberId },
      create: { subscriberID: subscriberId, ...data, timestampIns: now, loginIDIns: userId },
      update: { ...data, timestampUpd: now, loginIDUpd: userId },
    });
    return { ok: true };
  }

  updateHeadline(userId: number, subscriberId: number, dto: UpdateHeadlineDto) {
    return this.writeExtra(userId, subscriberId, { resumeHeadline: dto.resumeHeadline.trim() || null });
  }

  updateSummary(userId: number, subscriberId: number, dto: UpdateSummaryDto) {
    return this.writeExtra(userId, subscriberId, { profileSummary: dto.profileSummary.trim() || null });
  }

  /**
   * Key skills on their own, so the chip editor does not have to round-trip the whole
   * professional block (and risk clearing a field it never showed).
   */
  async updateKeySkills(userId: number, subscriberId: number, dto: UpdateKeySkillsDto) {
    return this.updateProfessional(userId, subscriberId, { tagNames: dto.tagNames });
  }

  /**
   * Career profile. Industry and preferred locations already live on the legacy tables, so
   * they are written there; everything else is new and lands on the extras row.
   */
  async updateCareerProfile(userId: number, subscriberId: number, dto: UpdateCareerProfileDto) {
    if (dto.industryTypeId !== undefined || dto.preferredCityIds !== undefined) {
      await this.updateProfessional(userId, subscriberId, {
        industryTypeId: dto.industryTypeId,
        preferredCityIds: dto.preferredCityIds,
      });
    }
    return this.writeExtra(userId, subscriberId, {
      ...(dto.department !== undefined && { department: dto.department.trim() || null }),
      ...(dto.roleCategory !== undefined && { roleCategory: dto.roleCategory.trim() || null }),
      ...(dto.jobRole !== undefined && { jobRole: dto.jobRole.trim() || null }),
      ...(dto.desiredJobType !== undefined && { desiredJobType: this.listToCsv(dto.desiredJobType) }),
      ...(dto.desiredEmploymentType !== undefined && {
        desiredEmploymentType: this.listToCsv(dto.desiredEmploymentType),
      }),
      ...(dto.preferredShift !== undefined && { preferredShift: dto.preferredShift || null }),
      ...(dto.preferredWorkModes !== undefined && { preferredWorkModes: this.listToCsv(dto.preferredWorkModes) }),
      ...(dto.preferredSalary !== undefined && { preferredSalary: dto.preferredSalary }),
      ...(dto.preferredJobRoles !== undefined && { preferredJobRoles: this.listToCsv(dto.preferredJobRoles) }),
    });
  }

  updatePersonalDetails(userId: number, subscriberId: number, dto: UpdatePersonalDetailsDto) {
    return this.writeExtra(userId, subscriberId, {
      ...(dto.maritalStatus !== undefined && { maritalStatus: dto.maritalStatus || null }),
      ...(dto.personalTraits !== undefined && { personalTraits: this.listToCsv(dto.personalTraits) }),
      ...(dto.category !== undefined && { category: dto.category || null }),
      ...(dto.workPermitCountries !== undefined && {
        workPermitCountries: this.listToCsv(dto.workPermitCountries),
      }),
      ...(dto.usWorkPermit !== undefined && { usWorkPermit: dto.usWorkPermit.trim() || null }),
    });
  }

  updateDiversity(userId: number, subscriberId: number, dto: UpdateDiversityDto) {
    const date = (v: string | undefined) => (v ? new Date(v) : null);
    return this.writeExtra(userId, subscriberId, {
      ...(dto.disabilityStatus !== undefined && { disabilityStatus: dto.disabilityStatus || null }),
      ...(dto.disabilityType !== undefined && { disabilityType: dto.disabilityType.trim() || null }),
      ...(dto.disabilityPercent !== undefined && { disabilityPercent: dto.disabilityPercent }),
      ...(dto.assistanceRequired !== undefined && { assistanceRequired: dto.assistanceRequired.trim() || null }),
      ...(dto.militaryStatus !== undefined && { militaryStatus: dto.militaryStatus || null }),
      ...(dto.militaryServiceType !== undefined && { militaryServiceType: dto.militaryServiceType.trim() || null }),
      ...(dto.militaryRank !== undefined && { militaryRank: dto.militaryRank.trim() || null }),
      ...(dto.militaryEnrolmentDate !== undefined && { militaryEnrolmentDate: date(dto.militaryEnrolmentDate) }),
      ...(dto.careerBreakStatus !== undefined && { careerBreakStatus: dto.careerBreakStatus || null }),
      ...(dto.careerBreakReason !== undefined && { careerBreakReason: dto.careerBreakReason.trim() || null }),
      ...(dto.careerBreakFrom !== undefined && { careerBreakFrom: date(dto.careerBreakFrom) }),
      // Left NULL while the break is ongoing; the profile prints "Present" for that.
      ...(dto.careerBreakTo !== undefined && { careerBreakTo: date(dto.careerBreakTo) }),
    });
  }

  async upsertItSkill(userId: number, subscriberId: number, dto: UpsertItSkillDto) {
    const now = new Date();
    const data = {
      skillName: dto.skillName.trim(),
      version: dto.version?.trim() || null,
      lastUsedYear: dto.lastUsedYear ?? null,
      expYears: dto.expYears ?? null,
      expMonths: dto.expMonths ?? null,
    };
    if (dto.subscriberItSkillId) {
      await this.db.subscriberITSkill.updateMany({
        where: { subscriberITSkillID: dto.subscriberItSkillId, subscriberID: subscriberId },
        data: { ...data, timestampUpd: now, loginIDUpd: userId },
      });
      return { subscriberItSkillId: dto.subscriberItSkillId };
    }
    const row = await this.db.subscriberITSkill.create({
      data: { subscriberID: subscriberId, ...data, timestampIns: now, loginIDIns: userId },
    });
    return { subscriberItSkillId: Number(row.subscriberITSkillID) };
  }

  async deleteItSkill(subscriberId: number, id: number) {
    await this.db.subscriberITSkill.deleteMany({ where: { subscriberITSkillID: id, subscriberID: subscriberId } });
    return { ok: true };
  }

  async upsertProject(userId: number, subscriberId: number, dto: UpsertProjectDto) {
    const now = new Date();
    // An in-progress project has no end, so a "worked till" typed before the status was
    // switched must not survive as a contradictory end date.
    const inProgress = dto.projectStatus === 'In Progress';
    const data = {
      title: dto.title.trim(),
      clientName: dto.clientName?.trim() || null,
      projectStatus: dto.projectStatus || null,
      workedFromMonth: dto.workedFromMonth ?? null,
      workedFromYear: dto.workedFromYear ?? null,
      workedTillMonth: inProgress ? null : dto.workedTillMonth ?? null,
      workedTillYear: inProgress ? null : dto.workedTillYear ?? null,
      projectSite: dto.projectSite || null,
      natureOfEmployment: dto.natureOfEmployment || null,
      teamSize: dto.teamSize ?? null,
      roleDescr: dto.roleDescr?.trim() || null,
      skillsUsed: this.listToCsv(dto.skillsUsed) ?? null,
      details: dto.details?.trim() || null,
    };
    if (dto.subscriberProjectId) {
      await this.db.subscriberProject.updateMany({
        where: { subscriberProjectID: dto.subscriberProjectId, subscriberID: subscriberId },
        data: { ...data, timestampUpd: now, loginIDUpd: userId },
      });
      return { subscriberProjectId: dto.subscriberProjectId };
    }
    const row = await this.db.subscriberProject.create({
      data: { subscriberID: subscriberId, ...data, timestampIns: now, loginIDIns: userId },
    });
    return { subscriberProjectId: Number(row.subscriberProjectID) };
  }

  async deleteProject(subscriberId: number, id: number) {
    await this.db.subscriberProject.deleteMany({ where: { subscriberProjectID: id, subscriberID: subscriberId } });
    return { ok: true };
  }

  async upsertAccomplishment(userId: number, subscriberId: number, dto: UpsertAccomplishmentDto) {
    const now = new Date();
    const data = {
      kind: dto.kind,
      title: dto.title.trim(),
      url: dto.url?.trim() || null,
      descr: dto.descr?.trim() || null,
      eventMonth: dto.eventMonth ?? null,
      eventYear: dto.eventYear ?? null,
      patentStatus: dto.patentStatus?.trim() || null,
      patentOffice: dto.patentOffice?.trim() || null,
    };
    if (dto.subscriberAccomplishmentId) {
      await this.db.subscriberAccomplishment.updateMany({
        where: { subscriberAccomplishmentID: dto.subscriberAccomplishmentId, subscriberID: subscriberId },
        data: { ...data, timestampUpd: now, loginIDUpd: userId },
      });
      return { subscriberAccomplishmentId: dto.subscriberAccomplishmentId };
    }
    const row = await this.db.subscriberAccomplishment.create({
      data: { subscriberID: subscriberId, ...data, timestampIns: now, loginIDIns: userId },
    });
    return { subscriberAccomplishmentId: Number(row.subscriberAccomplishmentID) };
  }

  async deleteAccomplishment(subscriberId: number, id: number) {
    await this.db.subscriberAccomplishment.deleteMany({
      where: { subscriberAccomplishmentID: id, subscriberID: subscriberId },
    });
    return { ok: true };
  }

  async upsertLanguage(userId: number, subscriberId: number, dto: UpsertLanguageDto) {
    const now = new Date();
    // The legacy columns are char(1) 'Y'/'N', not booleans.
    const yn = (v: boolean | undefined) => (v ? 'Y' : 'N');
    const data = {
      languageName: dto.languageName.trim(),
      proficiencyID: dto.proficiencyId,
      flgRead: yn(dto.canRead),
      flgWrite: yn(dto.canWrite),
      flgSpeak: yn(dto.canSpeak),
    };
    if (dto.subscriberLanguageId) {
      await this.db.subscriberLanguage.updateMany({
        where: { subscriberLanguageID: dto.subscriberLanguageId, subscriberID: subscriberId },
        data: { ...data, timestampUpd: now, loginIDUpd: userId },
      });
      return { subscriberLanguageId: dto.subscriberLanguageId };
    }
    const row = await this.db.subscriberLanguage.create({
      data: { subscriberID: subscriberId, ...data, timestampIns: now, loginIDIns: userId },
    });
    return { subscriberLanguageId: Number(row.subscriberLanguageID) };
  }

  async deleteLanguage(subscriberId: number, id: number) {
    await this.db.subscriberLanguage.deleteMany({ where: { subscriberLanguageID: id, subscriberID: subscriberId } });
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
    const defaults = {
      emailAlerts: true,
      pushAlerts: true,
      smsAlerts: false,
      jobAlertFrequency: 'Daily' as const,
      newJobAlerts: true,
      weeklyJobDigest: true,
      profileViewAlerts: true,
      applicationStatusUpdates: true,
      recruiterMessages: true,
      interviewReminders: true,
      productUpdates: true,
      // Opt-in, not opt-out.
      marketingOffers: false,
    };
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
        newJobAlerts: row.newJobAlerts ?? defaults.newJobAlerts,
        weeklyJobDigest: row.weeklyJobDigest ?? defaults.weeklyJobDigest,
        profileViewAlerts: row.profileViewAlerts ?? defaults.profileViewAlerts,
        applicationStatusUpdates: row.applicationStatusUpdates ?? defaults.applicationStatusUpdates,
        recruiterMessages: row.recruiterMessages ?? defaults.recruiterMessages,
        interviewReminders: row.interviewReminders ?? defaults.interviewReminders,
        productUpdates: row.productUpdates ?? defaults.productUpdates,
        marketingOffers: row.marketingOffers ?? defaults.marketingOffers,
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
    const now = new Date();

    await this.db.subscriberCVDetails.update({
      where: { subscriberID: subscriberId },
      data: { cVPath: stored.key },
    });

    /**
     * CVDetails.CVPath alone cannot back the resume card: it holds a generated storage key,
     * so the profile could show neither the candidate's own filename nor when they uploaded
     * it. tblSubscriberCVUploaded exists for exactly that and was simply never written.
     */
    await this.db.subscriberCVUploaded.upsert({
      where: { subscriberID: subscriberId },
      create: {
        subscriberID: subscriberId,
        latestCVPath: stored.key,
        cVName: file.originalname,
        timestampIns: now,
        loginIDIns: userId,
      },
      update: {
        latestCVPath: stored.key,
        cVName: file.originalname,
        tImestampUpd: now,
        loginIDUpd: userId,
      },
    });
    await this.db.subscriberRegistration.update({
      where: { subscriberID: subscriberId },
      data: { flgCVUploaded: 1 },
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
    // deleteMany, not delete: a candidate who never uploaded has no row, and clicking delete
    // must not 500 on that.
    await this.db.subscriberCVUploaded.deleteMany({ where: { subscriberID: subscriberId } });
    return { ok: true };
  }

  /** Streams the candidate's own resume back — the download link on the profile's resume card. */
  async resumeFile(subscriberId: number) {
    const uploaded = await this.db.subscriberCVUploaded.findUnique({ where: { subscriberID: subscriberId } });
    if (!uploaded) throw new NotFoundException('No resume uploaded');
    return { body: await this.storage.read(uploaded.latestCVPath), fileName: uploaded.cVName };
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

  /* ----------------------------------------------------------------------- *
   * Referrals
   * ----------------------------------------------------------------------- */

  /**
   * Referral summary for the "Refer a Friend" screen.
   *
   * The referral code is derived from the subscriber id rather than stored: it has to be
   * stable and unique, and both of those are already true of the id. Deriving it means there
   * is no second source of truth to keep in step, and no backfill for existing candidates.
   */
  async referrals(subscriberId: number) {
    const rows = await this.db.candidateReferral.findMany({
      where: { subscriberID: subscriberId },
      orderBy: { invitedAt: 'desc' },
    });

    const earnedPaise = rows.filter((r) => r.rewardPaid).reduce((sum, r) => sum + r.rewardPaise, 0);
    const pendingPaise = rows.filter((r) => !r.rewardPaid).reduce((sum, r) => sum + r.rewardPaise, 0);

    return {
      code: this.referralCode(subscriberId),
      totalInvited: rows.length,
      successfulSignups: rows.filter((r) => r.status !== 'Invited').length,
      earnedRupees: earnedPaise / 100,
      pendingRupees: pendingPaise / 100,
      referrals: rows.map((r) => ({
        referralId: r.referralId,
        name: r.name,
        email: r.email,
        mobile: r.mobile,
        status: r.status,
        rewardRupees: r.rewardPaise / 100,
        rewardPaid: r.rewardPaid,
        invitedAt: r.invitedAt.toISOString(),
      })),
    };
  }

  /** Stable, shareable code for a candidate — base-36 of the id, so it stays short. */
  private referralCode(subscriberId: number) {
    return `AJ${subscriberId.toString(36).toUpperCase().padStart(5, '0')}`;
  }

  async createReferral(
    userId: number,
    subscriberId: number,
    dto: { name: string; email?: string; mobile?: string },
  ) {
    if (!dto.email && !dto.mobile) {
      throw new BadRequestException('Provide an email address or a mobile number to send the invite.');
    }

    // The same person invited twice should not create a second reward line.
    const duplicate = await this.db.candidateReferral.findFirst({
      where: {
        subscriberID: subscriberId,
        OR: [
          ...(dto.email ? [{ email: dto.email }] : []),
          ...(dto.mobile ? [{ mobile: dto.mobile }] : []),
        ],
      },
    });
    if (duplicate) return { referralId: duplicate.referralId, duplicate: true };

    const row = await this.db.candidateReferral.create({
      data: {
        subscriberID: subscriberId,
        name: dto.name,
        email: dto.email ?? null,
        mobile: dto.mobile ?? null,
      },
    });

    await this.audit.record({
      userId,
      action: 'candidate.referral_created',
      entity: 'CandidateReferral',
      entityId: row.referralId,
      detail: { name: dto.name },
    });

    return { referralId: row.referralId, duplicate: false };
  }

  /* ----------------------------------------------------------------------- *
   * Privacy & account lifecycle
   * ----------------------------------------------------------------------- */

  /** Defaults are returned for a candidate who has never opened the privacy tab. */
  async privacy(subscriberId: number) {
    const row = await this.db.candidatePrivacy.findUnique({ where: { subscriberID: subscriberId } });
    return {
      showCurrentEmployer: row?.showCurrentEmployer ?? true,
      allowRecruiterMessages: row?.allowRecruiterMessages ?? true,
      exportRequestedAt: row?.exportRequestedAt?.toISOString() ?? null,
      deletionRequestedAt: row?.deletionRequestedAt?.toISOString() ?? null,
    };
  }

  async updatePrivacy(
    userId: number,
    subscriberId: number,
    dto: { showCurrentEmployer?: boolean; allowRecruiterMessages?: boolean },
  ) {
    await this.db.candidatePrivacy.upsert({
      where: { subscriberID: subscriberId },
      create: { subscriberID: subscriberId, ...dto, updatedAt: new Date() },
      update: { ...dto, updatedAt: new Date() },
    });

    await this.audit.record({
      userId,
      action: 'candidate.privacy_updated',
      entity: 'CandidatePrivacy',
      entityId: subscriberId,
      detail: dto,
    });

    return this.privacy(subscriberId);
  }

  /**
   * Records a data-export request. Producing the archive is a background job rather than a
   * request-time zip: a full profile plus documents is far too slow to build inline, and the
   * candidate is told it will be emailed.
   */
  async requestExport(userId: number, subscriberId: number) {
    const requestedAt = new Date();
    await this.db.candidatePrivacy.upsert({
      where: { subscriberID: subscriberId },
      create: { subscriberID: subscriberId, exportRequestedAt: requestedAt, updatedAt: requestedAt },
      update: { exportRequestedAt: requestedAt, updatedAt: requestedAt },
    });

    await this.audit.record({
      userId,
      action: 'candidate.export_requested',
      entity: 'CandidatePrivacy',
      entityId: subscriberId,
    });

    return { requestedAt: requestedAt.toISOString() };
  }

  /**
   * Marks the account for deletion and locks the candidate out immediately.
   *
   * Deliberately not a hard DELETE: applications the candidate has already made are part of
   * an employer's hiring record, and a cascade would tear rows out of someone else's ATS.
   * The login is disabled now and the data is purged by a retention job after the grace
   * period, which is also what makes the request reversible if it was a mistake.
   */
  async requestDeletion(userId: number, subscriberId: number) {
    const requestedAt = new Date();

    await this.db.$transaction([
      this.db.candidatePrivacy.upsert({
        where: { subscriberID: subscriberId },
        create: { subscriberID: subscriberId, deletionRequestedAt: requestedAt, updatedAt: requestedAt },
        update: { deletionRequestedAt: requestedAt, updatedAt: requestedAt },
      }),
      // Active '1' is what every login and refresh path filters on (see AuthService), so
      // clearing it locks the account out everywhere without a second mechanism.
      this.db.secUser.update({ where: { userID: userId }, data: { active: '0' } }),
      this.db.secActiveSessions.deleteMany({ where: { userID: userId } }),
    ]);

    await this.audit.record({
      userId,
      action: 'candidate.deletion_requested',
      entity: 'SubscriberRegistration',
      entityId: subscriberId,
    });

    return { requestedAt: requestedAt.toISOString() };
  }
}
