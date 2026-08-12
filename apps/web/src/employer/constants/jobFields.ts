/** Shared job field columns for Post Job + Bulk Import (CSV headers). */
export const JOB_IMPORT_COLUMNS = [
  { key: 'position', label: 'Position', required: true },
  { key: 'employmentType', label: 'Employment type', required: true },
  { key: 'experience', label: 'Experience', required: true },
  { key: 'workMode', label: 'Work mode', required: true },
  { key: 'ctcMin', label: 'CTC (min)', required: false },
  { key: 'ctcMax', label: 'CTC (max)', required: false },
  { key: 'educationDetail', label: 'Education Detail', required: true },
  { key: 'reportTo', label: 'Report to', required: false },
  { key: 'teamSize', label: 'Team size', required: false },
  { key: 'industryType', label: 'Industry type', required: true },
  { key: 'department', label: 'Department', required: true },
  { key: 'subDepartment', label: 'Sub-Department', required: false },
  { key: 'skills', label: 'Skills', required: true },
  { key: 'jobDescription', label: 'Job Description', required: true },
  { key: 'location', label: 'Location', required: true },
  { key: 'interviewRound', label: 'Interview round', required: false },
  { key: 'interviewProcess', label: 'Interview Process', required: false },
] as const;

export type JobImportColumnKey = (typeof JOB_IMPORT_COLUMNS)[number]['key'];

/** Allowed values documented in the template (must resolve against masters). */
export const JOB_IMPORT_SAMPLE_ROWS: Record<JobImportColumnKey, string>[] = [
  {
    position: 'Frontend Developer',
    employmentType: 'Full Time',
    experience: '2-5',
    workMode: 'Hybrid',
    ctcMin: '600000',
    ctcMax: '1200000',
    educationDetail: 'B.Tech / MCA',
    reportTo: 'Engineering Manager',
    teamSize: '8',
    industryType: 'IT Services & Consulting',
    department: 'Engineering',
    subDepartment: 'Frontend',
    skills: 'React, TypeScript, Node.js',
    jobDescription: 'Build and own web product features.',
    location: 'Bengaluru',
    interviewRound: '1|2|3',
    interviewProcess: 'HR Screen|Technical|Hiring Manager',
  },
  {
    position: 'Backend Developer',
    employmentType: 'Full Time',
    experience: '3-6',
    workMode: 'Work From Office',
    ctcMin: '800000',
    ctcMax: '1500000',
    educationDetail: 'B.Tech',
    reportTo: 'Tech Lead',
    teamSize: '5',
    industryType: 'IT Services & Consulting',
    department: 'Engineering',
    subDepartment: 'Backend',
    skills: 'Node.js, PostgreSQL, AWS',
    jobDescription: 'Design and ship API services.',
    location: 'Noida',
    interviewRound: '1|2',
    interviewProcess: 'HR Screen|Technical',
  },
  {
    position: 'QA Engineer',
    employmentType: 'Contract',
    experience: '1-3',
    workMode: 'Remote',
    ctcMin: '400000',
    ctcMax: '700000',
    educationDetail: 'B.Sc / BCA',
    reportTo: 'QA Lead',
    teamSize: '4',
    industryType: 'IT Services & Consulting',
    department: 'Quality',
    subDepartment: 'Testing',
    skills: 'Selenium, Manual Testing, JIRA',
    jobDescription: 'Own regression and release quality.',
    location: 'Pune',
    interviewRound: '1|2',
    interviewProcess: 'HR Screen|Technical',
  },
];

/** @deprecated use JOB_IMPORT_SAMPLE_ROWS[0] */
export const JOB_IMPORT_SAMPLE_ROW = JOB_IMPORT_SAMPLE_ROWS[0];

function csvEscape(raw: string): string {
  return raw.includes(',') || raw.includes('"') || raw.includes('\n')
    ? `"${raw.replace(/"/g, '""')}"`
    : raw;
}

export function buildJobImportCsv(): string {
  const headers = JOB_IMPORT_COLUMNS.map((c) => c.label).join(',');
  const rows = JOB_IMPORT_SAMPLE_ROWS.map((row) =>
    JOB_IMPORT_COLUMNS.map((c) => csvEscape(row[c.key])).join(','),
  );
  return `${headers}\n${rows.join('\n')}\n`;
}

export function downloadJobImportTemplate(format: 'csv' | 'xlsx-hint' = 'csv') {
  const csv = buildJobImportCsv();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = format === 'csv' ? 'job-import-template.csv' : 'job-import-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}
