// Workflow, lifecycle, matching, security and data-integrity checks against the REAL API and
// the QA database. Each case records PASS / FAIL / N/A (feature not implemented) with evidence.
//
//   QA_API_LOG=… QA_DATABASE_URL=… node tests/qa/workflows.mjs [--only=candidate,employer,…]
import { readFileSync, writeFileSync } from 'node:fs';
import pg from 'pg';
import { Api, assertSafeTarget, ipFor, STATE_DIR, tempPasswordFromLog, API_LOG } from './lib/client.mjs';
import { png, resumePdf } from './lib/fixtures.mjs';

const DB = process.env.QA_DATABASE_URL;
if (!DB || !/aajiveka_qa/.test(DB)) throw new Error('QA_DATABASE_URL must point at aajiveka_qa');
await assertSafeTarget();
const db = new pg.Client({ connectionString: DB });
await db.connect();
const q = async (sql, args = []) => (await db.query(sql, args)).rows;

const only = (process.argv.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean);
const candidates = JSON.parse(readFileSync(`${STATE_DIR}/candidates.json`, 'utf8'));
const employers = JSON.parse(readFileSync(`${STATE_DIR}/employers.json`, 'utf8'));
const applications = JSON.parse(readFileSync(`${STATE_DIR}/applications.json`, 'utf8'));

