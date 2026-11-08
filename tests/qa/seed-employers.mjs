// Creates N employers through the real flow: public registration → admin approval (creates the
// company + login, mails a temporary password — read from the log-driver output) → login →
// company profile + HR contact + logo → jobs across every employment type and work mode.
//
//   QA_API_LOG=/path/to/api.log node tests/qa/seed-employers.mjs [count=100]
import { writeFileSync } from 'node:fs';
import { Api, assertSafeTarget, ipFor, pool, STATE_DIR, tempPasswordFromLog } from './lib/client.mjs';
import { CITY_NAMES, INDUSTRIES, colour, companyName, int, personName, pick, png, rng, roleByKey, sample } from './lib/fixtures.mjs';

const COUNT = Number(process.argv[2] ?? 100);
const CONCURRENCY = Number(process.env.QA_CONCURRENCY ?? 6);

const admin = new Api({ ip: '10.251.0.1' });
await assertSafeTarget();
await admin.login('admin', 'admin');
const masters = await (async () => {
  const a = new Api({ ip: '10.251.0.2' });
  await a.login('anuj@aajiveka.com', 'anuj@aajiveka.com');
  return (await a.get('/clients/masters', { expect: 200 })).data;
})();
const byLabel = (list, l) => list.find((x) => x.label.toLowerCase() === l.toLowerCase());
const cities = CITY_NAMES.map((c) => byLabel(masters.cities, c)).filter(Boolean);
const EMP = Object.fromEntries(masters.employmentTypes.map((e) => [e.label, e.id]));
const WM = Object.fromEntries(masters.workModes.map((e) => [e.label, e.id]));
// Brief's work arrangements → master. "On-site" is the legacy "In-office".
const WORK_MODES = [WM['In-office'], WM.Hybrid, WM.Remote, WM['Work From Home'], WM['Work From Office']].filter(Boolean);

const CTC = { fresher: [250000, 500000], mid: [600000, 1400000], senior: [1500000, 3500000] };
function jobPayload(r, role, emp, j) {
  const level = pick(r, ['fresher', 'mid', 'mid', 'senior']);
  const exp = level === 'fresher' ? [0, 1] : level === 'mid' ? [2, 5] : [6, 12];
  const [lo, hi] = CTC[level];
  const minCtc = int(r, lo / 50000, (lo + hi) / 100000) * 50000;
  const empType = j % 9 === 0 ? EMP.Internship : j % 7 === 0 ? EMP.Contract : j % 5 === 0 ? EMP['Part Time'] : EMP['Full Time'];
  const isIntern = empType === EMP.Internship;
  const title = role.aliasOf ?? role.designation;
  return {
    designationId: byLabel(masters.designations, role.designation).id,
    employmentTypeId: empType,
    workModeId: WORK_MODES[j % WORK_MODES.length],
    cityId: pick(r, emp.jobCities).id,
    industryTypeId: emp.industryTypeId,
    minCtc: isIntern ? 120000 : minCtc,
    maxCtc: isIntern ? 240000 : minCtc + int(r, 2, 10) * 50000,
    minExp: isIntern ? 0 : exp[0],
    maxExp: isIntern ? 0 : exp[1],
    openings: int(r, 1, 8),
    description: `${emp.companyName} is hiring a ${title} (${level}). Fictional QA job posting.`,
    candidateProfile: `${exp[0]}-${exp[1]} years as ${title}; strong ${role.skills.slice(0, 3).join(', ')}.`,
    keyResponsibilities: [`Own ${title.toLowerCase()} deliverables end to end`, `Work with ${pick(r, ['product', 'operations', 'sales', 'engineering'])} stakeholders`, 'Document and review work', 'Mentor juniors where relevant'].join('\n'),
    preferredQualifications: role.tech ? 'B.Tech / B.E. / BCA / MCA' : 'B.Com / BBA / MBA',
    skills: role.skills.slice(0, int(r, 3, role.skills.length)),
    educationDetail: role.tech ? 'Graduate in Computer Science or related field' : 'Any graduate',
    reportTo: pick(r, ['Engineering Manager', 'Team Lead', 'Head of Operations', 'Director']),
    teamSize: int(r, 3, 25),
    department: role.tech ? 'Engineering' : pick(r, ['Operations', 'Finance', 'Sales', 'People']),
    subDepartment: title,
    interviewProcess: [
      { round: 1, process: 'Screening call', mode: 'Telephonic' },
      { round: 2, process: 'Technical / functional interview', mode: 'Video call' },
      { round: 3, process: 'Final interview', mode: 'Face to face' },
    ],
  };
}

