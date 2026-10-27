/**
 * Admin panel end-to-end suite — against a REAL api and database, no mocks, like e2e.mjs.
 *
 *   E2E_BASE_URL=http://localhost:5173 node tests/admin-e2e.mjs
 *
 * Run the API with THROTTLE_LIMIT_PER_MIN=1000, as CI does. At the default 60 a run of this
 * size gets 429s part-way through and the app stalls on a blank page.
 *
 * Needs the demo logins (SEED_DEMO_USERS=1). It changes real rows and puts them back:
 *   - closes then reopens one Active job;
 *   - creates one staff login (qa_e2e_<time>) and one employer registration, which it approves
 *     — both are left in place, deactivated, so the run is visible in the audit log;
 * Login is throttled to 5/min and this suite signs in three times (API, admin, QC1), so wait a
 * minute between runs.
 */
import os from 'node:os';
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
const API = process.env.E2E_API_URL ?? `${BASE}/api`;
const SHOT = process.env.E2E_SHOT_DIR ?? os.tmpdir();
const STAMP = Date.now().toString(36);

const results = [];
const check = (name, ok, info = '') => {
  results.push({ name, ok: !!ok, info });
  console.log(`[${ok ? ' ok ' : 'FAIL'}] ${name}${info ? ` — ${info}` : ''}`);
};

/* ─── API helpers (setup + verifying what the UI claims) ─────────────── */

async function api(path, { token, method = 'GET', body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

const adminLogin = await api('/auth/login', { method: 'POST', body: { userName: 'admin', password: 'admin' } });
if (adminLogin.status !== 200) {
  console.error('admin/admin could not sign in — seed the demo users first.', adminLogin.status);
  process.exit(2);
}
const T = adminLogin.data.accessToken;

/* ─── Browser helpers ───────────────────────────────────────────────── */

const browser = await chromium.launch();

/** Watches a page for uncaught errors, console errors and failed API calls. */
function watch(page) {
  const problems = [];
  page.on('pageerror', (e) => problems.push(`[pageerror] ${String(e.message).slice(0, 140)}`));
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' && !t.includes('401') && !t.includes('Failed to load resource')) problems.push(`[console] ${t.slice(0, 140)}`);
  });
  page.on('response', (r) => {
    const u = r.url();
    if (!u.includes('/api/')) return;
    if (r.status() >= 400 && !(r.status() === 401 && /auth\/(me|refresh)/.test(u))) problems.push(`[api ${r.status()}] ${u.replace(BASE, '')}`);
  });
  return {
    take() {
      return problems.splice(0);
    },
  };
}

async function uiLogin(context, user, pass) {
  const page = await context.newPage();
  await go(page, `${BASE}/login`);
  await page.locator('input[name=userName]').fill(user);
  await page.locator('input[name=password]').fill(pass);
  await page.locator('button[type=submit]').first().click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 }).catch(() => {});
  return page;
}

/**
 * The notification bell holds an SSE stream open, so "networkidle" never arrives. Instead
 * count this page's in-flight /api/ requests (the stream excluded) and call the page ready
 * once none has been pending for 400ms and no skeleton (aria-busy) is left.
 */
const inflight = new WeakMap();
function track(page) {
  if (inflight.has(page)) return;
  const state = { n: 0, last: Date.now() };
  inflight.set(page, state);
  const isData = (r) => r.url().includes('/api/') && !/stream|events/.test(r.url());
  page.on('request', (r) => isData(r) && (state.n++, (state.last = Date.now())));
  const done = (r) => isData(r) && ((state.n = Math.max(0, state.n - 1)), (state.last = Date.now()));
  page.on('requestfinished', done);
  page.on('requestfailed', done);
}
async function settle(page) {
  track(page);
  const state = inflight.get(page);
  const until = Date.now() + 15000;
  await page.waitForTimeout(150);
  while (Date.now() < until && (state.n > 0 || Date.now() - state.last < 400)) await page.waitForTimeout(100);
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(150);
}
async function go(page, url) {
  track(page);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await settle(page);
}

/* ─── 1. Access control ─────────────────────────────────────────────── */

{
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  const page = await ctx.newPage();
  await go(page, `${BASE}/admin/users`);
  check('signed-out visitor is sent to /login', new URL(page.url()).pathname === '/login', page.url());
  await ctx.close();

  const anon = await api('/admin/stats');
  check('API refuses /admin/stats without a token', anon.status === 401, String(anon.status));

  const qctx = await browser.newContext({ serviceWorkers: 'block' });
  const qpage = await uiLogin(qctx, 'qc1', 'qc1');
  await go(qpage, `${BASE}/admin`);
  await qpage.waitForTimeout(500);
  const path = new URL(qpage.url()).pathname;
  check('QC1 opening /admin is turned away from the panel', !path.startsWith('/admin'), `landed on ${path}`);
  const qtoken = await qpage.evaluate(async () => {
    const r = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: localStorage.getItem('aaj.refresh') }),
    });
    const d = await r.json();
    localStorage.setItem('aaj.refresh', d.refreshToken);
    return d.accessToken;
  });
  const asQc1 = await api('/admin/users', { token: qtoken });
  check('API refuses /admin/users for a QC1 token (server-side, not just hidden)', asQc1.status === 403, String(asQc1.status));
  await qctx.close();
}

