// Controlled load test: N concurrent virtual users for a fixed duration each, running a
// realistic mix of public and signed-in calls. LOCAL / STAGING ONLY — assertSafeTarget refuses
// anything else. Reports throughput, error rate and latency percentiles per endpoint.
//
//   node tests/qa/load.mjs [levels=10,25,50,100] [seconds=20]
import { readFileSync, writeFileSync } from 'node:fs';
import { Api, assertSafeTarget, ipFor, STATE_DIR } from './lib/client.mjs';
import { pick, rng } from './lib/fixtures.mjs';

const LEVELS = (process.argv[2] ?? '10,25,50,100').split(',').map(Number);
const SECONDS = Number(process.argv[3] ?? 20);
await assertSafeTarget();

const candidates = JSON.parse(readFileSync(`${STATE_DIR}/candidates.json`, 'utf8'));
const employers = JSON.parse(readFileSync(`${STATE_DIR}/employers.json`, 'utf8'));
const jobIds = employers.flatMap((e) => e.jobs.filter((j) => !j.draft).map((j) => j.jobId));
const DES = ['Frontend Developer', 'Java Developer', 'Data Analyst', 'Sales Executive', 'DevOps Engineer', 'HR Executive'];
const CITIES = ['Bengaluru', 'Pune', 'Mumbai', 'Hyderabad', 'Chennai'];

// Sign in a pool of users up front (login has its own 5/min/IP limit; each gets its own IP).
async function signIn(list, f) { return Promise.all(list.map(async (x, k) => { const a = new Api({ ip: ipFor(90_000 + k + f) }); await a.login(...(x.email ? [x.email, x.password] : [x.emailCompany, x.password])); return a; })); }
const candPool = await signIn(candidates.filter((c) => c.i % 4 !== 3).slice(0, 100), 0);
const empPool = await signIn(employers.slice(0, 20), 1000);
const q2 = new Api({ ip: ipFor(95_000) }); await q2.login('qc2', 'qc2');
const admin = new Api({ ip: ipFor(95_001) }); await admin.login('admin', 'admin');

const SCENARIOS = [
  // [weight, name, fn(r, vu)]
  [22, 'GET /jobs (filters)', (r, a) => a.get('/jobs', { query: { designation: pick(r, DES), workModes: pick(r, ['Remote', 'Hybrid', 'In-office']), page: 1 + Math.floor(r() * 3), pageSize: 10 } })],
  [10, 'GET /jobs (location+ctc)', (r, a) => a.get('/jobs', { query: { location: pick(r, CITIES), minCtc: 500000, sortBy: 'salary_high', pageSize: 20 } })],
  [10, 'GET /jobs/search (full-text)', (r, a) => a.get('/jobs/search', { query: { q: pick(r, ['react', 'python developer', 'sales', 'data', 'java spring']), pageSize: 10 } })],
  [12, 'GET /jobs/:id', (r, a) => a.get(`/jobs/${pick(r, jobIds)}`)],
  [4, 'GET /jobs/filters', (r, a) => a.get('/jobs/filters')],
  [10, 'GET /candidates/me/dashboard', (r) => pick(r, candPool).get('/candidates/me/dashboard')],
  [8, 'GET /candidates/me/applied-jobs', (r) => pick(r, candPool).get('/candidates/me/applied-jobs')],
  [5, 'GET /candidates/me/recommendations', (r) => pick(r, candPool).get('/candidates/me/recommendations')],
  [6, 'GET /candidates/me/cv-edit', (r) => pick(r, candPool).get('/candidates/me/cv-edit')],
  [6, 'GET /clients/me/applicants', (r) => pick(r, empPool).get('/clients/me/applicants', { query: { pageSize: 20 } })],
  [3, 'GET /clients/me/jobs', (r) => pick(r, empPool).get('/clients/me/jobs')],
  [2, 'GET /clients/me/analytics', (r) => pick(r, empPool).get('/clients/me/analytics')],
  [1, 'GET /q2/applicants', () => q2.get('/q2/applicants', { query: { pageSize: 25 } })],
  [1, 'GET /admin/stats', () => admin.get('/admin/stats')],
];
const totalW = SCENARIOS.reduce((s, x) => s + x[0], 0);
const choose = (r) => { let x = r() * totalW; for (const s of SCENARIOS) { if ((x -= s[0]) < 0) return s; } return SCENARIOS[0]; };
const pct = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))] : 0);

const report = [];
for (const n of LEVELS) {
  const samples = [];
  const deadline = Date.now() + SECONDS * 1000;
  await Promise.all(Array.from({ length: n }, async (_, k) => {
    const r = rng(1234 + k * 7 + n);
    const anon = new Api({ ip: ipFor(96_000 + k) });
    while (Date.now() < deadline) {
      const [, name, fn] = choose(r);
      const t0 = performance.now();
      let status = 0;
      try { status = (await fn(r, anon)).status; } catch { status = -1; }
      samples.push({ name, ms: performance.now() - t0, status });
    }
  }));
  const ms = samples.map((s) => s.ms).sort((a, b) => a - b);
  const errors = samples.filter((s) => s.status < 0 || s.status >= 500).length;
  const non2xx = samples.filter((s) => s.status < 200 || s.status >= 300).length;
  const per = {};
  for (const s of samples) (per[s.name] ??= []).push(s.ms);
  const endpoints = Object.fromEntries(Object.entries(per).map(([k, v]) => { v.sort((a, b) => a - b); return [k, { n: v.length, p50: Math.round(pct(v, 50)), p95: Math.round(pct(v, 95)), max: Math.round(v.at(-1)) }]; }));
  const row = { users: n, seconds: SECONDS, requests: samples.length, rps: Math.round(samples.length / SECONDS), errors5xx: errors, non2xx, p50: Math.round(pct(ms, 50)), p95: Math.round(pct(ms, 95)), p99: Math.round(pct(ms, 99)), max: Math.round(ms.at(-1)), endpoints };
  report.push(row);
  console.log(`${String(n).padStart(3)} users: ${row.requests} req, ${row.rps} rps, 5xx=${errors}, non-2xx=${non2xx}, p50=${row.p50}ms p95=${row.p95}ms p99=${row.p99}ms max=${row.max}ms`);
  const slow = Object.entries(endpoints).sort((a, b) => b[1].p95 - a[1].p95).slice(0, 4);
  console.log('      slowest p95:', slow.map(([k, v]) => `${k}=${v.p95}ms`).join(', '));
  await new Promise((s) => setTimeout(s, 3000));
}
writeFileSync(`${STATE_DIR}/results-load.json`, JSON.stringify(report, null, 1));
