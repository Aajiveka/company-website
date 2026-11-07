import type { AccomplishmentKind, CvEditProfile, CvMasters } from '../../candidate.types';
import { dotted, duration, educationTitle, formatMarks, labelOf, monthYear } from '../format';

/**
 * Everything a resume prints, already labelled and formatted.
 *
 * Built once from the CV so the templates only decide layout — none of them looks up a
 * master id or formats a date, which is how two templates would otherwise end up disagreeing
 * about what the same candidate did.
 *
 * Deliberately left off: current and expected salary, caste category and the diversity block
 * (disability, military, career break). They are on the profile for recruiters who ask, but a
 * resume is handed to anyone, and printing them by default is not the candidate's choice to
 * have made for them.
 */
export interface ResumeData {
  name: string;
  initials: string;
  headline: string;
  photoUrl: string | null;
  contact: { email: string; phone: string; location: string; address: string };
  links: { label: string; url: string }[];
  /** Total experience, function, primary skill, industry — the one-line professional profile. */
  snapshot: Fact[];
  summary: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  skills: string[];
  itSkills: { name: string; meta: string }[];
  languages: { name: string; level: string; abilities: string }[];
  certifications: { name: string; meta: string; url: string }[];
  accomplishments: { kind: string; title: string; meta: string; descr: string; url: string }[];
  preferences: Fact[];
  personal: Fact[];
}

export interface Fact {
  label: string;
  value: string;
}

export interface ExperienceItem {
  role: string;
  company: string;
  period: string;
  duration: string;
  meta: string;
  description: string;
  current: boolean;
}

export interface EducationItem {
  title: string;
  institute: string;
  detail: string;
  period: string;
  /** Already labelled: "Percentage: 80%", "CGPA: 8.5/10". */
  marks: string;
}

