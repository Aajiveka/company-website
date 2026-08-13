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

/** Allowed values documented in the template sample row (must resolve against masters). */
export const JOB_IMPORT_SAMPLE_ROW: Record<JobImportColumnKey, string> = {
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
};

export function buildJobImportCsv(): string {
  const headers = JOB_IMPORT_COLUMNS.map((c) => c.label).join(',');
  const values = JOB_IMPORT_COLUMNS.map((c) => {
    const raw = JOB_IMPORT_SAMPLE_ROW[c.key];
    return raw.includes(',') ? `"${raw}"` : raw;
  }).join(',');
  return `${headers}\n${values}\n`;
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
