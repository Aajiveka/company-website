// Subscriptions + applications + saved jobs.
//
// Paying needs Razorpay, which has no offline sandbox, so subscriptions are written straight
// to the QA database as a clearly marked fixture (OrderRef QA-FIXTURE-*, PaymentMethod
// 'qa-fixture'). Every 4th candidate is left unsubscribed to exercise the 403 apply gate.
// Applications themselves go through the real search + apply endpoints.
//
//   QA_DATABASE_URL=postgresql://… node tests/qa/seed-applications.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import pg from 'pg';
import { Api, assertSafeTarget, ipFor, pool, STATE_DIR } from './lib/client.mjs';
import { pick, rng, roleByKey, sample } from './lib/fixtures.mjs';

const DB = process.env.QA_DATABASE_URL;
if (!DB || !/aajiveka_qa/.test(DB)) throw new Error('QA_DATABASE_URL must point at the aajiveka_qa test database');
await assertSafeTarget();

const candidates = JSON.parse(readFileSync(`${STATE_DIR}/candidates.json`, 'utf8'));
const employers = JSON.parse(readFileSync(`${STATE_DIR}/employers.json`, 'utf8'));
const jobs = employers.flatMap((e) => e.jobs.filter((j) => !j.draft).map((j) => ({ ...j, clientId: e.clientId, company: e.companyName })));

const db = new pg.Client({ connectionString: DB });
await db.connect();
const { rows: ids } = await db.query(`SELECT "UserID" AS u, "SubscriberID" AS s FROM "tblSecUser" WHERE "UserID" = ANY($1::bigint[])`, [candidates.map((c) => c.userId)]);
const subOf = new Map(ids.map((r) => [Number(r.u), Number(r.s)]));
for (const c of candidates) c.subscriberId = subOf.get(c.userId);
const cityName = new Map((await db.query(`SELECT "CityID" AS id, "Descr" AS d FROM "tblMstrCily"`)).rows.map((r) => [Number(r.id), r.d]));

const subscribed = candidates.filter((c) => c.i % 4 !== 3);
await db.query('BEGIN');
for (const c of subscribed) {
  const plan = c.exp < 3 ? 2 : c.exp < 8 ? 6 : 10;
  const { rows: [o] } = await db.query(
    `INSERT INTO "tblPaymentOrder" ("OrderRef","SubscriberID","PlanID","AmountINR","Status","PaymentMethod","TransactionID","SettledAt")
     SELECT $1,$2,$3,"PriceINR",'SUCCESS','qa-fixture',$1,now() FROM "tblSubscriptionPlan" WHERE "PlanID"=$3
     ON CONFLICT ("OrderRef") DO UPDATE SET "OrderRef"=EXCLUDED."OrderRef" RETURNING "OrderID"`,
    [`QA-FIXTURE-${c.n}`, c.subscriberId, plan],
  );
  await db.query(
    `INSERT INTO "tblSubscription" ("SubscriberID","PlanID","OrderID","StartsAt","EndsAt") VALUES ($1,$2,$3,now(),now() + interval '3 months') ON CONFLICT ("OrderID") DO NOTHING`,
    [c.subscriberId, plan, o.OrderID],
  );
}
await db.query('COMMIT');
console.log(`subscriptions fixture: ${subscribed.length} subscribed, ${candidates.length - subscribed.length} left unsubscribed`);

// Gate: an unsubscribed candidate must get 403.
const gate = candidates.find((c) => c.i % 4 === 3);
const ga = new Api({ ip: ipFor(40_000) });
await ga.login(gate.email, gate.password);
const gateRes = await ga.post(`/jobs/${jobs[0].jobId}/apply`, { fullName: gate.fullName, email: gate.email, phone: gate.mobile });
console.log(`apply without subscription → ${gateRes.status} ${gateRes.status === 403 ? 'PASS' : 'FAIL'}`);