export interface ProjectItem {
  title: string;
  client: string;
  period: string;
  meta: string;
  skills: string[];
  role: string;
  details: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PROFICIENCY: Record<number, string> = { 1: 'Beginner', 2: 'Proficient', 3: 'Expert' };
const ACCOMPLISHMENT_KIND: Record<AccomplishmentKind, string> = {
  ONLINE_PROFILE: 'Online profile',
  WORK_SAMPLE: 'Work sample',
  PUBLICATION: 'Publication',
  PRESENTATION: 'Presentation',
  PATENT: 'Patent',
};

/** "Mar 2024", "2024" when only the year is known, '' when neither is. */
function monthOf(month: number | null | undefined, year: number | null | undefined): string {
  if (!year) return '';
  return month ? `${MONTHS[month - 1]} ${year}` : String(year);
}

/** "Jan 2022 – Mar 2023", "Jan 2022 – Present", or just the one end that is known. */
function range(from: string, to: string, ongoing = false): string {
  const end = ongoing ? 'Present' : to;
  if (from && end) return `${from} – ${end}`;
  return from || end;
}

/** "3 yrs 6 mos" for an IT skill's depth; '' when neither half was entered. */
function expLength(yrs: number | null, months: number | null): string {
  return [
    yrs ? `${yrs} yr${yrs === 1 ? '' : 's'}` : null,
    months ? `${months} mo${months === 1 ? '' : 's'}` : null,
  ]
    .filter(Boolean)
    .join(' ');
}

const facts = (pairs: [string, string | null | undefined][]): Fact[] =>
  pairs
    .filter((p): p is [string, string] => !!p[1]?.trim())
    .map(([label, value]) => ({ label, value }));

/**
 * A link as printed: the address without "https://www.", so it reads "linkedin.com/in/…". The
 * title alone ("LinkedIn") is no use on paper, where nobody can click it. The query and
 * fragment go too: a copied link drags "?utm_source=…" along, and nobody types that back in.
 */
function linkLabel(url: string): string {
  return url
    .replace(/^https?:\/\/(www\.)?/i, '')
    .replace(/[?#].*$/, '')
    .replace(/\/$/, '');
}

/** "React, Node.js\nMongoDB" is three skills: candidates paste lists with either separator. */
function splitSkills(skills: string[]): string[] {
  return skills
    .flatMap((s) => s.split(/[,\n]/))
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Whether `phrase` appears in `text` as whole words — "Computer Science" in "Computer Science
 * and Engineering", but not "AI" in "Chemical Engineering".
 */
function namesWithin(text: string | null | undefined, phrase: string): boolean {
  if (!text) return false;
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|\\W)${escaped}($|\\W)`, 'i').test(text);
}

export function buildResumeData(cv: CvEditProfile, masters: CvMasters | undefined): ResumeData {
  const p = cv.personal;
  const pro = cv.professional;
  const cp = cv.careerProfile;
  const pd = cv.personalDetails;
  const name = p?.fullName?.trim() || 'Your Name';

  const totalMonths = (pro?.totalExp ?? 0) * 12 + (pro?.totalExpMonths ?? 0);
  const experienceText = totalMonths
    ? expLength(pro?.totalExp || null, pro?.totalExpMonths || null)
    : // Zero total experience is how the schema records a fresher.
      pro && !cv.employment.length
      ? 'Fresher'
      : '';

  const cityLabel = (id: number) => labelOf(masters?.cities, id);
  const city = p?.cityId ? cityLabel(p.cityId) : null;
  const gender = p?.gender === 'F' ? 'Female' : p?.gender === 'M' ? 'Male' : '';
  const notice = pro?.noticePeriod;

  return {
    name,
    initials: name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join(''),
    headline: cv.headline?.trim() || labelOf(masters?.subFunctions, pro?.subFunctionId) || '',
    photoUrl: p?.photoUrl ?? null,
    contact: {
      email: p?.email ?? '',
      phone: p?.mobile ?? '',
      location: city ?? '',
      address: p?.address?.trim() ?? '',
    },
    // Online profiles are stored as accomplishments; on a resume they belong in the header.
    links: cv.accomplishments
      .filter((a) => a.kind === 'ONLINE_PROFILE' && a.url)
      .map((a) => ({ label: linkLabel(a.url), url: a.url })),
    snapshot: facts([
      ['Experience', experienceText],
      ['Function', labelOf(masters?.subFunctions, pro?.subFunctionId)],
      ['Primary skill', labelOf(masters?.skills, pro?.skillId)],
      ['Industry', labelOf(masters?.industries, cp?.industryTypeId ?? pro?.industryTypeId)],
    ]),
    summary: cv.summary?.trim() ?? '',

    experience: cv.employment.map((e) => ({
      role: labelOf(masters?.designations, e.designationId) ?? '',
      company: e.employer,
      period: range(monthYear(e.joiningDate) ?? '', monthYear(e.releavingDate) ?? '', e.flgCurrent),
      duration: duration(e.joiningDate, e.flgCurrent ? null : e.releavingDate) ?? '',
      meta: labelOf(masters?.employmentTypes, e.employeeTypeId) ?? '',
      description: e.jobDescr?.trim() ?? '',
      current: e.flgCurrent,
    })),

    education: cv.education.map((e) => {
      const course = labelOf(masters?.courses, e.courseTypeId);
      const spec = e.specialization?.trim();
      return {
        title: educationTitle(masters?.degrees, masters?.courses, e),
        institute: e.instituteName ?? '',
        // The branch, now that the qualification is the headline above it. A specialization the
        // course already names ("Computer Science" under "Computer Science and Engineering") is
        // left off rather than printed twice.
        detail: dotted(
          course,
          spec && !namesWithin(course, spec) ? spec : null,
          e.courseMode || null,
        ),
        period: range(
          e.startYear ? String(e.startYear) : '',
          e.passingYear ? String(e.passingYear) : '',
        ),
        marks: formatMarks(e.marks),
      };
    }),

    projects: cv.projects.map((pr) => ({
      title: pr.title,
      client: pr.clientName ?? '',
      period: range(
        monthOf(pr.workedFromMonth, pr.workedFromYear),
        monthOf(pr.workedTillMonth, pr.workedTillYear),
        pr.projectStatus === 'In Progress',
      ),
      meta: dotted(
        pr.projectSite || null,
        pr.natureOfEmployment || null,
        pr.teamSize ? `Team of ${pr.teamSize}` : null,
      ),
      skills: splitSkills(pr.skillsUsed),
      role: pr.roleDescr?.trim() ?? '',
      details: pr.details?.trim() ?? '',
    })),

    skills: splitSkills(pro?.tagNames ?? []),
    itSkills: cv.itSkills.map((s) => ({
      name: s.skillName,
      meta: dotted(
        s.version || null,
        expLength(s.expYears, s.expMonths) || null,
        s.lastUsedYear ? `last used ${s.lastUsedYear}` : null,
      ),
    })),
    languages: cv.languages.map((l) => ({
      name: l.languageName,
      level: PROFICIENCY[l.proficiencyId] ?? '',
      abilities: [l.canRead && 'Read', l.canWrite && 'Write', l.canSpeak && 'Speak']
        .filter(Boolean)
        .join(', '),
    })),
    certifications: cv.certificates.map((c) => ({
      name: c.certificateName,
      meta: dotted(
        c.certificationId || null,
        c.validFromYear
          ? range(
              monthOf(c.validFromMonth, c.validFromYear),
              c.neverExpires ? 'No expiry' : monthOf(c.validTillMonth, c.validTillYear),
            )
          : null,
      ),
      url: c.certificateUrl ?? '',
    })),
    accomplishments: cv.accomplishments
      .filter((a) => a.kind !== 'ONLINE_PROFILE')
      .map((a) => ({
        kind: ACCOMPLISHMENT_KIND[a.kind] ?? '',
        title: a.title,
        meta: dotted(
          monthOf(a.eventMonth, a.eventYear) || null,
          a.kind === 'PATENT'
            ? dotted(a.patentOffice || null, a.patentStatus || null) || null
            : null,
        ),
        descr: a.descr?.trim() ?? '',
        url: a.url ?? '',
      })),

    preferences: facts([
      ['Preferred role', cp?.jobRole || cp?.preferredJobRoles?.join(', ')],
      [
        'Preferred locations',
        (cp?.preferredCityIds?.length ? cp.preferredCityIds : (pro?.preferredCityIds ?? []))
          .map(cityLabel)
          .filter(Boolean)
          .join(', '),
      ],
      ['Job type', cp?.desiredJobType?.join(', ')],
      ['Employment type', cp?.desiredEmploymentType?.join(', ')],
      ['Work mode', cp?.preferredWorkModes?.join(', ')],
      ['Shift', cp?.preferredShift],
      [
        'Notice period',
        notice == null ? null : notice === 0 ? 'Immediately available' : `${notice} days`,
      ],
      ['Open to relocate', pro?.flgReadyToRelocate ? 'Yes' : null],
    ]),
    personal: facts([
      ['Date of birth', p?.dob ? longDob(p.dob) : null],
      ['Gender', gender],
      ['Marital status', pd?.maritalStatus],
      ['Work permit', pd?.workPermitCountries?.join(', ')],
      ['Strengths', pd?.personalTraits?.join(', ')],
    ]),
  };
}

/** "15 Aug 1998" — the DOB is a date, not a month, so it gets the day too. */
function longDob(value: string): string | null {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