async function createEmployer(i) {
  const r = rng(50_000 + i);
  const group = INDUSTRIES[i % INDUSTRIES.length];
  const n = String(i + 1).padStart(3, '0');
  const name = companyName(i, group.name);
  const city = pick(r, cities);
  const industry = byLabel(masters.industryTypes, group.industry);
  const hr = personName(r);
  const slug = name.toLowerCase().replace(/\(qa\)|pvt ltd/g, '').trim().replace(/[^a-z0-9]+/g, '-');
  const emp = {
    i, n, companyName: name, industryGroup: group.name, industryTypeId: industry.id,
    emailCompany: `qa.emp.${n}@example.com`, emailHR: `qa.emp.${n}.hr@example.com`,
    phone: `8${String(100000000 + i * 2).padStart(9, '0')}`, hrPhone: `8${String(100000001 + i * 2).padStart(9, '0')}`,
    hrName: hr.fullName, city, website: `https://${slug}.example.com`,
    jobCities: [city, ...sample(r, cities, 2)],
  };
  const pub = new Api({ ip: ipFor(20_000 + i) });
  const reg = await pub.post('/auth/register-employer', {
    companyName: name, emailCompany: emp.emailCompany, emailHR: emp.emailHR, contactNumberCompany: emp.phone, contactNumberHR: emp.hrPhone,
    location: city.label, aboutCompany: `${name} operates in ${group.name}. Fictional company created for QA.`, industryType: group.industry, website: emp.website,
  }, { expect: 201 });
  await admin.post(`/admin/employer-registrations/${reg.data.id}/review`, { decision: 'Approved', cityId: city.id, notes: 'QA bulk approval — verification documents are test data' }, { expect: [200, 201] });
  const temp = await tempPasswordFromLog(emp.emailCompany);

  const api = new Api({ ip: ipFor(21_000 + i) });
  await api.login(emp.emailCompany, temp);
  await api.patch('/clients/me', {
    clientName: name, email: emp.emailCompany, contactNo: emp.phone, hrEmail: emp.emailHR, hrContactNo: emp.hrPhone, hrContactName: emp.hrName,
    website: emp.website, address: `${int(r, 1, 99)}, ${pick(r, ['Tech Park', 'Business Bay', 'Trade Centre', 'Corporate Avenue'])}, ${city.label}`,
    description: `${name} is a ${group.name.toLowerCase()} company headquartered in ${city.label}. This profile is fictional QA data.`,
    cityId: city.id, industryTypeId: industry.id,
  }, { expect: 200 });
  const logo = await api.upload('/clients/me/logo', 'file', png(128, colour(r), colour(r)), 'logo.png', 'image/png');
  if (logo.status >= 300) throw new Error(`logo upload ${logo.status} ${JSON.stringify(logo.data)}`);

  // 3–6 jobs per employer from its industry's roles; every 11th job is saved as a draft.
  const jobs = [];
  const nJobs = int(r, 3, 6);
  for (let j = 0; j < nJobs; j++) {
    const role = roleByKey[group.roles[(i + j) % group.roles.length]];
    const g = i * 10 + j;
    const body = jobPayload(r, role, emp, g);
    const draft = g % 11 === 0;
    const res = await api.post('/clients/me/jobs', body, { query: draft ? { draft: 'true' } : undefined, expect: [200, 201] });
    jobs.push({ jobId: Number(res.data.jobId ?? res.data.id ?? res.data.JobID), role: role.key, designation: role.designation, draft, ...body, skills: body.skills });
  }
  const me = (await api.get('/clients/me', { expect: 200 })).data;
  return { ...emp, city: city.id, jobCities: emp.jobCities.map((c) => c.id), password: temp, clientId: me.clientId ?? me.clientID ?? me.id, jobs };
}

const t0 = Date.now();
const res = await pool(Array.from({ length: COUNT }, (_, i) => i), CONCURRENCY, createEmployer, (d, t) => console.log(`  employers ${d}/${t}`));
const ok = res.filter((x) => x.ok).map((x) => x.value);
const failed = res.map((x, i) => (!x.ok ? { i, error: x.error } : null)).filter(Boolean);
writeFileSync(`${STATE_DIR}/employers.json`, JSON.stringify(ok, null, 1));
writeFileSync(`${STATE_DIR}/employers-failed.json`, JSON.stringify(failed, null, 1));
console.log(`created ${ok.length}/${COUNT} employers, ${ok.reduce((s, e) => s + e.jobs.length, 0)} jobs in ${((Date.now() - t0) / 1000).toFixed(0)}s; ${failed.length} failed`);
for (const f of failed.slice(0, 10)) console.log('  FAIL', f.i, f.error);
