// Every page, every role, four viewports, against the real QA stack. Records console errors,
// failed API calls, 404 pages, horizontal overflow and blank renders, with a screenshot per page.
//
//   QA_WEB_URL=http://localhost:5174 node tests/qa/browser-crawl.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { ipFor, STATE_DIR } from './lib/client.mjs';

const WEB = process.env.QA_WEB_URL ?? 'http://localhost:5174';
const SHOTS = `${STATE_DIR}/shots`;
mkdirSync(SHOTS, { recursive: true });
const candidates = JSON.parse(readFileSync(`${STATE_DIR}/candidates.json`, 'utf8'));
const employers = JSON.parse(readFileSync(`${STATE_DIR}/employers.json`, 'utf8'));
const cand = candidates.find((c) => c.full && c.withResume && c.withPhoto && c.i % 4 !== 3);
const emp = employers[3];
const jobId = emp.jobs.find((j) => !j.draft).jobId;

const VIEWPORTS = { desktop: { width: 1440, height: 900 }, laptop: { width: 1280, height: 800 }, tablet: { width: 768, height: 1024 }, mobile: { width: 375, height: 812 } };
const PUBLIC = ['/', '/jobs', `/jobs/${jobId}`, '/login', '/register', '/forgot-password', '/pricing', '/about', '/contact', '/blogs', '/career', '/privacy', '/terms', '/register/employer'];
const ROLES = {
  candidate: { user: cand.email, pass: cand.password, pages: ['/candidate/profile', '/candidate/applications', '/candidate/saved-jobs', '/candidate/tracker', '/candidate/interviews', '/candidate/documents', '/candidate/account', '/candidate/notifications', '/candidate/subscription', `/jobs/${jobId}`] },
  employer: { user: emp.emailCompany, pass: emp.password, pages: ['/company', '/company/profile', '/company/jobs', '/company/post-job', `/company/jobs/${jobId}/edit`, '/company/applicants'] },
  qc1: { user: 'qc1', pass: 'qc1', pages: ['/q1/dashboard', '/q1/candidates', '/q1/follow-ups', '/q1/verified', '/q1/analytics'] },
  qc2: { user: 'qc2', pass: 'qc2', pages: ['/q2/dashboard', '/q2/jobs', `/q2/jobs/${jobId}`, '/q2/applicants', '/q2/forwarded', '/q2/analytics'] },
  q3: { user: 'q3', pass: 'q3', pages: ['/q3/dashboard', '/q3/referred', '/q3/company-review', '/q3/scheduling', '/q3/interviews', '/q3/decisions', '/q3/documents', '/q3/offers'] },
  admin: { user: 'admin', pass: 'admin', pages: ['/admin', '/admin/users', '/admin/jobs', '/admin/applications', '/admin/companies', '/admin/audit', '/admin/employer-approvals', '/admin/reports'] },
};

const browser = await chromium.launch();
const results = [];
let ipn = 70_000;