const results = [];
let ipSeq = 60_000;
const fresh = () => new Api({ ip: ipFor(ipSeq++) });
class NA extends Error {}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
const eq = (a, b, msg) => expect(a === b, `${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
async function test(module, name, fn) {
  if (only.length && !only.includes(module)) return;
  const t0 = performance.now();
  try {
    const note = await fn();
    results.push({ module, name, status: 'PASS', note: note ?? '', ms: Math.round(performance.now() - t0) });
  } catch (e) {
    results.push({ module, name, status: e instanceof NA ? 'N/A' : 'FAIL', note: e.message.slice(0, 400), ms: Math.round(performance.now() - t0) });
  }
  const r = results.at(-1);
  console.log(`${r.status.padEnd(4)} [${module}] ${name}${r.note ? ' — ' + r.note.slice(0, 160) : ''}`);
}
const login = async (u, p) => { const a = fresh(); await a.login(u, p); return a; };
const asCand = (c) => login(c.email, c.password);
const asEmp = (e) => login(e.emailCompany, e.password);
const staff = {};
for (const u of ['admin', 'qc1', 'qc2', 'q3']) staff[u] = await login(u, u);

const subscribedCand = candidates.filter((c) => c.i % 4 !== 3);
// Masters by label — ids differ between databases (see the seed fix for tblMstrWorkMode & co.).
const M = await (async () => { const a = await asEmp(employers[0]); const m = (await a.get('/clients/masters', { expect: 200 })).data; const c = await asCand(candidates[0]); const cv = (await c.get('/candidates/me/cv-masters', { expect: 200 })).data; return { ...m, cv }; })();
const id = (list, label) => { const x = list.find((r) => r.label.toLowerCase() === label.toLowerCase()); if (!x) throw new Error(`master "${label}" missing`); return x.id; };
const DES = (l) => id(M.designations, l), EMPT = (l) => id(M.employmentTypes, l), WMD = (l) => id(M.workModes, l), CITY = (l) => id(M.cities, l), IND = (l) => id(M.industryTypes, l);
const SUBFN = (l) => id(M.cv.subFunctions, l), DEG = (l) => id(M.cv.degrees, l);
const mkSlots = (days = 2) => [0, 1, 2].map((k) => new Date(Date.now() + (days + k) * 864e5 + 3 * 36e5).toISOString());
const backdateRound = (roundId) => q(`UPDATE "tblInterviewRound" SET "ScheduledAt" = (now() AT TIME ZONE 'UTC') - interval '2 hours' WHERE "InterviewRoundID" = $1`, [roundId]);
let seq = Date.now() % 100000;
const newMobile = () => `6${String(900000000 + (seq++ % 99999999)).padStart(9, '0')}`;

/* ======================================================================================== */
/* 4. Candidate workflow                                                                    */
/* ======================================================================================== */
const PW = 'QaCandidate#2026';
let probe = null; // a candidate registered by this run

await test('candidate', 'Registration rejects invalid email / invalid mobile / short password / missing fields', async () => {
  const a = fresh();
  const base = { fullName: 'Validation Probe', email: 'v.probe@example.com', mobile: newMobile(), password: PW, countryCode: '+91' };
  const cases = [
    [{ ...base, email: 'not-an-email' }, 'invalid email'],
    [{ ...base, mobile: '1234567890' }, 'mobile not 6-9'],
    [{ ...base, mobile: '98765' }, 'mobile too short for +91'],
    [{ ...base, password: 'short' }, 'password < 8'],
    [{ email: base.email }, 'missing fields'],
    [{ ...base, fullName: 'x'.repeat(101) }, 'name > 100'],
    [{ ...base, extra: 1 }, 'unknown field'],
  ];
  const bad = [];
  for (const [body, label] of cases) { const r = await fresh().post('/auth/register', body, { retries: 0 }); if (r.status !== 400) bad.push(`${label}→${r.status}`); }
  expect(!bad.length, bad.join(', '));
  return `${cases.length} invalid payloads → 400`;
});

await test('candidate', 'Duplicate registration (email, mobile) is refused with 409', async () => {
  const c = candidates[0];
  const r1 = await fresh().post('/auth/register', { fullName: 'Dup', email: c.email, mobile: newMobile(), password: PW });
  const r2 = await fresh().post('/auth/register', { fullName: 'Dup', email: `dup.${seq}@example.com`, mobile: c.mobile, password: PW });
  eq(r1.status, 409, 'duplicate email'); eq(r2.status, 409, 'duplicate mobile');
});

await test('candidate', 'Email OTP: wrong code rejected with attempts remaining; correct code creates the account', async () => {
  const a = fresh();
  const body = { fullName: 'Otp Probe', email: `otp.probe.${seq}@example.com`, mobile: newMobile(), password: PW, countryCode: '+91' };
  const reg = await a.post('/auth/register', body, { expect: 201 });
  const wrong = String((Number(reg.data.devCode) + 1) % 1000000).padStart(6, '0');
  const w = await a.post('/auth/verify-otp', { registrationToken: reg.data.registrationToken, code: wrong });
  eq(w.status, 400, 'wrong code');
  const resend = await fresh().post('/auth/resend-otp', { registrationToken: reg.data.registrationToken }, { retries: 0 });
  const ok = await a.post('/auth/verify-otp', { registrationToken: reg.data.registrationToken, code: reg.data.devCode }, { expect: [200, 201] });
  probe = { ...body, token: ok.data.accessToken, refresh: ok.data.refreshToken };
  expect(resend.status === 429, `resend inside 60s cooldown should be 429, got ${resend.status}`);
  expect(ok.data.accessToken && ok.data.user.isOnboarded === false, 'tokens + isOnboarded:false');
  const reuse = await a.post('/auth/verify-otp', { registrationToken: reg.data.registrationToken, code: reg.data.devCode });
  expect(reuse.status >= 400, `re-using a consumed OTP must fail, got ${reuse.status}`);
  return `wrong→400 (${JSON.stringify(w.data.attemptsRemaining ?? w.data.message).slice(0, 40)}), resend→429, verify→ok, reuse→${reuse.status}`;
});

await test('candidate', 'Login by email and by mobile; wrong password 401; /auth/me matches', async () => {
  const c = candidates[1];
  const a = await asCand(c);
  const me = await a.get('/auth/me', { expect: 200 });
  eq(me.data.roleId, 1, 'roleId');
  const b = fresh(); await b.login(c.mobile, c.password);
  const w = await fresh().post('/auth/login', { userName: c.email, password: 'wrong-password' });
  eq(w.status, 401, 'wrong password');
});

await test('candidate', 'Refresh rotation is single-use; logout revokes the refresh token', async () => {
  const a = await asCand(candidates[2]);
  const r1 = await a.post('/auth/refresh', { refreshToken: a.refreshToken });
  eq(r1.status, 200, 'first refresh');
  const reuse = await a.post('/auth/refresh', { refreshToken: a.refreshToken });
  eq(reuse.status, 401, 'old refresh token reuse');
  await a.post('/auth/logout', { refreshToken: r1.data.refreshToken });
  const after = await a.post('/auth/refresh', { refreshToken: r1.data.refreshToken });
  eq(after.status, 401, 'refresh after logout');
});

await test('candidate', 'Access token still works after logout (known S-05: not revocable for its 15 min TTL)', async () => {
  const a = await asCand(candidates[3]);
  await a.post('/auth/logout', { refreshToken: a.refreshToken });
  const r = await a.get('/candidates/me');
  expect(r.status === 401, `after logout the access token still returns ${r.status} (session not revoked)`);
});

await test('candidate', 'Forgot password → reset link (logged) → reset → login with new password; link single-use', async () => {
  const c = candidates[4];
  const a = fresh();
  const r = await a.post('/auth/forgot-password', { userName: c.mobile }, { expect: [200, 201] });
  await new Promise((s) => setTimeout(s, 800));
  const log = readFileSync(API_LOG, 'utf8');
  const m = [...log.matchAll(/reset-password\?token=([a-f0-9]{64})/g)].at(-1);
  expect(m, 'no reset link in the API log');
  const token = decodeURIComponent(m[1]);
  await a.post('/auth/reset-password', { token, newPassword: 'QaReset#2026' }, { expect: [200, 201] });
  await fresh().login(c.mobile, 'QaReset#2026');
  const again = await a.post('/auth/reset-password', { token, newPassword: 'QaReset#2027' });
  expect(again.status === 400, `re-used reset token → ${again.status}`);
  await a.post('/auth/reset-password', { token: 'x', newPassword: 'whatever1' }).then((x) => expect(x.status === 400, 'bogus token'));
  // restore so later cases can log in
  const b = await login(c.mobile, 'QaReset#2026');
  await b.post('/candidates/me/change-password', { currentPassword: 'QaReset#2026', newPassword: c.password }, { expect: [200, 201] });
  return `message: ${JSON.stringify(r.data.message).slice(0, 60)}`;
});

await test('candidate', 'Forgot password by EMAIL address', async () => {
  const c = candidates[5];
  const before = readFileSync(API_LOG, 'utf8').length;
  await fresh().post('/auth/forgot-password', { userName: c.email });
  await new Promise((s) => setTimeout(s, 800));
  const added = readFileSync(API_LOG, 'utf8').slice(before);
  expect(/reset-password\?token=/.test(added), 'forgot-password with the email address sends no reset link (only username/mobile work), but the response still says a link was sent');
});

await test('candidate', 'Profile: create + edit every section and read it back', async () => {
  const a = fresh(); a.token = probe.token;
  await a.put('/candidates/me/personal', { fullName: 'Otp Probe Edited', email: probe.email, mobile: probe.mobile, dob: '1998-04-12', gender: 'F', address: '1 Test Lane', cityId: CITY('Bengaluru') }, { expect: 200 });
  await a.put('/candidates/me/professional', { subFunctionId: SUBFN('Front End Developer'), totalExp: 3, totalExpMonths: 2, currentCtc: 900000, currentCityId: CITY('Bengaluru'), flgReadyToRelocate: true, noticePeriod: 30, industryTypeId: IND('IT Services & Consulting'), preferredCityIds: [CITY('Bengaluru'), CITY('Pune')] }, { expect: 200 });
  await a.put('/candidates/me/education', { degreeId: DEG('B.Tech'), instituteName: 'Western Ghats University', startYear: 2016, passingYear: 2020, courseMode: 'Full Time', marks: '8.1 CGPA' }, { expect: 200 });
  await a.put('/candidates/me/employment', { employer: 'Brightpath Systems', designationId: DES('Frontend Developer'), employeeTypeId: EMPT('Full Time'), joiningDate: '2022-07-01', flgCurrent: true, salary: 900000, noticePeriodDays: 30 }, { expect: 200 });
  await a.put('/candidates/me/key-skills', { tagNames: ['React', 'TypeScript', 'CSS'] }, { expect: 200 });
  await a.put('/candidates/me/it-skills', { skillName: 'React', expYears: 3, expMonths: 0, lastUsedYear: 2026 }, { expect: 200 });
  await a.put('/candidates/me/headline', { resumeHeadline: 'Frontend Developer' }, { expect: 200 });
  await a.put('/candidates/me/summary', { profileSummary: 'Edited summary' }, { expect: 200 });
  const me = (await a.get('/candidates/me', { expect: 200 })).data;
  const cv = (await a.get('/candidates/me/cv-edit', { expect: 200 })).data;
  eq(me.fullName ?? cv.personal?.fullName, 'Otp Probe Edited', 'name');
  expect(JSON.stringify(me.skills ?? cv.professional?.tagNames).includes('TypeScript'), 'skills read back');
  // edit again
  await a.put('/candidates/me/headline', { resumeHeadline: 'Senior Frontend Developer' }, { expect: 200 });
  const cv2 = (await a.get('/candidates/me/cv-edit', { expect: 200 })).data;
  eq(cv2.headline, 'Senior Frontend Developer', 'headline edit');
});

await test('candidate', 'Education validation: passing year before start year, marks out of range', async () => {
  const a = fresh(); a.token = probe.token;
  const r1 = await a.put('/candidates/me/education', { degreeId: DEG('B.Tech'), startYear: 2020, passingYear: 2016 });
  const r2 = await a.put('/candidates/me/education', { degreeId: DEG('B.Tech'), marks: '140' });
  const r3 = await a.put('/candidates/me/education', { degreeId: 99999 });
  expect(r1.status === 400 && r2.status === 400 && r3.status === 400, `years→${r1.status}, marks 140→${r2.status}, unknown degree→${r3.status}`);
});

await test('candidate', 'Resume: upload, replace, download (bytes match), delete', async () => {
  const a = fresh(); a.token = probe.token;
  const v1 = resumePdf(['Version one']), v2 = resumePdf(['Version two', 'second line']);
  const u1 = await a.upload('/files/resume', 'file', v1, 'cv-v1.pdf', 'application/pdf'); expect(u1.status < 300, `upload ${u1.status}`);
  const u2 = await a.upload('/files/resume', 'file', v2, 'cv-v2.pdf', 'application/pdf'); expect(u2.status < 300, `replace ${u2.status}`);
  const d = await a.req('GET', '/files/resume', { raw: true }); eq(d.status, 200, 'download');
  expect(Buffer.compare(d.data, v2) === 0, 'downloaded file is not the replacement');
  const cv = (await a.get('/candidates/me', { expect: 200 })).data;
  eq(cv.resumeFileName, 'cv-v2.pdf', 'resume name after replace');
  const del = await a.del('/files/resume'); expect(del.status < 300, `delete ${del.status}`);
  const after = await a.req('GET', '/files/resume'); expect(after.status === 404, `download after delete → ${after.status}`);
});

await test('candidate', 'Resume: invalid formats and >10 MB are rejected', async () => {
  const a = fresh(); a.token = probe.token;
  const exe = await a.upload('/files/resume', 'file', Buffer.from('MZ\x90\x00binary'), 'tool.exe', 'application/octet-stream');
  const txt = await a.upload('/files/resume', 'file', Buffer.from('plain text'), 'cv.txt', 'text/plain');
  const fake = await a.upload('/files/resume', 'file', Buffer.from('not really a pdf'), 'cv.pdf', 'application/pdf');
  const mismatch = await a.upload('/files/resume', 'file', resumePdf(['x']), 'cv.png', 'application/pdf');
  const big = await a.upload('/files/resume', 'file', Buffer.concat([resumePdf(['big']), Buffer.alloc(10.5 * 1024 * 1024, 32)]), 'big.pdf', 'application/pdf');
  const res = { exe: exe.status, txt: txt.status, fakePdf: fake.status, extMismatch: mismatch.status, big: big.status };
  expect(exe.status >= 400 && txt.status >= 400 && mismatch.status >= 400 && big.status >= 400, JSON.stringify(res));
  expect(fake.status >= 400, `a text file named .pdf with a pdf MIME type is accepted (${fake.status}) — content is not sniffed`);
  return JSON.stringify(res);
});

await test('candidate', 'Profile completion reaches 100% for a fully-filled profile (dashboard)', async () => {
  const full = candidates.find((c) => c.full && c.withResume && c.withPhoto && c.band !== 'fresher');
  const a = await asCand(full);
  const d = (await a.get('/candidates/me/dashboard', { expect: 200 })).data;
  eq(d.profileCompletion, 100, 'profileCompletion');
});

await test('candidate', 'Profile completion: a profile missing key fields scores below 100 (API dashboard)', async () => {
  const b = fresh();
  const reg = await b.post('/auth/register', { fullName: 'Empty Profile', email: `empty.${seq}@example.com`, mobile: newMobile(), password: PW }, { expect: 201 });
  const v = await b.post('/auth/verify-otp', { registrationToken: reg.data.registrationToken, code: reg.data.devCode }, { expect: [200, 201] });
  b.token = v.data.accessToken;
  const d = (await b.get('/candidates/me/dashboard', { expect: 200 })).data;
  expect(d.profileCompletion < 100, `empty profile → ${d.profileCompletion}`);
  return `new empty profile=${d.profileCompletion}% (the portal UI computes its own weighted score — see browser suite)`;
});

await test('candidate', 'Job search: designation, location, experience, salary, skills, pagination', async () => {
  const a = fresh();
  const all = (await a.get('/jobs', { query: { pageSize: 100 }, expect: 200 })).data;
  const [active] = await q(`SELECT count(*)::int n FROM "tblClientJobs" WHERE "StatusID" = 1`);
  eq(all.total, active.n, 'total = active jobs in DB');
  const byDes = (await a.get('/jobs', { query: { designation: 'Data Analyst', pageSize: 100 } })).data;
  expect(byDes.rows.length && byDes.rows.every((r) => r.designation === 'Data Analyst'), 'designation filter');
  const byLoc = (await a.get('/jobs', { query: { location: 'Pune', pageSize: 100 } })).data;
  expect(byLoc.rows.length && byLoc.rows.every((r) => r.city === 'Pune'), `location filter: ${byLoc.rows.map((r) => r.city).slice(0, 5)}`);
  const byExp = (await a.get('/jobs', { query: { minExp: 6, pageSize: 100 } })).data;
  expect(byExp.rows.every((r) => r.minExp >= 6 || r.maxExp >= 6), 'experience filter');
  const byCtc = (await a.get('/jobs', { query: { minCtc: 2000000, pageSize: 100 } })).data;
  expect(byCtc.rows.length && byCtc.rows.every((r) => r.maxCtc >= 2000000), `salary filter: ${byCtc.rows.map((r) => r.maxCtc).slice(0, 5)}`);
  const bySkill = (await a.get('/jobs', { query: { skills: 'Kubernetes', pageSize: 100 } })).data;
  expect(bySkill.total > 0, 'skills filter returned nothing');
  const p1 = (await a.get('/jobs', { query: { page: 1, pageSize: 10 } })).data, p2 = (await a.get('/jobs', { query: { page: 2, pageSize: 10 } })).data;
  expect(p1.rows.length === 10 && !p1.rows.some((r) => p2.rows.find((s) => s.jobId === r.jobId)), 'pagination overlap');
  const big = await a.get('/jobs', { query: { pageSize: 101 } });
  return `total=${all.total}, DA=${byDes.total}, Pune=${byLoc.total}, exp≥6=${byExp.total}, ctc≥20L=${byCtc.total}, k8s=${bySkill.total}, pageSize=101→${big.status}`;
});

await test('candidate', 'Job search: multi-select filters sent the way the web app sends them (F-04)', async () => {
  const a = fresh();
  // axios default serialisation of arrays: key[]=a&key[]=b
  // The fixed web client (paramsSerializer indexes:null) sends repeated keys; the old default
  // was bracket keys, which the API rejects. The browser suite checks the page itself.
  const repeated = await a.get('/jobs?workModes=Remote&workModes=Hybrid&employmentTypes=Full%20Time&pageSize=100');
  const csv = await a.get('/jobs', { query: { workModes: 'Remote,Hybrid', employmentTypes: 'Full Time', pageSize: 5 } });
  const bracket = await a.get('/jobs?workModes[]=Remote&pageSize=5');
  expect(csv.status === 200 && repeated.status === 200, `comma→${csv.status} repeated→${repeated.status}`);
  expect(repeated.data.rows.every((r) => ['Remote', 'Work From Home', 'Hybrid'].includes(r.workMode) && r.employmentType === 'Full Time'), `filter not applied: ${[...new Set(repeated.data.rows.map((r) => r.workMode + '/' + r.employmentType))]}`);
  return `repeated keys→200 (${repeated.data.total} rows), bracket keys→${bracket.status} (old client form)`;
});

await test('candidate', 'Job search: work-mode filter finds every remote job (legacy "Work From Home" + "Remote")', async () => {
  const a = fresh();
  const remote = (await a.get('/jobs', { query: { workModes: 'Remote', pageSize: 100 } })).data;
  const [n] = await q(`SELECT count(*)::int n FROM "tblClientJobs" j JOIN "tblMstrWorkMode" w ON w."WorkModeID" = j."WorkModeID" WHERE j."StatusID" = 1 AND w."Descr" IN ('Remote', 'Work From Home')`);
  eq(remote.total, n.n, 'Remote filter (Remote + legacy Work From Home) vs DB');
  return `Remote=${remote.total}`;
});

await test('candidate', 'Full-text search (/jobs/search) and suggestions', async () => {
  const a = fresh();
  const fts = await a.get('/jobs/search', { query: { q: 'python', pageSize: 20 }, expect: 200 });
  expect(fts.data.total > 0, 'no results for "python"');
  const fts2 = await a.get('/jobs/search', { query: { q: 'Python' } });
  eq(fts2.data.total, fts.data.total, 'case sensitivity');
  const weird = await a.get('/jobs/search', { query: { q: "react & (node | ')" } });
  expect(weird.status < 500, `special characters in q → ${weird.status}`);
  const sug = await a.get('/jobs/suggestions', { query: { q: 'Dev' }, expect: 200 });
  return `python=${fts.data.total}, special chars→${weird.status}, suggestions=${JSON.stringify(sug.data).slice(0, 80)}`;
});

await test('candidate', 'Job details: active job readable; draft job is not public', async () => {
  const emp = employers.find((e) => e.jobs.some((j) => j.draft));
  const active = emp.jobs.find((j) => !j.draft), draft = emp.jobs.find((j) => j.draft);
  const a = fresh();
  const r = await a.get(`/jobs/${active.jobId}`, { expect: 200 });
  for (const k of ['designation', 'description']) expect(r.data[k] != null, `missing ${k}`);
  const d = await a.get(`/jobs/${draft.jobId}`);
  expect(d.status === 404, `draft job ${draft.jobId} is publicly readable (${d.status})`);
});

await test('candidate', 'Apply: cannot apply to a draft job', async () => {
  const c = subscribedCand[10];
  const emp = employers.find((e) => e.jobs.some((j) => j.draft));
  const a = await asCand(c);
  const r = await a.post(`/jobs/${emp.jobs.find((j) => j.draft).jobId}/apply`, { fullName: c.fullName, email: c.email, phone: c.mobile });
  eq(r.status, 404, 'apply to draft');
});

await test('candidate', 'Applied jobs list matches applications in the DB', async () => {
  const app = applications.find((x) => x.applied.length >= 2);
  const c = candidates.find((x) => x.email === app.email);
  const a = await asCand(c);
  const list = (await a.get('/candidates/me/applied-jobs', { expect: 200 })).data;
  const [n] = await q(`SELECT count(*)::int n FROM "tblJobSubscriberMapping" WHERE "SubscriberID" = $1`, [c.subscriberId]);
  eq(list.length, n.n, 'applied list length');
  expect(list.every((x) => x.status), 'every row has a status');
  const d = (await a.get('/candidates/me/dashboard')).data;
  eq(d.appliedCount, n.n, 'dashboard appliedCount');
});

await test('candidate', 'Application status history has a timestamp for every step', async () => {
  const c = candidates.find((x) => x.email === applications.find((y) => y.applied.length)?.email);
  const a = await asCand(c);
  const list = (await a.get('/candidates/me/applied-jobs', { expect: 200 })).data;
  const h = list[0].statusHistory;
  const blanks = h.filter((s) => !s.timestamp).length;
  const applied = h.filter((s) => s.status === 'Applied').length;
  expect(!blanks && applied === 1, `history=${JSON.stringify(h.map((s) => `${s.status}@${s.timestamp || '∅'}`))}`);
});

await test('candidate', 'Withdraw application', async () => { throw new NA('No withdraw endpoint or UI exists (status 13 WITHDRAWN is never written) — W-08'); });

await test('candidate', 'Saved jobs: save, list, unsave; count on dashboard', async () => {
  const app = applications.find((x) => x.saved.length);
  const c = candidates.find((x) => x.email === app.email);
  const a = await asCand(c);
  const ids = (await a.get('/candidates/me/saved-job-ids', { expect: 200 })).data;
  const list = (await a.get('/candidates/me/saved-jobs', { expect: 200 })).data;
  const arr = Array.isArray(list) ? list : list.rows ?? list.items;
  eq(arr.length, app.saved.length, 'saved list length');
  const d = (await a.get('/candidates/me/dashboard')).data;
  eq(d.savedCount, app.saved.length, 'dashboard savedCount');
  await a.del(`/candidates/me/saved-jobs/${app.saved[0]}`);
  const after = (await a.get('/candidates/me/saved-job-ids')).data;
  eq((Array.isArray(after) ? after : after.ids ?? []).length, app.saved.length - 1, 'after unsave');
  await a.post(`/candidates/me/saved-jobs/${app.saved[0]}`, {});
  return `ids=${JSON.stringify(ids).slice(0, 60)}`;
});

await test('candidate', 'Notifications: an application status change creates an in-app notification', async () => {
  const c = candidates.find((x) => x.email === applications.find((y) => y.applied.length)?.email);
  const a = await asCand(c);
  const n = await a.get('/notifications', { expect: 200 });
  const items = n.data.items ?? n.data.rows ?? n.data;
  if (!items.length) throw new NA('In-app notification store is in-memory and nothing creates notifications — always empty (documented gap)');
});

await test('candidate', 'Settings: change password (wrong current rejected), notification prefs persist all 12 fields, privacy', async () => {
  const c = candidates[6];
  const a = await asCand(c);
  const bad = await a.post('/candidates/me/change-password', { currentPassword: 'nope-nope', newPassword: 'AnotherPass#1' });
  expect(bad.status >= 400 && bad.status < 500, `wrong current → ${bad.status}`);
  const prefs = { emailAlerts: false, pushAlerts: true, smsAlerts: true, jobAlertFrequency: 'Weekly', newJobAlerts: false, weeklyJobDigest: true, profileViewAlerts: false, applicationStatusUpdates: true, recruiterMessages: false, interviewReminders: true, productUpdates: false, marketingOffers: true };
  await a.put('/candidates/me/notification-prefs', prefs, { expect: 200 });
  const got = (await a.get('/candidates/me/notification-prefs', { expect: 200 })).data;
  const lost = Object.entries(prefs).filter(([k, v]) => got[k] !== v).map(([k]) => k);
  const pv = await a.put('/candidates/me/privacy', { showCurrentEmployer: false, allowRecruiterMessages: false });
  expect(pv.status === 200, `privacy → ${pv.status}`);
  expect(!lost.length, `preferences not persisted: ${lost.join(', ')}`);
});

await test('candidate', 'Job recommendations are relevant to the candidate role', async () => {
  const c = subscribedCand.find((x) => x.role === 'python');
  const a = await asCand(c);
  const r = (await a.get('/candidates/me/recommendations', { expect: 200 })).data;
  const rows = Array.isArray(r) ? r : r.rows ?? r.items ?? [];
  const rel = rows.filter((j) => /python/i.test(j.designation ?? '')).length;
  const [avail] = await q(`SELECT count(*)::int n FROM "tblClientJobs" j JOIN "tblMstrDesignation" d ON d."DesignationID" = j."DesignationID" WHERE j."StatusID" = 1 AND d."Descr" = 'Python Developer'`);
  const k = Math.min(3, avail.n);
  expect(rows.length > 0, 'no recommendations');
  // Same-role jobs must rank first; after those run out, skill-adjacent roles follow.
  expect(rows.slice(0, k).every((j) => j.designation === 'Python Developer'), `top ${k}: ${rows.slice(0, k).map((j) => j.designation)}`);
  return `${rel}/${rows.length} are Python roles (${avail.n} exist); order: ${rows.slice(0, 6).map((j) => j.designation).join(', ')}`;
});

/* ======================================================================================== */
/* 5. Employer workflow                                                                      */
/* ======================================================================================== */
const E0 = employers[0], E1 = employers[1];

await test('employer', 'Registration validation: invalid email, duplicate pending registration', async () => {
  const a = fresh();
  const bad = await a.post('/auth/register-employer', { companyName: 'Bad Email Co', emailCompany: 'nope' });
  eq(bad.status, 400, 'invalid email');
  const dup = await fresh().post('/auth/register-employer', { companyName: E0.companyName, emailCompany: E0.emailCompany });
  expect(dup.status === 409, `duplicate of an approved company → ${dup.status}`);
});

await test('employer', 'Registration with HR email left blank (the form sends "")', async () => {
  const r = await fresh().post('/auth/register-employer', { companyName: `Blank HR QA ${seq}`, emailCompany: `blank.hr.${seq++}@example.com`, emailHR: '', contactNumberCompany: '8000000099', location: 'Pune' });
  expect(r.status === 201, `blank HR email → ${r.status} ${JSON.stringify(r.data.message ?? '')}`);
});

await test('employer', 'Verification: rejected registration creates no login; approval creates exactly one', async () => {
  const email = `reject.me.${seq++}@example.com`;
  const reg = await fresh().post('/auth/register-employer', { companyName: `Reject Me QA ${seq}`, emailCompany: email, location: 'Pune' }, { expect: 201 });
  await staff.admin.post(`/admin/employer-registrations/${reg.data.id}/review`, { decision: 'Rejected', notes: 'QA reject' }, { expect: [200, 201] });
  const [u] = await q(`SELECT count(*)::int n FROM "tblSecUser" WHERE lower("UserName") = lower($1)`, [email]);
  eq(u.n, 0, 'logins for rejected');
  const again = await staff.admin.post(`/admin/employer-registrations/${reg.data.id}/review`, { decision: 'Approved', cityId: 413 });
  eq(again.status, 409, 'approve after reject');
  const [dup] = await q(`SELECT count(*)::int n FROM (SELECT lower("UserName") FROM "tblSecUser" WHERE "RoleID" = 4 GROUP BY 1 HAVING count(*) > 1) x`);
  eq(dup.n, 0, 'duplicate employer logins');
});

await test('employer', 'Login / logout; first login with temporary password is not forced to change it (S-10)', async () => {
  const a = await asEmp(E0);
  eq(a.user.roleId, 4, 'role');
  const [u] = await q(`SELECT "PwdStatus" s FROM "tblSecUser" WHERE "UserName" = $1`, [E0.emailCompany]);
  await a.post('/auth/logout', { refreshToken: a.refreshToken });
  expect(a.user.mustChangePassword || a.user.pwdStatus === 0, `PwdStatus=${u.s} but the login response has no must-change flag — employers keep the emailed temporary password`);
});

await test('employer', 'Company profile: edit and read back all fields', async () => {
  const a = await asEmp(E1);
  const patch = { description: 'Edited by QA', hrContactName: 'Edited HR', website: 'https://edited.example.com' };
  await a.patch('/clients/me', patch, { expect: 200 });
  const me = (await a.get('/clients/me', { expect: 200 })).data;
  for (const [k, v] of Object.entries(patch)) eq(me[k], v, k);
  expect(me.logoUrl, 'logoUrl after upload');
  const logo = await fresh().req('GET', `/clients/${me.clientId}/logo`, { raw: true });
  eq(logo.status, 200, 'public logo');
});

await test('employer', 'Company profile validation: invalid email and oversize values are 400, not 500', async () => {
  const a = await asEmp(E1);
  const r1 = await a.patch('/clients/me', { email: 'not-an-email' });
  const r2 = await a.patch('/clients/me', { clientName: 'x'.repeat(5000) });
  const r3 = await a.patch('/clients/me', { cityId: 999999 });
  const res = { email: r1.status, longName: r2.status, badCity: r3.status };
  expect(Object.values(res).every((s) => s === 400), JSON.stringify(res));
});

await test('employer', 'Company profile: companyLogo cannot be pointed at another stored file (S-02)', async () => {
  const a = await asEmp(E1);
  const [cv] = await q(`SELECT "LatestCVPath" p FROM "tblSubscriberCVUploaded" WHERE "LatestCVPath" IS NOT NULL LIMIT 1`);
  const r = await a.patch('/clients/me', { companyLogo: cv.p });
  const me = (await a.get('/clients/me')).data;
  const pub = await fresh().req('GET', `/clients/${me.clientId}/logo`, { raw: true });
  // restore a real logo
  await a.upload('/clients/me/logo', 'file', png(64, [10, 120, 200], [200, 200, 20]), 'logo.png', 'image/png');
  expect(!(r.status === 200 && pub.status === 200 && pub.data.slice(0, 4).toString() === '%PDF'), `a candidate CV was served publicly from /clients/${me.clientId}/logo`);
});

let createdJob = null;
await test('employer', 'Job: required fields and range validation (min ≤ max CTC / experience)', async () => {
  const a = await asEmp(E0);
  const missing = await a.post('/clients/me/jobs', { designationId: DES('Frontend Developer') });
  eq(missing.status, 400, 'missing required');
  const ctc = await a.post('/clients/me/jobs', { designationId: DES('Frontend Developer'), employmentTypeId: EMPT('Full Time'), workModeId: WMD('In-office'), cityId: CITY('Bengaluru'), minCtc: 900000, maxCtc: 300000 }, { query: { draft: 'true' } });
  const exp = await a.post('/clients/me/jobs', { designationId: DES('Frontend Developer'), employmentTypeId: EMPT('Full Time'), workModeId: WMD('In-office'), cityId: CITY('Bengaluru'), minCtc: 300000, maxCtc: 900000, minExp: 8, maxExp: 2 }, { query: { draft: 'true' } });
  const badFk = await a.post('/clients/me/jobs', { designationId: 999999, employmentTypeId: EMPT('Full Time'), workModeId: WMD('In-office'), cityId: CITY('Bengaluru'), minCtc: 1, maxCtc: 2 }, { query: { draft: 'true' } });
  expect(ctc.status === 400 && exp.status === 400 && badFk.status === 400, `minCtc>maxCtc→${ctc.status}, minExp>maxExp→${exp.status}, unknown designation→${badFk.status}`);
});

await test('employer', 'Job lifecycle: create draft → edit → publish → appears in search → close → hidden → reopen', async () => {
  const a = await asEmp(E0);
  const body = { designationId: DES('Python Developer'), employmentTypeId: EMPT('Full Time'), workModeId: WMD('Remote'), cityId: CITY('Bengaluru'), industryTypeId: IND('IT Services & Consulting'), minCtc: 800000, maxCtc: 1600000, minExp: 2, maxExp: 6, openings: 3, description: 'Lifecycle probe job', skills: ['Python', 'Django'], department: 'Engineering' };
  const c = await a.post('/clients/me/jobs', body, { query: { draft: 'true' }, expect: [200, 201] });
  createdJob = c.data.jobId;
  const inSearch = async () => (await fresh().get('/jobs/search', { query: { q: 'Lifecycle probe', pageSize: 50 } })).data.rows?.some((r) => r.jobId === createdJob);
  const listed = async () => (await fresh().get('/jobs', { query: { designation: 'Python Developer', pageSize: 100 } })).data.rows.some((r) => r.jobId === createdJob);
  expect(!(await listed()), 'draft visible in public search');
  await a.patch(`/clients/me/jobs/${createdJob}`, { openings: 5, maxCtc: 1800000 }, { expect: 200 });
  const got = (await a.get(`/clients/me/jobs/${createdJob}`, { expect: 200 })).data;
  expect(got.openings === 5 && Number(got.maxCtc) === 1800000, `edit not saved: ${JSON.stringify({ o: got.openings, m: got.maxCtc })}`);
  await a.post(`/clients/me/jobs/${createdJob}/status`, { status: 'Active' }, { expect: [200, 201] });
  expect(await listed(), 'published job missing from search');
  await a.post(`/clients/me/jobs/${createdJob}/status`, { status: 'Closed' }, { expect: [200, 201] });
  expect(!(await listed()), 'closed job still in search');
  const c2 = subscribedCand[20];
  const ap = await (await asCand(c2)).post(`/jobs/${createdJob}/apply`, { fullName: c2.fullName, email: c2.email, phone: c2.mobile });
  eq(ap.status, 404, 'apply to closed job');
  await a.post(`/clients/me/jobs/${createdJob}/status`, { status: 'Active' }, { expect: [200, 201] });
  expect(await listed(), 'reopened job missing');
  return `fts finds it: ${await inSearch()}`;
});

await test('employer', 'Applicants: list total matches DB; filters by job, experience, notice, city, text', async () => {
  const e = employers.find((x) => x.jobs.length >= 4);
  const a = await asEmp(e);
  const list = (await a.get('/clients/me/applicants', { query: { pageSize: 100 }, expect: 200 })).data;
  const [n] = await q(`SELECT count(*)::int n FROM "tblJobSubscriberMapping" m JOIN "tblClientJobs" j ON j."JobID" = m."JobID" WHERE j."ClientID" = $1`, [e.clientId]);
  eq(list.total, n.n, 'applicant total');
  const jobId = e.jobs.find((j) => !j.draft).jobId;
  const byJob = (await a.get('/clients/me/applicants', { query: { jobId, pageSize: 100 } })).data;
  expect(byJob.items.every((x) => x.jobId === jobId), 'job filter');
  const byExp = (await a.get('/clients/me/applicants', { query: { minExp: 3, pageSize: 100 } })).data;
  expect(byExp.items.every((x) => x.totalExp >= 3), 'minExp filter');
  const byNotice = (await a.get('/clients/me/applicants', { query: { maxNotice: 15, pageSize: 100 } })).data;
  expect(byNotice.items.every((x) => x.noticePeriodDays <= 15), 'maxNotice filter');
  const name = list.items[0]?.fullName?.split(' ')[0];
  const byQ = name ? (await a.get('/clients/me/applicants', { query: { q: name, pageSize: 100 } })).data : { items: [] };
  expect(!name || byQ.items.some((x) => x.fullName.startsWith(name)), 'text search');
  return `total=${list.total}, job=${byJob.total}, exp≥3=${byExp.total}, notice≤15=${byNotice.total}`;
});

await test('employer', 'Applicant view shows the candidate skills', async () => {
  const e = employers.find((x) => applications.some((ap) => ap.applied.some((y) => x.jobs.some((j) => j.jobId === y.jobId))));
  const a = await asEmp(e);
  const list = (await a.get('/clients/me/applicants', { query: { pageSize: 50 } })).data.items;
  const withSkills = list.filter((x) => x.skills?.length).length;
  const one = list[0] && (await a.get(`/clients/me/applicants/${list[0].jobSubscriberMapId}`)).data;
  expect(withSkills > 0 && one?.skills?.length > 0, `${withSkills}/${list.length} list rows and the detail view have skills (all candidates have key skills)`);
});

await test('employer', 'Search candidates outside own applicants', async () => { throw new NA('Employers have no candidate-search endpoint; they can only browse applicants to their own jobs (by design — staff Q1/Q2 search candidates)'); });

await test('employer', 'Resume download for an applicant', async () => {
  const ap = applications.find((x) => x.applied.length && candidates.find((c) => c.email === x.email)?.withResume);
  const e = employers.find((x) => x.jobs.some((j) => j.jobId === ap.applied[0].jobId));
  const a = await asEmp(e);
  const r = await a.req('GET', `/clients/me/applicants/${ap.applied[0].mapId}/resume`, { raw: true });
  eq(r.status, 200, 'resume download');
  eq(r.data.slice(0, 4).toString(), '%PDF', 'is a PDF');
});

await test('employer', 'Shortlist → undo → reject decisions on an applicant', async () => {
  const ap = applications.find((x) => x.applied.length >= 2);
  const target = ap.applied[1];
  const e = employers.find((x) => x.jobs.some((j) => j.jobId === target.jobId));
  const a = await asEmp(e);
  await a.post(`/clients/me/applicants/${target.mapId}/decision`, { decision: 'Shortlisted' }, { expect: [200, 201] });
  let [s] = await q(`SELECT "JobMapStatusID" s FROM "tblJobSubscriberMapping" WHERE "JobSubscriberMapID" = $1`, [target.mapId]);
  eq(s.s, 2, 'shortlisted status');
  await a.post(`/clients/me/applicants/${target.mapId}/decision/undo`, {}, { expect: [200, 201] });
  await a.post(`/clients/me/applicants/${target.mapId}/decision`, { decision: 'Rejected' }, { expect: [200, 201] });
  [s] = await q(`SELECT "JobMapStatusID" s FROM "tblJobSubscriberMapping" WHERE "JobSubscriberMapID" = $1`, [target.mapId]);
  eq(s.s, 5, 'rejected status');
  const c = candidates.find((x) => x.email === ap.email);
  const seen = (await (await asCand(c)).get('/candidates/me/applied-jobs')).data.find((x) => x.jobSubscriberMapId === target.mapId);
  expect(/reject|not selected|closed/i.test(seen.status), `candidate sees "${seen.status}" after employer rejection`);
  return `candidate sees "${seen.status}"`;
});

await test('employer', 'Private notes on an applicant', async () => {
  const ap = applications.find((x) => x.applied.length);
  const e = employers.find((x) => x.jobs.some((j) => j.jobId === ap.applied[0].jobId));
  const a = await asEmp(e);
  await a.put(`/clients/me/applicants/${ap.applied[0].mapId}/notes`, { note: 'QA note: strong fundamentals' }, { expect: 200 });
  const n = (await a.get(`/clients/me/applicants/${ap.applied[0].mapId}/notes`, { expect: 200 })).data;
  expect(JSON.stringify(n).includes('strong fundamentals'), 'note read back');
});

await test('employer', 'Analytics and dashboard counts match the database', async () => {
  const e = employers.find((x) => x.jobs.length >= 5);
  const a = await asEmp(e);
  const an = (await a.get('/clients/me/analytics', { expect: 200 })).data;
  const jobs = (await a.get('/clients/me/jobs', { query: { pageSize: 100 }, expect: 200 })).data;
  const [db1] = await q(`SELECT count(*)::int n FROM "tblClientJobs" WHERE "ClientID" = $1 AND "StatusID" = 1`, [e.clientId]);
  const [db2] = await q(`SELECT count(*)::int n FROM "tblJobSubscriberMapping" m JOIN "tblClientJobs" j ON j."JobID" = m."JobID" WHERE j."ClientID" = $1`, [e.clientId]);
  const s = JSON.stringify(an);
  const activeShown = jobs.counts?.Active ?? jobs.counts?.active ?? jobs.statusCounts?.Active;
  expect(activeShown === undefined || activeShown === db1.n, `active jobs shown ${activeShown} vs DB ${db1.n}`);
  const totalApps = an.funnel?.applied ?? an.totals?.applications ?? an.summary?.totalApplicants ?? an.totalApplications;
  expect(totalApps === undefined || totalApps === db2.n, `applications shown ${totalApps} vs DB ${db2.n}: ${s.slice(0, 200)}`);
  return `active=${db1.n}, applications=${db2.n}; analytics keys: ${Object.keys(an).join(',')}`;
});

await test('employer', 'Notifications and account settings pages', async () => { throw new NA('Employer notifications, settings and change-password are placeholders — no API (documented gap)'); });

/* ======================================================================================== */
/* 7. Application lifecycle (full pipeline) + consistency between candidate and employer     */
/* ======================================================================================== */
async function statusOf(mapId) { const [r] = await q(`SELECT "JobMapStatusID" s FROM "tblJobSubscriberMapping" WHERE "JobSubscriberMapID" = $1`, [mapId]); return r?.s; }
const pipelineApps = applications.filter((x) => x.applied.length).slice(40, 52); // untouched by earlier cases
const life = [];

async function walk(ap, outcome) {
  const target = ap.applied[0];
  const mapId = target.mapId;
  const c = candidates.find((x) => x.email === ap.email);
  const e = employers.find((x) => x.jobs.some((j) => j.jobId === target.jobId));
  const ca = await asCand(c), ea = await asEmp(e);
  const steps = [];
  const snap = async (label) => {
    const cand = (await ca.get('/candidates/me/applied-jobs')).data.find((x) => x.jobSubscriberMapId === mapId);
    const emp = (await ea.get(`/clients/me/applicants/${mapId}`)).data;
    steps.push({ label, db: await statusOf(mapId), candidate: cand?.status, employer: emp?.jobStatus ?? emp?.status });
  };
  await snap('Applied');
  await staff.qc2.get(`/q2/applications/${mapId}`, { expect: 200 });
  await staff.qc2.post(`/q2/applications/${mapId}/forward`, { note: 'QA' }, { expect: [200, 201] });
  await snap('Under review (Q2→Q3)');
  const ref = (await staff.q3.get('/q3/referrals')).data.batches.flatMap((b) => b.rows).find((r) => r.mapId === mapId);
  await staff.q3.post('/q3/referrals/forward', { referralIds: [ref.referralId] }, { expect: [200, 201] });
  await snap('Sent to company');
  await staff.q3.put(`/q3/applications/${mapId}/round-setup`, { roundName: 'Round 1', interviewers: [{ name: 'Panel QA', email: 'panel.qa@example.com' }], hrName: 'HR QA', hrEmail: 'hr.qa@example.com', slots: mkSlots(), mode: 'Virtual', durationMins: 45 }, { expect: 200 });
  await snap('Shortlisted');
  let sched = (await staff.q3.get(`/q3/applications/${mapId}/scheduling`)).data;
  await staff.q3.post(`/q3/rounds/${sched.round.roundId}/confirm`, { slotId: sched.round.slots[0].slotId, meetingLink: 'https://meet.jit.si/qa', recipients: { candidate: true, interviewers: true, hr: true, q3: true } }, { expect: [200, 201] });
  await snap('Interview scheduled (R1)');
  await backdateRound(sched.round.roundId);
  await staff.q3.post(`/q3/rounds/${sched.round.roundId}/conducted`, {}, { expect: [200, 201] });
  await snap('Interview completed (R1)');
  if (outcome === 'reject') {
    await staff.q3.post(`/q3/rounds/${sched.round.roundId}/decision`, { decision: 'Rejected', sendMail: true, feedback: 'QA reject' }, { expect: [200, 201] });
    await snap('Rejected');
    return { mapId, steps };
  }
  await staff.q3.post(`/q3/rounds/${sched.round.roundId}/decision`, { decision: 'FinalRound', sendMail: false, requestSlots: false, feedback: 'QA pass' }, { expect: [200, 201] });
  const rounds = (await staff.q3.get(`/q3/applications/${mapId}/rounds`)).data;
  const finalRound = rounds.rounds.at(-1);
  await staff.q3.put(`/q3/applications/${mapId}/round-setup`, { roundId: finalRound.roundId, roundName: 'Final', interviewers: [{ name: 'Director QA' }], slots: mkSlots(4), mode: 'Face-to-Face', durationMins: 60 }, { expect: 200 });
  sched = (await staff.q3.get(`/q3/applications/${mapId}/scheduling`)).data;
  await staff.q3.post(`/q3/rounds/${sched.round.roundId}/confirm`, { slotId: sched.round.slots[1].slotId, recipients: { candidate: true, interviewers: true, hr: true, q3: true } }, { expect: [200, 201] });
  await snap('Interview scheduled (Final)');
  await backdateRound(sched.round.roundId);
  await staff.q3.post(`/q3/rounds/${sched.round.roundId}/conducted`, {}, { expect: [200, 201] });
  await staff.q3.post(`/q3/rounds/${sched.round.roundId}/decision`, { decision: 'Selected', sendMail: true, feedback: 'QA select' }, { expect: [200, 201] });
  await snap('Selected');
  if (outcome !== 'join') return { mapId, steps };
  // Documents → offer → accept → joined
  let docs = (await staff.q3.get(`/q3/applications/${mapId}/documents`)).data;
  if (!docs.documents.length) await staff.q3.post(`/q3/applications/${mapId}/documents/request`, { documentTypeIds: [1], message: 'QA docs', email: true, whatsapp: false }, { expect: [200, 201] });
  docs = (await staff.q3.get(`/q3/applications/${mapId}/documents`)).data;
  for (const d of docs.documents) {
    const up = await ca.upload(`/candidates/me/documents/${d.documentTypeId}`, 'file', resumePdf([`Doc ${d.name}`]), `${d.documentTypeId}.pdf`, 'application/pdf');
    expect(up.status < 300, `doc upload ${d.name} → ${up.status} ${JSON.stringify(up.data).slice(0, 120)}`);
  }
  docs = (await staff.q3.get(`/q3/applications/${mapId}/documents`)).data;
  for (const d of docs.documents) await staff.q3.post(`/q3/documents/${d.docUploadId}/verify`, {}, { expect: [200, 201] });
  await staff.q3.post(`/q3/applications/${mapId}/documents/forward`, {}, { expect: [200, 201] });
  await staff.q3.post(`/q3/applications/${mapId}/documents/approve`, {}, { expect: [200, 201] });
  await staff.q3.post(`/q3/applications/${mapId}/offer`, { designation: target.designation ?? 'Engineer', ctc: '12,00,000', joiningDate: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10), location: 'Bengaluru' }, { expect: [200, 201] });
  await snap('Offer sent');
  const offer = (await ca.get(`/recruitment/offers/${mapId}`, { expect: 200 })).data;
  await ca.post(`/recruitment/offers/${offer.id ?? offer.offerId}/respond`, { accept: true }, { expect: [200, 201] });
  await snap('Offer accepted');
  await staff.q3.post(`/q3/applications/${mapId}/joined`, {}, { expect: [200, 201] });
  await snap('Joined');
  return { mapId, steps };
}

const EXPECT = { Applied: 1, 'Under review (Q2→Q3)': 14, 'Sent to company': 15, Shortlisted: 2, 'Interview scheduled (R1)': 16, 'Interview completed (R1)': 6, Rejected: 5, 'Interview scheduled (Final)': 19, Selected: 4, 'Offer sent': 20, 'Offer accepted': 21, Joined: 22 };
for (const [k, outcome] of [[0, 'join'], [1, 'reject'], [2, 'select'], [3, 'join']]) {
  await test('lifecycle', `Full pipeline → ${outcome} (application ${pipelineApps[k]?.applied[0].mapId})`, async () => {
    const r = await walk(pipelineApps[k], outcome);
    life.push(r);
    const wrong = r.steps.filter((s) => EXPECT[s.label] !== undefined && s.db !== EXPECT[s.label]);
    expect(!wrong.length, `DB status mismatch: ${wrong.map((w) => `${w.label}: ${w.db}≠${EXPECT[w.label]}`).join('; ')}`);
    return r.steps.map((s) => `${s.label}=${s.db} [cand:${s.candidate} | emp:${s.employer}]`).join(' → ');
  });
}

await test('lifecycle', 'Candidate and employer see a consistent status at every step', async () => {
  const bad = [];
  for (const r of life) for (const s of r.steps) {
    const c = (s.candidate ?? '').toLowerCase(), e = (s.employer ?? '').toLowerCase();
    const key = s.label.split(' ')[0].toLowerCase().replace('under', 'review');
    if (!c || !e) bad.push(`${r.mapId}/${s.label}: missing (${s.candidate}|${s.employer})`);
    else if (/offer|joined|selected|rejected/.test(key) && !(c.includes(key.slice(0, 5)) && e.includes(key.slice(0, 5)))) bad.push(`${r.mapId}/${s.label}: cand "${s.candidate}" vs emp "${s.employer}"`);
  }
  expect(!bad.length, bad.slice(0, 6).join(' | '));
});

await test('lifecycle', 'Candidate dashboard interviewCount reflects scheduled interviews', async () => {
  const r = life[0];
  const ap = applications.find((x) => x.applied.some((y) => y.mapId === r.mapId));
  const c = candidates.find((x) => x.email === ap.email);
  const d = (await (await asCand(c)).get('/candidates/me/dashboard')).data;
  expect(d.interviewCount >= 1, `candidate attended 2 interview rounds; dashboard interviewCount=${d.interviewCount}`);
});

await test('lifecycle', 'Every transition left a status-log row; latest-status table agrees with the mapping', async () => {
  const ids = life.map((r) => r.mapId);
  const rows = await q(`SELECT m."JobSubscriberMapID" id, m."JobMapStatusID" s, (SELECT count(*)::int FROM "tblJobSubscriberStatus" x WHERE x."JobSubscriberMapID" = m."JobSubscriberMapID") logs FROM "tblJobSubscriberMapping" m WHERE m."JobSubscriberMapID" = ANY($1::bigint[])`, [ids]);
  const thin = rows.filter((r) => r.logs < 4);
  expect(!thin.length, `few log rows: ${JSON.stringify(thin)}`);
  return rows.map((r) => `${r.id}:${r.logs} logs`).join(', ');
});

await test('lifecycle', 'Out-of-order transitions are refused (409/400)', async () => {
  const ap = applications.filter((x) => x.applied.length)[60];
  const mapId = ap.applied[0].mapId;
  const r1 = await staff.q3.post(`/q3/applications/${mapId}/offer`, { designation: 'x', ctc: '1', joiningDate: '2027-01-01' });
  const r2 = await staff.q3.post(`/q3/applications/${mapId}/joined`, {});
  await staff.qc2.get(`/q2/applications/${mapId}`);
  await staff.qc2.post(`/q2/applications/${mapId}/reject`, { note: 'QA' }, { expect: [200, 201] });
  const r3 = await staff.qc2.post(`/q2/applications/${mapId}/forward`, {});
  expect([r1, r2, r3].every((r) => r.status >= 400 && r.status < 500), `offer→${r1.status} joined→${r2.status} forward-after-reject→${r3.status}`);
});

await test('lifecycle', 'Employer path: employer requests interview → Q3 confirms → employer Hire → Q3 documents/offer can proceed (W-01)', async () => {
  const ap = applications.filter((x) => x.applied.length)[70];
  const mapId = ap.applied[0].mapId;
  const e = employers.find((x) => x.jobs.some((j) => j.jobId === ap.applied[0].jobId));
  const ea = await asEmp(e);
  await staff.qc2.get(`/q2/applications/${mapId}`);
  await staff.qc2.post(`/q2/applications/${mapId}/forward`, {}, { expect: [200, 201] });
  const ref = (await staff.q3.get('/q3/referrals')).data.batches.flatMap((b) => b.rows).find((r) => r.mapId === mapId);
  await staff.q3.post('/q3/referrals/forward', { referralIds: [ref.referralId] }, { expect: [200, 201] });
  await ea.post(`/clients/me/applicants/${mapId}/interview-rounds`, { hrName: 'HR', hrEmail: 'hr.qa@example.com', interviewerName: 'Lead', interviewerEmail: 'lead.qa@example.com', mode: 'Video call', slots: mkSlots(), round: 'Final' }, { expect: [200, 201] });
  const sched = (await staff.q3.get(`/q3/applications/${mapId}/scheduling`)).data;
  await staff.q3.post(`/q3/rounds/${sched.round.roundId}/confirm`, { slotId: sched.round.slots[0].slotId, meetingLink: 'https://meet.jit.si/qa-emp', recipients: { candidate: true, interviewers: true, hr: true, q3: true } }, { expect: [200, 201] });
  await backdateRound(sched.round.roundId);
  const res = await ea.post(`/clients/me/applicants/${mapId}/interview-rounds/${sched.round.roundId}/result`, { decision: 'Select', next: 'Hire', feedback: 'Hire' });
  expect(res.status < 300, `employer result → ${res.status} ${JSON.stringify(res.data).slice(0, 160)}`);
  const s = await statusOf(mapId);
  const docs = (await staff.q3.get(`/q3/applications/${mapId}/documents`)).data;
  const rounds = (await staff.q3.get(`/q3/applications/${mapId}/rounds`)).data;
  expect(s === 4 && rounds.selected && docs.selectedAt, `after employer Hire: status=${s}, Q3 rounds.selected=${rounds.selected}, canRecord=${rounds.canRecord}, docs.selectedAt=${docs.selectedAt}, stage=${docs.stage}`);
});

/* ======================================================================================== */
/* 6. Matching                                                                               */
/* ======================================================================================== */
async function scoreOf(mapId) { const r = await staff.qc2.get(`/q2/applications/${mapId}`); return r.data; }
await test('matching', 'Relevant applications score higher than irrelevant ones (Q2 score)', async () => {
  const rel = [], irr = [];
  for (const ap of applications.slice(100, 400)) for (const x of ap.applied) (x.relevant ? rel : irr).push(x.mapId);
  const sRel = [], sIrr = [];
  for (const id of rel.slice(0, 40)) sRel.push((await scoreOf(id)).overallScore);
  for (const id of irr.slice(0, 40)) sIrr.push((await scoreOf(id)).overallScore);
  const avg = (a) => a.reduce((s, x) => s + (x ?? 0), 0) / a.length;
  const relevantShare = (a) => a.filter((x) => x >= 60).length / a.length;
  expect(avg(sRel) - avg(sIrr) >= 15, `avg relevant=${avg(sRel).toFixed(1)} vs irrelevant=${avg(sIrr).toFixed(1)}`);
  expect(relevantShare(sIrr) <= 0.2, `${(relevantShare(sIrr) * 100).toFixed(0)}% of irrelevant applications are flagged Relevant (≥60)`);
  return `avg relevant=${avg(sRel).toFixed(1)} (${(relevantShare(sRel) * 100).toFixed(0)}% ≥60), irrelevant=${avg(sIrr).toFixed(1)} (${(relevantShare(sIrr) * 100).toFixed(0)}% ≥60)`;
});

await test('matching', 'Score breakdown: skill coverage uses the candidate skills', async () => {
  const ap = applications.find((x) => x.applied.some((y) => y.relevant) && !candidates.find((c) => c.email === x.email).keySkillsOnly);
  const d = await scoreOf(ap.applied.find((y) => y.relevant).mapId);
  const sk = d.scoring.criteria.find((c) => c.key === 'skill');
  expect(d.coverage.matched.length > 0 && sk.score > 0, `matched=${d.coverage.matched} score=${sk.score}`);
  return `skill=${sk.score}, matched ${d.coverage.matched.length}/${d.coverage.requiredSkills.length}`;
});

await test('matching', 'Key skills alone count toward the skill match (not only the IT-skills section)', async () => {
  const c = candidates.find((x) => x.keySkillsOnly && applications.find((a) => a.email === x.email)?.applied.some((y) => y.relevant));
  if (!c) throw new NA('no key-skills-only candidate with a relevant application');
  const ap = applications.find((a) => a.email === c.email).applied.find((y) => y.relevant);
  const d = await scoreOf(ap.mapId);
  const s = JSON.stringify(d);
  const skillScore = d.scoring?.criteria?.find((x) => x.key === 'skill')?.score;
  expect(skillScore > 0, `candidate with key skills ${c.skills.join('/')} applying to a matching job gets skill score ${skillScore}; ${s.slice(0, 160)}`);
});

await test('matching', 'Job-role criterion awards points when candidate function = job designation', async () => {
  const ap = applications.find((x) => x.applied.some((y) => y.relevant));
  const d = await scoreOf(ap.applied.find((y) => y.relevant).mapId);
  const role = d.scoring?.criteria?.find((x) => x.key === 'jobRole');
  expect(role && role.score === 100, `job-role score is ${role?.score} for a candidate whose function matches the job title (D-08: compares sub-function ids with designation ids)`);
  return `jobRole=${role.score}; ${d.candidate.designation} → ${d.job.title}`;
});

await test('matching', 'Candidate-side: designation search returns only that role; remote seekers can find remote jobs', async () => {
  const a = fresh();
  const r = (await a.get('/jobs', { query: { designation: 'DevOps Engineer', pageSize: 100 } })).data;
  expect(r.rows.every((x) => x.designation === 'DevOps Engineer'), 'other roles in results');
  const rem = (await a.get('/jobs', { query: { designation: 'DevOps Engineer', workModes: 'Remote', pageSize: 100 } })).data;
  expect(rem.rows.every((x) => ['Remote', 'Work From Home'].includes(x.workMode)), `non-remote jobs: ${rem.rows.map((x) => x.workMode)}`);
  return `DevOps=${r.total}, remote DevOps=${rem.total}`;
});

await test('matching', 'Employer-side: Q2 relevant-only list for a job excludes off-role applicants', async () => {
  const ap = applications.find((x) => x.applied.some((y) => !y.relevant));
  const jobId = ap.applied.find((y) => !y.relevant).jobId;
  const all = (await staff.qc2.get(`/q2/jobs/${jobId}`, { expect: 200 })).data;
  const relOnly = (await staff.qc2.get(`/q2/jobs/${jobId}`, { query: { relevantOnly: 'true' }, expect: 200 })).data;
  const rows = (x) => x.applicants ?? x.rows ?? x.items ?? [];
  const off = rows(relOnly).filter((x) => x.mapId === ap.applied.find((y) => !y.relevant).mapId);
  expect(!off.length, 'irrelevant applicant appears in relevant-only list');
  return `all=${rows(all).length}, relevant=${rows(relOnly).length}`;
});

/* ======================================================================================== */
/* 10. Security & authorization                                                              */
/* ======================================================================================== */
await test('security', 'Unauthenticated access to protected APIs → 401', async () => {
  const a = fresh();
  const paths = ['/candidates/me', '/clients/me', '/admin/stats', '/q2/stats', '/q3/dashboard', '/files/resume', '/notifications'];
  const bad = [];
  for (const p of paths) { const r = await a.get(p); if (r.status !== 401) bad.push(`${p}→${r.status}`); }
  expect(!bad.length, bad.join(', '));
});

await test('security', 'Role matrix: candidate cannot reach employer/admin/staff APIs; employer cannot reach admin/staff/candidate', async () => {
  const ca = await asCand(candidates[7]), ea = await asEmp(employers[7]);
  const bad = [];
  for (const [who, api, paths] of [
    ['candidate', ca, ['/clients/me', '/clients/me/applicants', '/admin/users', '/q1/stats', '/q2/stats', '/q3/dashboard', '/recruitment/candidates', '/exports/users']],
    ['employer', ea, ['/candidates/me', '/admin/users', '/q1/stats', '/q2/applicants', '/q3/pipeline', '/recruitment/candidates', '/exports/users']],
  ]) for (const p of paths) { const r = await api.get(p); if (r.status !== 403) bad.push(`${who} ${p}→${r.status}`); }
  expect(!bad.length, bad.join(', '));
});

await test('security', "Employer cannot read or act on another employer's jobs and applicants (IDOR)", async () => {
  const [a, b] = [employers[10], employers[11]];
  const eb = await asEmp(b);
  const ap = applications.find((x) => x.applied.some((y) => a.jobs.some((j) => j.jobId === y.jobId)));
  const mapId = ap?.applied.find((y) => a.jobs.some((j) => j.jobId === y.jobId)).mapId;
  const jobId = a.jobs[0].jobId;
  const res = {
    job: (await eb.get(`/clients/me/jobs/${jobId}`)).status,
    editJob: (await eb.patch(`/clients/me/jobs/${jobId}`, { openings: 99 })).status,
    closeJob: (await eb.post(`/clients/me/jobs/${jobId}/status`, { status: 'Closed' })).status,
    applicant: mapId ? (await eb.get(`/clients/me/applicants/${mapId}`)).status : 'n/a',
    resume: mapId ? (await eb.get(`/clients/me/applicants/${mapId}/resume`)).status : 'n/a',
    decide: mapId ? (await eb.post(`/clients/me/applicants/${mapId}/decision`, { decision: 'Rejected' })).status : 'n/a',
  };
  expect(Object.values(res).every((s) => s === 404 || s === 403 || s === 'n/a'), JSON.stringify(res));
  return JSON.stringify(res);
});

await test('security', "Candidate cannot read another candidate's offer / interview rounds", async () => {
  const r = life[0];
  const other = await asCand(candidates[8]);
  const o = await other.get(`/recruitment/offers/${r.mapId}`);
  const rr = await other.get(`/recruitment/interview-rounds/${r.mapId}`);
  expect([403, 404].includes(o.status) && [403, 404].includes(rr.status), `offer→${o.status}, rounds→${rr.status}`);
});

await test('security', 'Generic file route: one user cannot download another user’s files by key (S-01)', async () => {
  const [row] = await q(`SELECT "LatestCVPath" p FROM "tblSubscriberCVUploaded" WHERE "LatestCVPath" IS NOT NULL LIMIT 1`);
  const ea = await asEmp(employers[20]);
  const key = row.p.replace(/^\/+/, '');
  const own = await (await asCand(candidates.find((c) => c.withResume))).get(`/files/${key}`, { raw: true });
  const r = await ea.get(`/files/${key}`, { raw: true });
  void own;
  expect(r.status !== 200, `employer downloaded a candidate CV via /api/${row.p} → ${r.status}`);
});

await test('security', 'Stored XSS: script in profile fields is stored as text and returned verbatim (escaping is the renderer’s job)', async () => {
  const a = fresh(); a.token = probe.token;
  const xss = '<img src=x onerror=alert(1)><script>alert(2)</script>';
  await a.put('/candidates/me/headline', { resumeHeadline: xss }, { expect: 200 });
  const cv = (await a.get('/candidates/me/cv-edit')).data;
  eq(cv.headline, xss, 'stored verbatim');
  return 'API stores raw; browser suite checks it renders inert';
});

await test('security', 'SQL injection probes in search/filter parameters', async () => {
  const a = fresh();
  const payloads = ["' OR '1'='1", "1; DROP TABLE \"tblClientJobs\"; --", "\\'; SELECT pg_sleep(3); --", '%', "React') OR 1=1 --"];
  const out = [];
  for (const p of payloads) {
    for (const [path, query] of [['/jobs', { designation: p }], ['/jobs', { location: p }], ['/jobs/search', { q: p }], ['/jobs/suggestions', { q: p }], ['/companies/search', { q: p }]]) {
      const r = await a.get(path, { query });
      if (r.status >= 500 || r.ms > 2500) out.push(`${path}?${Object.keys(query)[0]}=${p} → ${r.status} ${Math.round(r.ms)}ms`);
      if (r.status === 200 && (r.data.total ?? 0) > 50 && /OR/.test(p)) out.push(`${path} ${p} returned ${r.data.total} rows`);
    }
  }
  const [t] = await q(`SELECT count(*)::int n FROM "tblClientJobs"`);
  expect(t.n > 0, 'jobs table damaged');
  expect(!out.length, out.join(' | '));
});

await test('security', 'NoSQL-style / type-confusion payloads are rejected by validation', async () => {
  const a = await asCand(candidates[9]);
  const r1 = await a.put('/candidates/me/professional', { totalExp: { $gt: 0 } });
  const r2 = await fresh().post('/auth/login', { userName: { $ne: null }, password: { $ne: null } });
  const r3 = await a.put('/candidates/me/personal', { fullName: ['a'], mobile: '9000000000', gender: 'X' });
  expect(r1.status === 400 && [400, 401].includes(r2.status) && r3.status === 400, `${r1.status}/${r2.status}/${r3.status}`);
});

await test('security', 'Rate limiting: 6th login attempt in a minute from one address → 429', async () => {
  const a = fresh();
  const s = [];
  for (let k = 0; k < 7; k++) s.push((await a.req('POST', '/auth/login', { body: { userName: 'nobody', password: 'wrong-pass' }, retries: 0 })).status);
  expect(s.includes(429), `statuses ${s}`);
  return s.join(',');
});

await test('security', 'Security headers present (helmet)', async () => {
  const r = await fresh().get('/jobs', { query: { pageSize: 1 } });
  const h = Object.fromEntries(['x-content-type-options', 'x-frame-options', 'strict-transport-security', 'content-security-policy', 'x-powered-by'].map((k) => [k, r.headers.get(k)]));
  expect(h['x-content-type-options'] === 'nosniff' && !h['x-powered-by'], JSON.stringify(h));
  return JSON.stringify(h);
});

await test('security', 'Admin cannot change own role/deactivate self; staff role changes never cross candidate/employer lines', async () => {
  const me = (await staff.admin.get('/auth/me')).data;
  const self = await staff.admin.patch(`/admin/users/${me.userId}`, { isActive: false });
  const cross = await staff.admin.patch(`/admin/users/${candidates[11].userId}`, { roleId: 5 });
  expect(self.status >= 400 && cross.status >= 400, `self-deactivate→${self.status}, candidate→admin→${cross.status}`);
});

/* ======================================================================================== */
/* 11. Database & API integrity                                                              */
/* ======================================================================================== */
await test('database', 'Exact entity counts (1,000 candidates / 100 employers)', async () => {
  const [r] = await q(`SELECT
    (SELECT count(*)::int FROM "tblSubscriberCVDetails" WHERE "EmailID" LIKE 'qa.cand.%@example.com') cands,
    (SELECT count(*)::int FROM "tblSecUser" u JOIN "tblSubscriberCVDetails" c ON c."SubscriberID" = u."SubscriberID" WHERE c."EmailID" LIKE 'qa.cand.%@example.com') cand_logins,
    (SELECT count(*)::int FROM "tblClientMstr" c JOIN "tblSecUser" u ON u."UserID" = c."UserID" WHERE u."UserName" LIKE 'qa.emp.%@example.com') emps,
    (SELECT count(*)::int FROM "tblSecUser" WHERE "UserName" LIKE 'qa.emp.%@example.com' AND "RoleID" = 4) emp_logins`);
  eq(r.cands, 1000, 'candidates'); eq(r.cand_logins, 1000, 'candidate logins'); eq(r.emps, 100, 'employers'); eq(r.emp_logins, 100, 'employer logins');
  return JSON.stringify(r);
});

await test('database', 'No duplicate candidates (email/mobile) and no duplicate applications per (job, candidate)', async () => {
  const d = await q(`SELECT
    (SELECT count(*)::int FROM (SELECT lower("EmailID") FROM "tblSubscriberCVDetails" WHERE "EmailID" IS NOT NULL GROUP BY 1 HAVING count(*) > 1) x) dup_email,
    (SELECT count(*)::int FROM (SELECT "RegistrationMobileNo" FROM "tblSubscriberRegistration" GROUP BY 1 HAVING count(*) > 1) x) dup_mobile,
    (SELECT count(*)::int FROM (SELECT "JobID","SubscriberID" FROM "tblJobSubscriberMapping" GROUP BY 1,2 HAVING count(*) > 1) x) dup_apps`);
  expect(Object.values(d[0]).every((v) => v === 0), JSON.stringify(d[0]));
});

await test('database', 'No orphaned rows (applications → job/candidate, jobs → company, logins → profile)', async () => {
  const [o] = await q(`SELECT
    (SELECT count(*)::int FROM "tblJobSubscriberMapping" m LEFT JOIN "tblClientJobs" j ON j."JobID" = m."JobID" WHERE j."JobID" IS NULL) app_no_job,
    (SELECT count(*)::int FROM "tblJobSubscriberMapping" m LEFT JOIN "tblSubscriberRegistration" s ON s."SubscriberID" = m."SubscriberID" WHERE s."SubscriberID" IS NULL) app_no_cand,
    (SELECT count(*)::int FROM "tblClientJobs" j LEFT JOIN "tblClientMstr" c ON c."ClientID" = j."ClientID" WHERE c."ClientID" IS NULL) job_no_company,
    (SELECT count(*)::int FROM "tblSecUser" u LEFT JOIN "tblSubscriberRegistration" s ON s."SubscriberID" = u."SubscriberID" WHERE u."RoleID" = 1 AND s."SubscriberID" IS NULL) cand_login_no_profile,
    (SELECT count(*)::int FROM "tblClientMstr" c LEFT JOIN "tblSecUser" u ON u."UserID" = c."UserID" WHERE c."EmailID" LIKE 'qa.emp.%' AND u."UserID" IS NULL) company_no_login,
    (SELECT count(*)::int FROM "tblSubscriberCVDetails" c LEFT JOIN "tblSubscriberRegistration" s ON s."SubscriberID" = c."SubscriberID" WHERE s."SubscriberID" IS NULL) cv_no_reg,
    (SELECT count(DISTINCT m."SubscriberID")::int FROM "tblJobSubscriberMapping" m LEFT JOIN "tblSubscriberJobStatusLatest" l ON l."SubscriberID" = m."SubscriberID" WHERE l."SubscriberID" IS NULL) applicant_no_latest_row,
    (SELECT count(*)::int FROM "tblSubscriberJobStatusLatest" l LEFT JOIN "tblJobSubscriberMapping" m ON m."JobSubscriberMapID" = l."JobSubscriberMapID" WHERE m."JobSubscriberMapID" IS NULL) latest_row_no_app`);
  expect(Object.values(o).every((v) => v === 0), JSON.stringify(o));
});

await test('database', 'Every stored resume/logo key exists on disk', async () => {
  const root = process.env.QA_STORAGE_ROOT;
  if (!root) throw new NA('QA_STORAGE_ROOT not set');
  const { existsSync } = await import('node:fs');
  const keys = (await q(`SELECT "LatestCVPath" k FROM "tblSubscriberCVUploaded" WHERE "LatestCVPath" IS NOT NULL UNION ALL SELECT "CompanyLogo" FROM "tblClientMstr" WHERE "EmailID" LIKE 'qa.emp.%' AND "CompanyLogo" <> ''`)).map((r) => r.k);
  const missing = keys.filter((k) => !existsSync(`${root}/${k.replace(/^files\//, '')}`) && !existsSync(`${root}/${k}`));
  expect(!missing.length, `${missing.length}/${keys.length} missing, e.g. ${missing.slice(0, 3)}`);
  return `${keys.length} files present`;
});

await test('database', 'Admin dashboard statistics match the database', async () => {
  const s = (await staff.admin.get('/admin/stats', { expect: 200 })).data;
  const [d] = await q(`SELECT (SELECT count(*)::int FROM "tblClientJobs" WHERE "StatusID" = 1) active_jobs, (SELECT count(*)::int FROM "tblJobSubscriberMapping") apps, (SELECT count(*)::int FROM "tblSecUser" WHERE "RoleID" = 1) cands, (SELECT count(*)::int FROM "tblClientMstr") companies`);
  const flat = JSON.stringify(s);
  const pickNum = (...keys) => { for (const k of keys) { const v = k.split('.').reduce((o, p) => o?.[p], s); if (typeof v === 'number') return v; } return undefined; };
  const shown = { cands: pickNum('totals.candidates', 'candidates', 'kpis.candidates', 'users.candidates'), apps: pickNum('totals.applications', 'applications', 'kpis.applications'), jobs: pickNum('totals.activeJobs', 'activeJobs', 'kpis.activeJobs', 'jobs.active') };
  const bad = Object.entries({ cands: d.cands, apps: d.apps, jobs: d.active_jobs }).filter(([k, v]) => shown[k] !== undefined && shown[k] !== v);
  expect(!bad.length, `shown ${JSON.stringify(shown)} vs db ${JSON.stringify(d)}`);
  return `shown ${JSON.stringify(shown)} db ${JSON.stringify(d)}; keys ${flat.slice(0, 120)}`;
});

await test('database', 'Prisma errors map to 4xx, not 500 (bad foreign key on profile save)', async () => {
  const a = await asCand(candidates[12]);
  const r = await a.put('/candidates/me/professional', { industryTypeId: 999999 });
  const r2 = await a.put('/candidates/me/personal', { fullName: 'X', mobile: candidates[12].mobile, gender: 'M', cityId: 999999 });
  expect(r.status < 500 && r2.status < 500, `unknown industry→${r.status}, unknown city→${r2.status}`);
});

await test('api', 'Error responses share one shape {statusCode,message,error,timestamp,path}', async () => {
  const rs = [await fresh().get('/candidates/me'), await fresh().post('/auth/register', {}), await fresh().get('/jobs/99999999')];
  const bad = rs.filter((r) => !['statusCode', 'message', 'timestamp', 'path'].every((k) => k in (r.data ?? {})));
  expect(!bad.length, bad.map((r) => `${r.status}:${JSON.stringify(r.data).slice(0, 80)}`).join(' | '));
  return rs.map((r) => r.status).join(',');
});

await test('api', 'Health endpoint reports db/redis/disk up', async () => {
  const h = (await fresh().get('/health', { expect: 200 })).data;
  expect(h.db === 'up' && h.redis === 'up', JSON.stringify(h));
});

await test('api', 'No 5xx in the API log for this run', async () => {
  const log = readFileSync(API_LOG, 'utf8');
  const lines = log.split('\n').filter((l) => / 5\d\d \d+ms/.test(l) || /ERROR \[ExceptionsHandler\]|PrismaClientKnownRequestError/.test(l));
  expect(!lines.length, `${lines.length} server errors, e.g. ${lines.slice(0, 3).map((l) => l.replace(/\x1b\[[0-9;]*m/g, '').slice(0, 160)).join(' | ')}`);
});

writeFileSync(`${STATE_DIR}/results-workflows.json`, JSON.stringify(results, null, 1));
const tally = results.reduce((o, r) => ((o[r.status] = (o[r.status] ?? 0) + 1), o), {});
console.log('\n', JSON.stringify(tally));
await db.end();