/* ─── 2. Admin: every page renders real data without errors ─────────── */

const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 900 } });
const page = await uiLogin(ctx, 'admin', 'admin');
const w = watch(page);
check('admin lands on the admin dashboard', new URL(page.url()).pathname === '/admin', page.url());

const stats = (await api('/admin/stats', { token: T })).data;
await settle(page);
const activeJobsCard = await page.getByRole('link', { name: /Active jobs/ }).innerText();
check('dashboard "Active jobs" matches the database', activeJobsCard.includes(String(stats.jobs.byStatus.Active)), activeJobsCard.replace(/\s+/g, ' '));
const appsCard = await page.locator('main').getByRole('link', { name: /^Applications/ }).first().innerText();
check('dashboard application total matches the database', appsCard.includes(String(stats.applications.total)), appsCard.replace(/\s+/g, ' '));
const dashProblems = w.take();
check('dashboard loads with no console/API errors', !dashProblems.length, dashProblems.join(' | '));

const firstJob = (await api('/admin/jobs?status=Active&pageSize=1', { token: T })).data.items[0];
const firstApp = (await api('/admin/applications?pageSize=1', { token: T })).data.items[0];
// A freshly seeded database (CI) has the demo job but no applications; the application
// detail page is then skipped rather than crashing the run.
const appDetail = firstApp ? [`/admin/applications/${firstApp.mapId}`] : [];
if (!firstJob) {
  console.error('No Active job to moderate — seed the demo job (npm run db:seed) first.');
  process.exit(2);
}
const pages = [
  '/admin/users',
  '/admin/users/1',
  '/admin/employer-approvals',
  '/admin/companies',
  '/admin/jobs',
  `/admin/jobs/${firstJob.jobId}`,
  '/admin/applications',
  ...appDetail,
  '/admin/blog',
  '/admin/settings',
  '/admin/reports',
  '/admin/audit',
];
for (const p of pages) {
  await go(page, BASE + p);
  await page.waitForTimeout(500);
  const text = await page.locator('main').innerText().catch(() => '');
  const problems = w.take();
  const h1 = await page.locator('h1').count();
  check(`${p} renders`, text.trim().length > 40 && !/404\s*Page not found/i.test(text) && h1 === 1 && !problems.length,
    problems.join(' | ') || (h1 !== 1 ? `${h1} h1 elements` : ''));
}

// Breadcrumbs: one row, not the two DashboardLayout used to stack.
await go(page, `${BASE}/admin/users`);
check('a single breadcrumb trail', (await page.locator('nav[aria-label=Breadcrumb]').count()) === 1);

/* ─── 3. Search, filters and pagination hit the server ──────────────── */

{
  await go(page, `${BASE}/admin/users`);
  const req = page.waitForRequest((r) => r.url().includes('/api/admin/users') && r.url().includes('q=qc2'));
  await page.getByRole('searchbox', { name: 'Search users' }).fill('qc2');
  await req;
  await settle(page);
  const rows = await page.locator('table tbody tr').count();
  check('user search filters on the server', rows === 1, `${rows} rows`);
  await page.getByRole('combobox', { name: 'Role' }).selectOption('3');
  await settle(page);
  check('role filter is reflected in the URL', page.url().includes('roleId=3'));

  await go(page, `${BASE}/admin/applications?stage=Interview`);
  const expected = (await api('/admin/applications?stage=Interview', { token: T })).data.total;
  const shown = await page.locator('table tbody tr').count();
  if (!shown) await page.screenshot({ path: `${SHOT}/admin-fail-stage.png` });
  const ctxInfo = shown ? '' : ` | problems ${w.take().join(' ; ')} | url ${page.url()} | ${(await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 200)}`;
  check('applications stage tab shows the stage’s rows', shown === Math.min(expected, 20), `${shown} shown, ${expected} in db${ctxInfo}`);
}

/* ─── 4. Workflow: close a job, verify everywhere, reopen it ────────── */

