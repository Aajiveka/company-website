// Creates N candidates through the real API: register → email OTP (devCode, non-production
// only) → every profile section the editor offers → resume + photo → complete onboarding.
//
//   QA_API_URL=http://localhost:4100/api node tests/qa/seed-candidates.mjs [count=1000]
import { mkdirSync, writeFileSync } from 'node:fs';
import { Api, assertSafeTarget, ipFor, pool, STATE_DIR } from './lib/client.mjs';
import { BANDS, CITY_NAMES, ROLES, colour, int, personName, pick, png, resumePdf, rng, sample } from './lib/fixtures.mjs';

const COUNT = Number(process.argv[2] ?? 1000);
const CONCURRENCY = Number(process.env.QA_CONCURRENCY ?? 8);
const PASSWORD = 'QaCandidate#2026';

const SUBFUNCTION = { frontend: 1555, react: 1555, backend: 1546, node: 1546, fullstack: 1556, mern: 1556, java: 1543, python: 1543, dataanalyst: 1448, datascientist: 1454, uiux: 537, tester: 1530, qa: 1525, devops: 1516, cloud: 648, pm: 442, hr: 247, digital: 319, sales: 497, accountant: 176, ba: 1447, support: 173, ops: 124, content: 680 };
const DEGREE_FOR = (role) => (role.tech ? ['B.Tech', 'B.E.', 'BCA', 'B.Sc.', 'MCA', 'M.Tech'] : ['B.Com.', 'BBA', 'B.A.', 'MBA', 'M.Com.', 'BMS']);
const UNIVERSITIES = ['Deccan Institute of Technology', 'Western Ghats University', 'Coastal College of Engineering', 'Northern Plains University', 'Riverside College of Commerce', 'Sahyadri Institute of Management', 'Eastern Hills University', 'Central Valley Institute of Science'];
const EMPLOYERS = ['Brightpath Systems', 'Coralwave Technologies', 'Silverline Retail', 'Greenfield Services', 'Bluecrest Analytics', 'Northstar Logistics', 'Ambertree Media', 'Ironbridge Infra'];

async function masters() {
  const api = new Api({ ip: '10.250.0.1' });
  await api.login('anuj', 'anuj');
  const m = (await api.get('/candidates/me/cv-masters', { expect: 200 })).data;
  const byLabel = (list, label) => list.find((x) => x.label.toLowerCase() === label.toLowerCase());
  const cities = CITY_NAMES.map((c) => byLabel(m.cities, c)).filter(Boolean);
  return { m, cities, byLabel };
}

function plan(i, M) {
  const r = rng(1000 + i);
  let acc = 0;
  const band = BANDS.find((b) => (acc += b.n) > i % 1000) ?? BANDS.at(-1);
  // Not i % 24: subscriptions are keyed on i % 4, and 4 divides 24, so five roles would never
  // have had a subscribed candidate. Adding ⌊i/4⌋ (5k+r) walks every role within each i % 4 class.
  const role = ROLES[(i + Math.floor(i / 4)) % ROLES.length];
  const { fullName, gender } = personName(r);
  const n = String(i + 1).padStart(4, '0');
  const city = pick(r, M.cities);
  const exp = int(r, band.exp[0], band.exp[1]);
  const isWorking = band.key === 'fresher' ? false : band.key === 'intern' ? r() < 0.5 : r() < 0.72;
  const notice = !isWorking ? 0 : pick(r, [0, 15, 30, 30, 60, 60, 90]);
  return {
    i, n, r, band: band.key, role, fullName, gender, city,
    email: `qa.cand.${n}@example.com`,
    mobile: `7${String(300000000 + i).padStart(9, '0')}`,
    exp, expMonths: band.months ? int(r, 3, 11) : int(r, 0, 11),
    ctc: band.ctc[1] ? int(r, band.ctc[0] / 10000, band.ctc[1] / 10000) * 10000 : 0,
    isWorking,
    notice,
    careerGap: band.exp[0] >= 2 && r() < 0.12,
    remoteOnly: r() < 0.15,
    relocate: r() < 0.45,
    withResume: r() < 0.9,
    withPhoto: r() < 0.6,
    full: r() < 0.7, // fills every optional section; the rest stop at the mandatory ones
    keySkillsOnly: r() < 0.08, // key skills but no IT-skill rows — tests what matching reads
  };
}