async function settle(page) {
  // SSE keeps the network busy forever, so wait for in-flight /api calls instead of networkidle.
  await page.waitForLoadState('domcontentloaded');
  for (let i = 0; i < 40; i++) {
    const busy = await page.evaluate(() => performance.getEntriesByType('resource').filter((e) => e.name.includes('/api/') && !e.name.includes('/stream') && e.responseEnd === 0).length).catch(() => 0);
    if (!busy) break;
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(700);
}

async function visit(page, path, role, vp) {
  const errs = [], api = [];
  const onErr = (e) => errs.push(`[pageerror] ${String(e.message).slice(0, 140)}`);
  // fonts.gstatic: the per-context X-Forwarded-For header (a test-only throttling lever) turns
  // the font fetch into a CORS preflight that Google rejects — an artifact, not an app error.
  const onCon = (m) => { const t = m.text(); if (m.type() === 'error' && !/401|Failed to load resource|favicon|fonts\.gstatic/.test(t)) errs.push(`[console] ${t.slice(0, 140)}`); };
  const onResp = (r) => { if (r.url().includes('/api/')) api.push({ url: r.url().replace(WEB, ''), status: r.status() }); };
  page.on('pageerror', onErr); page.on('console', onCon); page.on('response', onResp);
  const t0 = Date.now();
  await page.goto(WEB + path, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch((e) => errs.push(`[goto] ${e.message.slice(0, 80)}`));
  await settle(page);
  const ms = Date.now() - t0;
  const info = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    text: document.body.innerText.trim().length,
    notFound: /page not found|404/i.test(document.title + ' ' + (document.querySelector('h1')?.textContent ?? '')),
    url: location.pathname,
    // the widest offending element, to make overflow reports actionable
    culprit: (() => {
      if (document.documentElement.scrollWidth <= window.innerWidth + 1) return null;
      let worst = null;
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.right > window.innerWidth + 1 && r.width > 0 && getComputedStyle(el).position !== 'fixed') {
          if (!worst || r.right > worst.r) worst = { r: Math.round(r.right), tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 60) };
        }
      }
      return worst;
    })(),
  }));
  page.off('pageerror', onErr); page.off('console', onCon); page.off('response', onResp);
  const bad = api.filter((a) => a.status >= 400 && a.status !== 401);
  const shot = `${SHOTS}/${role}-${vp}-${path.replace(/[^a-z0-9]+/gi, '_') || 'home'}.png`;
  await page.screenshot({ path: shot, fullPage: false }).catch(() => {});
  const issues = [
    ...errs,
    ...bad.map((b) => `[api ${b.status}] ${b.url.slice(0, 100)}`),
    ...(info.notFound ? ['[404 page]'] : []),
    ...(info.overflow > 1 ? [`[overflow ${info.overflow}px] ${info.culprit ? `${info.culprit.tag}.${info.culprit.cls}` : ''}`] : []),
    ...(info.text < 40 ? ['[blank page]'] : []),
    ...(path.startsWith('/') && !info.url.startsWith(path.split('?')[0]) && !['/'].includes(path) ? [`[redirected to ${info.url}]`] : []),
  ];
  results.push({ role, vp, path, ms, ok: !issues.length, issues, shot });
  console.log(`${issues.length ? 'FAIL' : 'ok  '} ${role.padEnd(9)} ${vp.padEnd(7)} ${path.padEnd(32)} ${String(ms).padStart(5)}ms ${issues.join(' | ').slice(0, 220)}`);
}

async function loginUi(page, user, pass) {
  await page.goto(`${WEB}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[name="userName"], input[type="email"], input[autocomplete="username"]').first().fill(user);
  await page.locator('input[type="password"]').first().fill(pass);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15_000 });
  await settle(page);
}

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  const ctx = await browser.newContext({ viewport: size, extraHTTPHeaders: { 'X-Forwarded-For': ipFor(ipn++) } });
  const page = await ctx.newPage();
  for (const p of PUBLIC) await visit(page, p, 'public', vp);
  await ctx.close();
  for (const [role, cfg] of Object.entries(ROLES)) {
    const c = await browser.newContext({ viewport: size, extraHTTPHeaders: { 'X-Forwarded-For': ipFor(ipn++) } });
    const pg = await c.newPage();
    try {
      await loginUi(pg, cfg.user, cfg.pass);
    } catch (e) {
      results.push({ role, vp, path: '/login', ok: false, issues: [`[login failed] ${e.message.slice(0, 120)}`] });
      console.log(`FAIL ${role} ${vp} login: ${e.message.slice(0, 120)}`);
      await pg.screenshot({ path: `${SHOTS}/${role}-${vp}-login-failed.png` }).catch(() => {});
      await c.close();
      continue;
    }
    for (const p of cfg.pages) await visit(pg, p, role, vp);
    await c.close();
  }
}
await browser.close();
writeFileSync(`${STATE_DIR}/results-browser-crawl.json`, JSON.stringify(results, null, 1));
const fails = results.filter((r) => !r.ok);
console.log(`\n${results.length - fails.length}/${results.length} page loads clean`);