{
  const job = firstJob;
  await go(page, `${BASE}/admin/jobs?status=Active`);
  const row = page.locator('table tbody tr', { has: page.getByRole('link', { name: new RegExp(job.designation) }) }).first();
  await row.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Close job', exact: true }).click();
  await page.getByText(/1 job closed/).waitFor({ timeout: 8000 }).catch(() => {});
  const after = (await api(`/admin/jobs/${job.jobId}`, { token: T })).data;
  check('closing a job from the list persists', after.status === 'Closed', after.status);

  const search = (await api('/jobs?pageSize=100')).data;
  const listed = JSON.stringify(search).includes(`"jobId":${job.jobId},`);
  check('a closed job drops out of public job search', !listed);

  const again = await api(`/admin/jobs/${job.jobId}/status`, { token: T, method: 'POST', body: { action: 'close' } });
  check('closing an already-closed job is refused', again.status === 400, again.data?.message);

  await go(page, `${BASE}/admin/jobs/${job.jobId}`);
  await page.getByRole('button', { name: 'Reopen job' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reopen job', exact: true }).click();
  await page.getByText('Job reopened').waitFor({ timeout: 8000 }).catch(() => {});
  await settle(page);
  const reopened = (await api(`/admin/jobs/${job.jobId}`, { token: T })).data;
  check('reopening from the detail page persists', reopened.status === 'Active', reopened.status);
  const historyText = await page.locator('main').innerText();
  check('job history shows both admin actions', /Closed a job/.test(historyText) && /Reopened a job/.test(historyText));
  const jp = w.take();
  check('job workflow had no console/API errors', !jp.length, jp.join(' | '));
}

/* ─── 5. Workflow: create a staff login, then deactivate it ─────────── */

let staffId;
{
  await go(page, `${BASE}/admin/users`);
  await page.getByRole('button', { name: 'Add staff member' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByRole('button', { name: 'Create account' }).click();
  check('empty staff form shows validation errors', await dlg.getByText('Enter the person’s full name').isVisible());

  await dlg.getByLabel('Full name').fill('QA E2E Staff');
  await dlg.getByLabel('Username').fill('qc1');
  await dlg.getByLabel('Work email').fill(`qa.${STAMP}@example.com`);
  await dlg.getByLabel(/^Q3/).check();
  await dlg.getByRole('button', { name: 'Create account' }).click();
  await dlg.getByText('That username is already in use').waitFor({ timeout: 8000 }).catch(() => {});
  check('a taken username is reported on the field', await dlg.getByText('That username is already in use').isVisible());

  await dlg.getByLabel('Username').fill(`qa_e2e_${STAMP}`);
  await dlg.getByRole('button', { name: 'Create account' }).click();
  await dlg.getByText('Staff account created').waitFor({ timeout: 8000 }).catch(() => {});
  const notice = await dlg.innerText();
  check('staff account is created and the set-password outcome is shown', /set-password link|single-use link/i.test(notice));
  await dlg.getByRole('button', { name: 'Done' }).click();

  const found = (await api(`/admin/users?q=qa_e2e_${STAMP}`, { token: T })).data.items[0];
  staffId = found?.userId;
  check('new staff login exists with the Q3 role', found?.roleId === 7 && found.isActive, JSON.stringify(found ?? {}));

  await go(page, `${BASE}/admin/users/${staffId}`);
  await page.getByRole('button', { name: 'Deactivate account' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Deactivate' }).click();
  await page.getByText('Account deactivated and signed out').waitFor({ timeout: 8000 }).catch(() => {});
  const deact = (await api(`/admin/users/${staffId}`, { token: T })).data;
  check('deactivating from the detail page persists', deact.isActive === false);
  check('the account history records creation and deactivation',
    deact.history.some((h) => h.action === 'admin.user_created') && deact.history.some((h) => h.action === 'admin.user_updated'));

  await go(page, `${BASE}/admin/users/${adminLogin.data.user.userId}`);
  check('an admin cannot deactivate their own account (button disabled)', await page.getByRole('button', { name: 'Deactivate account' }).isDisabled());
  // The one expected failure is the 409 for the taken username.
  const sp = w.take().filter((p) => !p.startsWith('[api 409]'));
  check('staff workflow had no unexpected errors', !sp.length, sp.join(' | '));
}

/* ─── 6. Workflow: employer registers, admin approves, company appears ─ */

{
  const email = `hr.${STAMP}@e2e-company.test`;
  const reg = await api('/auth/register-employer', {
    method: 'POST',
    body: { companyName: `E2E Co ${STAMP}`, emailCompany: email, location: 'Pune', industryType: 'IT' },
  });
  check('public employer registration is accepted', reg.status === 201 || reg.status === 200, String(reg.status));

  await go(page, `${BASE}/admin/employer-approvals`);
  const row = page.locator('table tbody tr', { hasText: `E2E Co ${STAMP}` });
  check('the registration waits in the Pending tab', (await row.count()) === 1);
  await row.getByRole('button', { name: 'Review' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByRole('button', { name: 'Approve', exact: true }).click();
  await dlg.getByRole('button', { name: 'Yes, approve' }).click();
  await page.getByText(/approved — sign-in details/).waitFor({ timeout: 8000 }).catch(() => {});
  await settle(page);
  check('approved registration leaves the Pending tab', (await page.locator('table tbody tr', { hasText: `E2E Co ${STAMP}` }).count()) === 0);

  const company = (await api(`/admin/companies?q=E2E Co ${STAMP}`, { token: T })).data.items[0];
  check('approval created the company with an active employer login', company?.login?.isActive === true && company.login.userName === email, JSON.stringify(company?.login ?? {}));

  const second = await api(`/admin/employer-registrations`, { token: T });
  const regRow = second.data.find((r) => r.emailCompany === email);
  const dup = await api(`/admin/employer-registrations/${regRow.id}/review`, { token: T, method: 'POST', body: { decision: 'Approved' } });
  check('approving the same registration twice is refused', dup.status === 409, String(dup.status));

  // Leave nothing able to sign in.
  if (company?.login) await api(`/admin/users/${company.login.userId}`, { token: T, method: 'PATCH', body: { isActive: false } });
  const ap = w.take();
  check('approval workflow had no console/API errors', !ap.length, ap.join(' | '));
}

/* ─── 7. Audit log reflects all of the above ────────────────────────── */

{
  await go(page, `${BASE}/admin/audit`);
  await page.getByRole('combobox', { name: 'Area' }).selectOption('admin.');
  await settle(page);
  const text = await page.locator('main').innerText();
  check('audit log lists the admin actions taken in this run',
    ['Reviewed an employer registration', 'Created a staff account', 'Reopened a job'].every((s) => text.includes(s)));
}
/* ─── 8. Responsive: no sideways scroll, nav reachable, at 8 widths ─── */

const VIEWPORTS = [320, 375, 390, 430, 768, 1024, 1280, 1440];
const RESPONSIVE_PAGES = ['/admin', '/admin/users', '/admin/jobs', '/admin/applications', ...appDetail, '/admin/users/1', '/admin/audit', '/admin/employer-approvals'];
{
  // Same signed-in context as above: a fresh login would spend the 5/min login allowance.
  const rpage = await ctx.newPage();
  const rw = watch(rpage);
  for (const width of VIEWPORTS) {
    await rpage.setViewportSize({ width, height: width < 768 ? 820 : 900 });
    const overflowing = [];
    for (const p of RESPONSIVE_PAGES) {
      await go(rpage, BASE + p);
      await rpage.waitForTimeout(300);
      const over = await rpage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (over > 1) overflowing.push(`${p} (+${over}px)`);
    }
    check(`${width}px: no horizontal overflow on ${RESPONSIVE_PAGES.length} pages`, !overflowing.length, overflowing.join(', '));

    await go(rpage, `${BASE}/admin/users`);
    if (width < 1024) {
      await rpage.getByRole('button', { name: 'Open admin menu' }).click();
      const drawer = rpage.getByRole('dialog', { name: 'Admin menu' });
      await drawer.getByRole('link', { name: 'Applications' }).click();
      await rpage.waitForURL('**/admin/applications');
      await settle(rpage);
      const open = await rpage.getByRole('dialog', { name: 'Admin menu' }).count();
      const locked = await rpage.evaluate(() => document.body.style.overflow === 'hidden');
      check(`${width}px: drawer navigation works, closes and unlocks scrolling`, open === 0 && !locked, `drawer open: ${open}, scroll locked: ${locked}`);
      // Touch targets: the menu button and every drawer link are at least 40px tall.
      await rpage.getByRole('button', { name: 'Open admin menu' }).click();
      const small = await rpage.getByRole('dialog', { name: 'Admin menu' }).getByRole('link').evaluateAll((els) =>
        els.filter((e) => e.getBoundingClientRect().height < 40).length,
      );
      check(`${width}px: drawer links are touch-sized`, small === 0, `${small} under 40px`);
      await rpage.keyboard.press('Escape');
    } else {
      check(`${width}px: sidebar is visible`, await rpage.getByRole('navigation', { name: 'Admin' }).first().isVisible());
    }
    if ([320, 768, 1440].includes(width)) {
      await go(rpage, `${BASE}/admin/applications`);
      await rpage.screenshot({ path: `${SHOT}/admin-${width}.png`, fullPage: true });
    }
  }
  const rp = rw.take();
  check('responsive pass had no console/API errors', !rp.length, rp.join(' | '));
  await ctx.close();
}

await browser.close();

const fails = results.filter((r) => !r.ok);
console.log(`\n=== ${results.length} checks | ${fails.length} FAIL === (screenshots in ${SHOT})`);
for (const f of fails) console.log(`FAIL ${f.name}${f.info ? ` — ${f.info}` : ''}`);
process.exit(fails.length ? 1 : 0);
