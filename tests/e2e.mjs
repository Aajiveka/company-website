/**
 * End-to-end regression suite.
 *
 * Drives every public page and all three roles against a REAL API and database — no mocks.
 * This is the check that catches contract drift between web and api; it is what found the
 * hero's "Function / keyword" dropdown sending a parameter the API rejects.
 *
 *   E2E_BASE_URL=http://localhost:8080 node tests/e2e.mjs
 *
 * Requires the database to be seeded (npm run db:seed --workspace apps/api).
 */
import os from 'node:os';
import { chromium } from 'playwright';

// Screenshots are a debugging aid, not an artifact — keep them out of the repo.
const SHOT = process.env.E2E_SHOT_DIR ?? os.tmpdir();
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5173';

const PUBLIC = ['/', '/jobs', '/jobs/1', '/login', '/register', '/forgot-password', '/pricing', '/about',
  '/contact', '/blogs', '/career', '/testimonial', '/privacy', '/terms', '/subscription', '/resume'];

const ROLES = {
  candidate: { user: 'anuj', pass: 'anuj', pages: ['/candidate/profile', '/candidate/cv-manager',
    '/candidate/applied-jobs', '/candidate/job-alerts', '/candidate/documents', '/candidate/change-password'] },
  employer: { user: 'anuj@aajiveka.com', pass: 'anuj@aajiveka.com', pages: ['/company/profile',
    '/company/jobs', '/company/post-job', '/company/jobs/1/edit', '/company/applicants'] },
  qc1: { user: 'qc1', pass: 'qc1', pages: ['/recruitment/candidates', '/recruitment/qc1',
    '/recruitment/documents', '/recruitment/interviews', '/recruitment/candidates/1'] },
};

const browser = await chromium.launch();
const results = [];

async function visit(page, path, label) {
  const errs = [];
  const apiCalls = [];
  const onErr = (e) => errs.push('[pageerror] ' + String(e.message).slice(0, 110));
  const onCon = (m) => {
    const t = m.text();
    // The 401 on /auth/me after a hard reload is expected: the access token lives in
    // memory, so the interceptor refreshes and replays. Only unrecovered errors matter.
    if (m.type() === 'error' && !t.includes('401')) errs.push('[console] ' + t.slice(0, 110));
  };
  const onResp = (r) => {
    if (r.url().includes('/api/')) apiCalls.push({ url: r.url().replace(BASE, ''), status: r.status() });
  };
  page.on('pageerror', onErr); page.on('console', onCon); page.on('response', onResp);
  await page.goto(BASE + path, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1100);
  const text = await page.locator('body').innerText().catch(() => '');
  const url = page.url().replace(BASE, '');
  page.off('pageerror', onErr); page.off('console', onCon); page.off('response', onResp);

  // A data endpoint that never succeeded, ignoring the expected /auth/me 401 dance.
  const dataFails = apiCalls.filter(
    (c) => c.status >= 400 && !(c.status === 401 && c.url.includes('/auth/me')),
  );
  const bouncedToLogin = url.startsWith('/login') && !path.startsWith('/login');
  const blank = text.trim().length < 60;
  const bad = errs.length || dataFails.length || blank || bouncedToLogin;

  results.push({
    label, path, status: bad ? 'FAIL' : 'ok',
    dataFails: [...new Set(dataFails.map((f) => `${f.status} ${f.url}`))],
    errs: [...new Set(errs)].slice(0, 2), blank, bouncedToLogin,
    sample: text.replace(/\s+/g, ' ').slice(0, 90),
  });
}

const pub = await browser.newPage({ viewport: { width: 1440, height: 900 } });
for (const p of PUBLIC) await visit(pub, p, 'public');
await pub.close();

for (const [role, cfg] of Object.entries(ROLES)) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.locator('input[name=userName]').fill(cfg.user);
  await page.locator('input[name=password]').fill(cfg.pass);
  await page.locator('button[type=submit]').first().click();
  await page.waitForTimeout(2500);
  const landed = page.url().replace(BASE, '');
  results.push({ label: role, path: 'LOGIN', status: landed.includes('/login') ? 'FAIL' : 'ok',
    dataFails: [], errs: [], sample: `landed on ${landed}` });
  for (const p of cfg.pages) await visit(page, p, role);
  await page.screenshot({ path: `${SHOT}/e2e-${role}.png` });
  await page.close();
}
await browser.close();

const fails = results.filter((r) => r.status === 'FAIL');
console.log(`\n=== ${results.length} checks | ${fails.length} FAIL ===\n`);
for (const r of results) {
  console.log(`[${r.status === 'ok' ? ' ok ' : 'FAIL'}] ${r.label.padEnd(10)} ${r.path.padEnd(28)} ${r.sample}`);
  if (r.blank) console.log(`         -> PAGE BLANK`);
  if (r.bouncedToLogin) console.log(`         -> BOUNCED TO /login`);
  for (const f of r.dataFails) console.log(`         -> API ${f}`);
  for (const e of r.errs) console.log(`         -> ${e}`);
}

process.exit(fails.length ? 1 : 0);