async function createCandidate(p, M) {
  const { r, role } = p;
  const api = new Api({ ip: ipFor(p.i + 1) });
  const reg = await api.post('/auth/register', { fullName: p.fullName, email: p.email, mobile: p.mobile, password: PASSWORD, countryCode: '+91' }, { expect: 201 });
  if (!reg.data.devCode) throw new Error('register returned no devCode — is the API in production mode?');
  const v = await api.post('/auth/verify-otp', { registrationToken: reg.data.registrationToken, code: reg.data.devCode }, { expect: [200, 201] });
  api.token = v.data.accessToken;

  const year = 2026;
  const dob = `${year - 21 - p.exp - int(r, 0, 3)}-${String(int(r, 1, 12)).padStart(2, '0')}-${String(int(r, 1, 28)).padStart(2, '0')}`;
  await api.put('/candidates/me/personal', { fullName: p.fullName, email: p.email, mobile: p.mobile, dob, gender: p.gender, address: `${int(r, 1, 300)}, ${pick(r, ['MG Road', 'Station Road', 'Lake View Layout', 'Park Street', 'Ring Road'])}, ${p.city.label}`, cityId: p.city.id }, { expect: 200 });

  const prefCities = sample(r, M.cities, p.relocate ? 3 : 1).map((c) => c.id);
  if (!prefCities.includes(p.city.id)) prefCities.unshift(p.city.id);
  const industryIds = M.m.industries.map((x) => x.id);
  await api.put('/candidates/me/professional', {
    subFunctionId: SUBFUNCTION[role.key],
    totalExp: p.exp, totalExpMonths: p.expMonths, currentCtc: p.ctc, currentCityId: p.city.id,
    flgReadyToRelocate: p.relocate, noticePeriod: p.notice,
    industryTypeId: pick(r, industryIds), preferredCityIds: prefCities,
  }, { expect: 200 });

  // Education: graduation always; 12th for most; a PG for some of the experienced.
  const gradYear = year - p.exp - (p.band === 'fresher' || p.band === 'intern' ? 0 : 1);
  const degLabel = pick(r, DEGREE_FOR(role).slice(0, 4));
  const deg = M.byLabel(M.m.degrees, degLabel);
  const courses = M.m.courses.filter((c) => c.degreeId === deg.id);
  const marks = r() < 0.5 ? `${(int(r, 600, 960) / 100).toFixed(1)} CGPA` : String(int(r, 55, 94));
  await api.put('/candidates/me/education', { degreeId: deg.id, courseTypeId: courses.length ? pick(r, courses).id : undefined, instituteName: pick(r, UNIVERSITIES), startYear: gradYear - (degLabel.startsWith('B.Tech') || degLabel === 'B.E.' ? 4 : 3), passingYear: gradYear, courseMode: 'Full Time', marks }, { expect: 200 });
  if (p.full) {
    const twelfth = M.byLabel(M.m.degrees, '12th');
    await api.put('/candidates/me/education', { degreeId: twelfth.id, instituteName: `${pick(r, ['Kendriya', 'Sunrise', 'Holy Cross', 'Modern'])} Senior Secondary School`, passingYear: gradYear - 4, marks: String(int(r, 60, 96)), courseMode: 'Full Time' }, { expect: 200 });
    if (p.exp >= 5 && r() < 0.4) {
      const pg = M.byLabel(M.m.degrees, role.tech ? 'M.Tech' : 'MBA');
      await api.put('/candidates/me/education', { degreeId: pg.id, instituteName: pick(r, UNIVERSITIES), startYear: gradYear + 1, passingYear: gradYear + 3, courseMode: pick(r, ['Full Time', 'Part Time', 'Distance']), marks: String(int(r, 60, 90)) }, { expect: 200 });
    }
  }

  // Employment history
  const designation = M.byLabel(M.m.designations, role.designation);
  const empTypes = Object.fromEntries(M.m.employmentTypes.map((e) => [e.label, e.id]));
  if (p.band === 'intern') {
    await api.put('/candidates/me/employment', { employer: pick(r, EMPLOYERS), designationName: `${role.designation} Intern`, employeeTypeId: empTypes.Internship, joiningDate: '2026-01-05', ...(p.isWorking ? { flgCurrent: true } : { releavingDate: '2026-06-30' }), salary: int(r, 8, 20) * 1000, jobDescr: `Internship on the ${role.designation.toLowerCase()} team.` }, { expect: 200 });
  } else if (p.band !== 'fresher') {
    const jobs = Math.min(1 + Math.floor(p.exp / 3), 3);
    let end = p.careerGap ? new Date(Date.UTC(2025, int(r, 0, 9), 1)) : new Date(Date.UTC(2026, 9, 1));
    const totalMonths = p.exp * 12 + p.expMonths;
    for (let j = 0; j < jobs; j++) {
      const months = Math.max(3, Math.floor(totalMonths / jobs));
      const start = new Date(end); start.setUTCMonth(start.getUTCMonth() - months);
      const current = j === 0 && p.isWorking && !p.careerGap;
      await api.put('/candidates/me/employment', {
        employer: pick(r, EMPLOYERS), designationId: designation?.id, employeeTypeId: empTypes['Full Time'],
        joiningDate: start.toISOString().slice(0, 10), ...(current ? { flgCurrent: true, noticePeriodDays: p.notice } : { releavingDate: end.toISOString().slice(0, 10) }),
        salary: Math.round((p.ctc || 300000) * (1 - j * 0.25)), jobDescr: `Worked as ${role.designation} on customer-facing projects.`,
      }, { expect: 200 });
      end = new Date(start); end.setUTCMonth(end.getUTCMonth() - 1);
    }
  }

  const skills = sample(r, role.skills, Math.min(role.skills.length, int(r, 3, 6)));
  await api.put('/candidates/me/key-skills', { tagNames: skills }, { expect: 200 });
  if (!p.keySkillsOnly) {
    for (const s of skills.slice(0, 4)) await api.put('/candidates/me/it-skills', { skillName: s, expYears: Math.min(p.exp, int(r, 0, 6)), expMonths: int(r, 0, 11), lastUsedYear: 2026 }, { expect: 200 });
  }
  await api.put('/candidates/me/headline', { resumeHeadline: `${p.band === 'fresher' ? 'Aspiring' : p.exp >= 8 ? 'Senior' : ''} ${role.aliasOf ?? role.designation} | ${skills.slice(0, 3).join(', ')}`.trim() }, { expect: 200 });

  if (p.full) {
    await api.put('/candidates/me/summary', { profileSummary: `${p.fullName} is a ${role.aliasOf ?? role.designation} with ${p.exp} years of experience in ${skills.join(', ')}. Fictional QA profile.` }, { expect: 200 });
    await api.put('/candidates/me/career-profile', {
      desiredJobType: p.band === 'intern' ? ['Contractual'] : ['Permanent'],
      desiredEmploymentType: r() < 0.85 ? ['Full Time'] : ['Full Time', 'Part Time'],
      preferredShift: pick(r, ['Day', 'Day', 'Flexible', 'Night']),
      preferredWorkModes: p.remoteOnly ? ['Remote'] : sample(r, ['Remote', 'Hybrid', 'On-site'], int(r, 1, 3)),
      preferredSalary: Math.round(Math.max(p.ctc, 250000) * (1.15 + r() * 0.3) / 10000) * 10000,
      preferredJobRoles: [role.aliasOf ?? role.designation], preferredCityIds: prefCities,
    }, { expect: 200 });
    await api.put('/candidates/me/personal-details', { maritalStatus: pick(r, ['Single / unmarried', 'Married']), category: pick(r, ['General', 'OBC', 'SC', 'ST', 'EWS']), workPermitCountries: ['India'] }, { expect: 200 });
    await api.put('/candidates/me/diversity', p.careerGap
      ? { disabilityStatus: 'Do not have disability', militaryStatus: 'Not applicable', careerBreakStatus: 'Have taken', careerBreakReason: pick(r, ['Higher studies', 'Family care', 'Health', 'Relocation']), careerBreakFrom: '2025-11-01', careerBreakTo: '2026-09-30' }
      : { disabilityStatus: 'Do not have disability', militaryStatus: 'Not applicable', careerBreakStatus: 'Have not taken' }, { expect: 200 });
    await api.put('/candidates/me/languages', { languageName: 'English', proficiencyId: pick(r, [2, 3]), canRead: true, canWrite: true, canSpeak: true }, { expect: 200 });
    await api.put('/candidates/me/languages', { languageName: pick(r, ['Hindi', 'Marathi', 'Tamil', 'Kannada', 'Telugu', 'Bengali']), proficiencyId: 3, canRead: true, canWrite: r() < 0.7, canSpeak: true }, { expect: 200 });
    await api.put('/candidates/me/projects', { title: `${pick(r, ['Inventory', 'Payments', 'Booking', 'Analytics', 'Helpdesk'])} ${pick(r, ['Portal', 'Dashboard', 'Platform', 'App'])}`, clientName: pick(r, EMPLOYERS), projectStatus: 'Finished', workedFromMonth: 1, workedFromYear: 2025, workedTillMonth: 8, workedTillYear: 2025, projectSite: 'Offsite', natureOfEmployment: 'Full Time', teamSize: int(r, 2, 12), roleDescr: `${role.designation} — owned delivery`, skillsUsed: skills.slice(0, 3), details: 'Fictional QA project.' }, { expect: 200 });
    if (r() < 0.5) await api.put('/candidates/me/certificates', { certificateName: `${pick(r, skills)} Practitioner Certificate`, certificationId: `QA-${p.n}`, validFromMonth: 3, validFromYear: 2025, neverExpires: true }, { expect: 200 });
    await api.put('/candidates/me/accomplishments', { kind: 'ONLINE_PROFILE', title: 'Portfolio', url: `https://portfolio.example.com/qa-${p.n}` }, { expect: 200 });
  }

  if (p.withResume) {
    const pdf = resumePdf([p.fullName, `${role.aliasOf ?? role.designation} - ${p.exp} yrs`, `Skills: ${skills.join(', ')}`, `Email: ${p.email}`, 'Fictional QA resume']);
    await api.upload('/files/resume', 'file', pdf, `${p.fullName.replace(/\W+/g, '_')}_Resume.pdf`, 'application/pdf').then((x) => { if (x.status >= 300) throw new Error(`resume upload ${x.status} ${JSON.stringify(x.data)}`); });
  }
  if (p.withPhoto) {
    await api.upload('/files/avatar', 'file', png(96, colour(r), colour(r)), 'photo.png', 'image/png').then((x) => { if (x.status >= 300) throw new Error(`avatar upload ${x.status} ${JSON.stringify(x.data)}`); });
  }
  await api.post('/candidates/me/complete-onboarding', {}, { expect: [200, 201] });
  const dash = (await api.get('/candidates/me/dashboard', { expect: 200 })).data;
  const me = (await api.get('/auth/me', { expect: 200 })).data;

  return {
    i: p.i, n: p.n, email: p.email, mobile: p.mobile, password: PASSWORD, userId: me.userId, fullName: p.fullName,
    band: p.band, role: role.key, designation: role.designation, cityId: p.city.id, prefCities, exp: p.exp, ctc: p.ctc,
    notice: p.notice, isWorking: p.isWorking, careerGap: p.careerGap, remoteOnly: p.remoteOnly, relocate: p.relocate,
    withResume: p.withResume, withPhoto: p.withPhoto, full: p.full, keySkillsOnly: p.keySkillsOnly, skills,
    profileCompletion: dash.profileCompletion, slowestMs: Math.round(Math.max(...api.calls.map((c) => c.ms))), calls: api.calls.length,
  };
}

await assertSafeTarget();
mkdirSync(STATE_DIR, { recursive: true });
const M = await masters();
const t0 = Date.now();
const plans = Array.from({ length: COUNT }, (_, i) => plan(i, M));
const res = await pool(plans, CONCURRENCY, (p) => createCandidate(p, M), (d, t) => console.log(`  candidates ${d}/${t}  ${((Date.now() - t0) / 1000).toFixed(0)}s`));
const ok = res.filter((x) => x.ok).map((x) => x.value);
const failed = res.map((x, i) => (!x.ok ? { i, email: plans[i].email, error: x.error } : null)).filter(Boolean);
writeFileSync(`${STATE_DIR}/candidates.json`, JSON.stringify(ok, null, 1));
writeFileSync(`${STATE_DIR}/candidates-failed.json`, JSON.stringify(failed, null, 1));
console.log(`created ${ok.length}/${COUNT} candidates in ${((Date.now() - t0) / 1000).toFixed(0)}s; ${failed.length} failed`);
for (const f of failed.slice(0, 10)) console.log('  FAIL', f.email, f.error);
