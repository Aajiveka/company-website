import { isAxiosError } from 'axios';

/**
 * Turns a failed save into a sentence the candidate can act on.
 *
 * Every wizard step used to answer any failure with "Could not save. Please try again." — so a
 * candidate whose blank date of birth the API rejected pressed Save again and again against an
 * error that retrying could never clear, with nothing on screen saying which field was wrong.
 *
 * The API speaks two dialects. Service rules are already written for people ("Worked till
 * cannot be earlier than worked from.") and pass through untouched. class-validator's are not
 * ("dob must be a valid ISO 8601 date string"), so those are matched by shape and rewritten
 * with the field's on-screen label.
 */

/** The labels the wizard shows, keyed by the API's property names. */
const FIELD_LABELS: Record<string, string> = {
  fullName: 'Full Name',
  mobile: 'Phone Number',
  email: 'Email Address',
  dob: 'Date of Birth',
  gender: 'Gender',
  address: 'Address',
  cityId: 'Current Location',
  resumeHeadline: 'Professional Title',
  profileSummary: 'Profile Summary',
  subFunctionId: 'Function / Department',
  subFunctionName: 'Function / Department',
  skillId: 'Primary Skill',
  skillName: 'Skill',
  totalExp: 'Total Experience (years)',
  totalExpMonths: 'Total Experience (months)',
  tagNames: 'Skills',
  degreeId: 'Education',
  courseTypeId: 'Course',
  courseName: 'Course',
  instituteName: 'Institution / University name',
  specialization: 'Specialization',
  startYear: 'Start Year',
  passingYear: 'End Year',
  marks: 'Percentage',
  courseMode: 'Course Type',
  employer: 'Company',
  designationId: 'Job Title',
  designationName: 'Job Title',
  employeeTypeId: 'Employment Type',
  joiningDate: 'Joining Date',
  releavingDate: 'Leaving Date',
  jobDescr: 'Description',
  title: 'Title',
  clientName: 'Client',
  projectStatus: 'Work Status',
  projectSite: 'Project Site',
  natureOfEmployment: 'Nature of Employment',
  teamSize: 'Team Size',
  details: 'Details',
  languageName: 'Language',
  proficiencyId: 'Proficiency',
  version: 'Version',
  lastUsedYear: 'Last Used',
  certificateName: 'Certification name',
  certificateUrl: 'Certificate URL',
  certificationId: 'Certification ID',
  url: 'URL',
  noticePeriod: 'Notice Period',
  preferredSalary: 'Expected CTC',
  preferredCityIds: 'Preferred Locations',
};

/** class-validator's message shapes, each rewritten around the field's label. */
const RULES: [RegExp, (label: string, m: RegExpMatchArray) => string][] = [
  [/^(\w+) must be a valid ISO 8601 date string$/, (l) => `${l}: enter a valid date.`],
  [/^(\w+) must be shorter than or equal to (\d+) characters$/, (l, m) => `${l} is too long — keep it to ${m[2]} characters or fewer.`],
  [/^(\w+) must be longer than or equal to (\d+) characters$/, (l, m) => `${l} must be at least ${m[2]} characters.`],
  [/^(\w+) should not be empty$/, (l) => `${l} is required.`],
  [/^(\w+) must be an email$/, (l) => `${l}: enter a valid email address, like name@example.com.`],
  [/^(\w+) must be a URL address$/, (l) => `${l}: enter a full web address, including https://.`],
  [/^(\w+) must be one of the following values/, (l) => `${l}: choose one of the options in the list.`],
  [/^(\w+) must not be greater than (\d+)$/, (l, m) => `${l} cannot be more than ${m[2]}.`],
  [/^(\w+) must not be less than (\d+)$/, (l, m) => `${l} cannot be less than ${m[2]}.`],
  [/^(\w+) must be an? (integer|number)( conforming to the specified constraints)?$/, (l) => `${l} must be a number.`],
  [/^(\w+) must be a string$/, (l) => `${l} has an invalid value.`],
  [/^property (\w+) should not exist$/, () => 'The form sent a field the server does not accept. Please refresh the page and try again.'],
];

function humanise(message: string, labels: Record<string, string>): string {
  for (const [pattern, write] of RULES) {
    const m = message.match(pattern);
    if (m) return write(labels[m[1]!] ?? FIELD_LABELS[m[1]!] ?? m[1]!, m);
  }
  // Already a sentence written for people — end it like one.
  return /[.!?]$/.test(message) ? message : `${message}.`;
}

/**
 * "Could not save <what>. <reason>"
 *
 * `labels` overrides a field's label for one form — `skillName` is "Primary Skill" on step 1
 * but an IT skill's name on the Skills step.
 */
export function saveErrorMessage(err: unknown, what: string, labels: Record<string, string> = {}): string {
  const lead = `Could not save ${what}.`;
  if (!isAxiosError(err)) return `${lead} Please try again.`;

  const status = err.response?.status;
  if (!err.response) return `${lead} Could not reach the server — check your internet connection and try again.`;
  if (status === 401) return `${lead} Your session has expired — please sign in again.`;
  if (status === 403) return `${lead} Your account is not allowed to make this change.`;
  if (status === 413) return `${lead} The file is too large.`;
  if (status === 429) return `${lead} Too many attempts — wait a minute, then try again.`;
  if (status && status >= 500) return `${lead} Something went wrong on our side — please try again in a moment.`;

  const raw = (err.response.data as { message?: string | string[] } | undefined)?.message;
  const messages = (Array.isArray(raw) ? raw : raw ? [raw] : []).filter(Boolean);
  if (!messages.length) return `${lead} Please check the form and try again.`;
  // Several rules can fail at once; the first three are enough to act on.
  return `${lead} ${messages.slice(0, 3).map((m) => humanise(m, labels)).join(' ')}`;
}