async function run(c) {
  const r = rng(90_000 + c.i);
  const api = new Api({ ip: ipFor(30_000 + c.i) });
  await api.login(c.email, c.password);
  const role = roleByKey[c.role];
  // Search the way the job board does: by designation, then prefer own / preferred cities.
  const found = (await api.get('/jobs', { query: { designation: role.designation, pageSize: 50 }, expect: 200 })).data.rows ?? [];
  const relevant = found.filter((j) => (j.minExp ?? 0) <= c.exp + 1);
  const prefNames = new Set(c.prefCities.map((id) => cityName.get(id)));
  const local = relevant.filter((j) => prefNames.has(j.city));
  const choices = [...sample(r, local, 2), ...sample(r, relevant, 2)].filter((j, k, a) => a.findIndex((x) => x.jobId === j.jobId) === k).slice(0, 1 + Math.floor(r() * 3));
  // A minority also apply to something unrelated — the negative matching cases.
  if (r() < 0.25) choices.push(pick(r, jobs.filter((j) => j.designation !== role.designation)));
  const applied = [];
  for (const j of choices) {
    const jobId = j.jobId ?? j.id;
    const res = await api.post(`/jobs/${jobId}/apply`, {
      fullName: c.fullName, email: c.email, phone: c.mobile, totalExperience: `${c.exp} years`, currentLocation: String(c.cityId),
      expectedSalary: String(Math.round(Math.max(c.ctc, 300000) * 1.25)), noticePeriod: `${c.notice} days`,
      linkedInUrl: `https://linkedin.example.com/in/qa-${c.n}`, coverLetter: `I would like to apply for this ${role.designation} role. (QA)`,
    });
    if (res.status === 201 || res.status === 200) applied.push({ jobId, mapId: res.data.jobSubscriberMapId, ref: res.data.reference, relevant: j.designation === undefined || j.designation === role.designation || (j.designationName ?? j.designation) === role.designation });
    else throw new Error(`apply ${jobId} → ${res.status} ${JSON.stringify(res.data).slice(0, 200)}`);
  }
  // Duplicate apply must be rejected.
  let dup = null;
  if (applied.length && c.i % 50 === 0) dup = (await api.post(`/jobs/${applied[0].jobId}/apply`, { fullName: c.fullName, email: c.email, phone: c.mobile })).status;
  // Save a couple of jobs.
  const saved = [];
  if (r() < 0.5) for (const j of sample(r, relevant, 2)) { const s = await api.post(`/candidates/me/saved-jobs/${j.jobId}`, {}); if (s.status < 300) saved.push(j.jobId); }
  return { i: c.i, email: c.email, subscriberId: c.subscriberId, found: found.length, applied, saved, dup };
}

const t0 = Date.now();
const res = await pool(subscribed, Number(process.env.QA_CONCURRENCY ?? 8), run, (d, t) => console.log(`  applying ${d}/${t}`));
const ok = res.filter((x) => x.ok).map((x) => x.value);
const failed = res.map((x, k) => (!x.ok ? { email: subscribed[k].email, error: x.error } : null)).filter(Boolean);
writeFileSync(`${STATE_DIR}/applications.json`, JSON.stringify(ok, null, 1));
writeFileSync(`${STATE_DIR}/candidates.json`, JSON.stringify(candidates, null, 1));
const total = ok.reduce((s, x) => s + x.applied.length, 0);
const dups = ok.filter((x) => x.dup !== null);
console.log(`applications: ${total} from ${ok.length} candidates in ${((Date.now() - t0) / 1000).toFixed(0)}s; saved ${ok.reduce((s, x) => s + x.saved.length, 0)}; ${failed.length} failed`);
console.log(`duplicate apply checks: ${dups.length}, statuses ${JSON.stringify([...new Set(dups.map((d) => d.dup))])}`);
console.log(`candidates whose search found 0 jobs: ${ok.filter((x) => !x.found).length}`);
for (const f of failed.slice(0, 10)) console.log('  FAIL', f.email, f.error);
await db.end();
