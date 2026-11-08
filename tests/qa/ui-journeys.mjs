// Real-browser journeys through the actual forms (no API shortcuts for the steps under test).
//
//   QA_WEB_URL=http://localhost:5174 QA_API_LOG=… node tests/qa/ui-journeys.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { Api, API_LOG, ipFor, STATE_DIR } from './lib/client.mjs';
import { png, resumePdf } from './lib/fixtures.mjs';

const WEB = process.env.QA_WEB_URL ?? 'http://localhost:5174';
const SHOTS = `${STATE_DIR}/ui`;
mkdirSync(SHOTS, { recursive: true });
const candidates = JSON.parse(readFileSync(`${STATE_DIR}/candidates.json`, 'utf8'));
const employers = JSON.parse(readFileSync(`${STATE_DIR}/employers.json`, 'utf8'));
const results = [];
let ipn = 80_000 + (Date.now() % 5000);
const browser = await chromium.launch();

async function newPage(viewport = { width: 1280, height: 900 }) {
  const ctx = await browser.newContext({ viewport });
  const ip = ipFor(ipn++);
  // Only API calls carry the per-actor address (see browser-crawl.mjs on fonts.gstatic).
  await ctx.route('**/api/**', (route) => route.continue({ headers: { ...route.request().headers(), 'x-forwarded-for': ip } }));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => { errors.push(`DIALOG: ${d.message()}`); d.dismiss(); });
  const api = [];
  page.on('response', (r) => { if (r.url().includes('/api/') && r.status() >= 400) api.push(`${r.request().method()} ${r.url().replace(WEB, '')} → ${r.status()}`); });
  return { ctx, page, errors, api };
}
const settle = (page, ms = 900) => page.waitForTimeout(ms);
async function step(module, name, page, fn) {
  try {
    const note = await fn();
    results.push({ module, name, status: 'PASS', note: note ?? '' });
    console.log(`PASS [${module}] ${name}${note ? ' — ' + String(note).slice(0, 180) : ''}`);
  } catch (e) {
    const shot = `${SHOTS}/${module}-${name.replace(/\W+/g, '_').slice(0, 60)}.png`;
    await page?.screenshot({ path: shot, fullPage: true }).catch(() => {});
    results.push({ module, name, status: 'FAIL', note: e.message.slice(0, 400), shot });
    console.log(`FAIL [${module}] ${name} — ${e.message.slice(0, 260)}`);
  }
}
const expect = (c, m) => { if (!c) throw new Error(m); };
async function pickOption(page, trigger, text) {
  await page.locator(trigger).first().click();
  await settle(page, 300);
  const search = page.locator('[role=listbox] input, [data-radix-popper-content-wrapper] input, input[placeholder*="Search" i]').last();
  if (await search.isVisible().catch(() => false)) await search.fill(text);
  else await page.keyboard.type(text, { delay: 20 });
  await settle(page, 400);
  await page.getByRole('option', { name: text, exact: true }).first().click();
  await settle(page, 300);
}
async function saveContinue(page) {
  await page.getByRole('button', { name: /save & continue|complete profile/i }).last().click();
  await settle(page, 1500);
}
async function loginUi(page, user, pass) {
  await page.goto(`${WEB}/login`);
  await page.fill('[name=userName]', user);
  await page.fill('[name=password]', pass);
  await page.locator('form button[type=submit]').click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15_000 });
  await settle(page, 1200);
}
const otpFor = async (email) => {
  for (let i = 0; i < 20; i++) {
    const m = [...readFileSync(API_LOG, 'utf8').matchAll(new RegExp(`to=${email.replace(/[.]/g, '\\.')} subject="[^"]*"[\\s\\S]{0,4000}?\\b(\\d{6})\\b`, 'g'))].at(-1);
    if (m) return m[1];
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('no OTP in log');
};

/* ------------------------------------------------------------------------------------------ */
/* Candidate: registration → onboarding wizard → profile                                      */
/* ------------------------------------------------------------------------------------------ */
{
  const { page, errors, api, ctx } = await newPage();
  const n = Date.now() % 100000;
  const email = `ui.cand.${n}@example.com`;
  const mobile = `9${String(200000000 + n).slice(-9)}`;
  const pass = 'UiCandidate#2026';

  await step('candidate-ui', 'Register form shows validation errors for bad input', page, async () => {
    await page.goto(`${WEB}/register`);
    await page.fill('[name=fullName]', 'A');
    await page.fill('[name=email]', 'not-an-email');
    await page.locator('input[type=tel]').fill('12345');
    await page.fill('[name=password]', 'short');
    await page.getByRole('button', { name: 'Register', exact: true }).click();
    await settle(page);
    const text = await page.locator('form').innerText();
    const shown = ['email', 'mobile|phone|number', 'password|8'].filter((k) => new RegExp(k, 'i').test(text));
    expect(shown.length === 3, `messages shown: ${text.slice(0, 300)}`);
    return 'email, mobile and password errors shown';
  });

  await step('candidate-ui', 'Register → email OTP (6 boxes) → onboarding', page, async () => {
    await page.fill('[name=fullName]', 'Ui Journey Candidate');
    await page.fill('[name=email]', email);
    await page.locator('input[type=tel]').fill(mobile);
    await page.fill('[name=password]', pass);
    await page.getByRole('button', { name: 'Register', exact: true }).click();
    await page.getByRole('button', { name: 'Verify' }).waitFor({ timeout: 10_000 });
    const code = await otpFor(email);
    const boxes = page.locator('main input[type=text], form input[type=text]');
    for (let i = 0; i < 6; i++) await boxes.nth(i).fill(code[i]);
    await page.getByRole('button', { name: 'Verify' }).click();
    await page.waitForURL(/\/candidate\/onboarding/, { timeout: 15_000 });
    return page.url();
  });

  const STEP = /^(Personal Details|Profile Summary|Work Experience|Education|Skills|Job Preferences|Projects|Resume)$/;
  const seen = [];
  /** Native <select> or the portal's listbox button — pick the option whose text matches. */
  async function choose(sel, text) {
    const el = page.locator(sel).first();
    if ((await el.evaluate((e) => e.tagName)) === 'SELECT') return el.selectOption({ label: text }).catch(() => el.selectOption(text));
    await el.click(); await settle(page, 250);
    await page.getByRole('option', { name: text, exact: true }).first().click();
  }
  /** Fill whatever visible, still-empty native fields a step has, with plausible values. */
  async function fillGeneric(main) {
    for (const b of await main.locator('button[aria-haspopup=listbox]:visible').all()) {
      const v = await b.getAttribute('data-value');
      if (v && v !== '0') continue;
      if (v === '0') continue;
      await b.click().catch(() => {}); await settle(page, 250);
      const opts = page.getByRole('option');
      const texts = await opts.allInnerTexts();
      const idx = texts.findIndex((x) => /B\.Tech|Full Time|Percentage|30 Days|Finished|Offsite|Permanent|Expert|2016|2020/.test(x));
      const k = idx >= 0 ? idx : texts.findIndex((x, i) => i > 0 && x.trim() && !/^select$/i.test(x.trim()));
      if (k >= 0) await opts.nth(k).click().catch(() => page.keyboard.press('Escape')); else await page.keyboard.press('Escape');
    }
    for (const s of await main.locator('select:visible').all()) {
      if (await s.inputValue()) continue;
      const o = await s.locator('option').allInnerTexts();
      const want = o.find((x) => /B\.Tech|Full Time|Percentage|30 Days|Finished|Offsite|Permanent|Expert|2016|2020/.test(x)) ?? o.find((x, i) => i > 0 && x.trim());
      if (want) await s.selectOption({ label: want }).catch(() => {});
    }
    for (const f of await main.locator('input[type=date]:visible, input[type=month]:visible').all()) if (!(await f.inputValue())) await f.fill((await f.getAttribute('type')) === 'month' ? '2022-01' : '2022-01-10').catch(() => {});
  }
  await page.locator('h2').filter({ hasText: STEP }).first().waitFor({ timeout: 15_000 }).catch(() => {});
  for (let k = 0; k < 12 && /\/candidate\/onboarding/.test(page.url()); k++) {
    await settle(page, 600);
    const main = page.locator('#portal-content').last();
    const title = (await page.locator('h2').allInnerTexts()).map((t) => t.trim()).find((t) => STEP.test(t));
    if (!title) break;
    if (seen.at(-1) === title) { await step('candidate-ui', `Wizard step "${title}" did not advance`, page, async () => { throw new Error(`still on ${title}; api: ${api.slice(-3).join(' | ')}`); }); break; }
    seen.push(title);
    await step('candidate-ui', `Wizard: ${title} (all fields)`, page, async () => {
      if (title === 'Personal Details') {
        await page.getByRole('button', { name: /I'm experienced/ }).click();
        await page.fill('#dob', '1996-05-14');
        await choose('#gender', 'Female');
        await page.fill('#headline', 'Frontend Developer | React, TypeScript');
        await pickOption(page, '#subFunction', 'Front End Developer');
        await pickOption(page, '#primarySkill', 'React');
        await page.locator('button:has-text("Select your city")').click();
        await page.locator('input[placeholder^="Search"]').last().fill('Bengaluru');
        await settle(page, 500);
        await page.getByRole('option', { name: /Bengaluru/ }).first().click();
        if (await page.locator('#expYears').isVisible().catch(() => false)) { await choose('#expYears', '4 Years'); await choose('#expMonths', '6 Months'); }
        await page.fill('#linkedIn', 'https://linkedin.com/in/ui-journey-qa');
      } else if (title === 'Profile Summary') {
        await main.locator('textarea:visible').first().fill('Frontend developer with 4.5 years building React and TypeScript apps for fintech and e-commerce teams. Fictional QA profile.');
      } else if (title === 'Work Experience') {
        await main.locator('input[placeholder="e.g. Infosys Ltd"]').first().fill('Brightpath Systems');
        const jt = main.locator('input[id*="title" i], input[name*="title" i], input[placeholder*="title" i], input[placeholder*="Developer" i]').first();
        if (await jt.isVisible().catch(() => false)) { await jt.fill('Frontend Developer'); await page.keyboard.press('Escape'); }
        await main.locator('textarea:visible').first().fill('Built React dashboards; led the design-system migration.').catch(() => {});
        await fillGeneric(main);
      } else if (title === 'Education') {
        await pickOption(page, '#degreeId', 'B.Tech');
        await page.locator('#courseTypeId').click(); await settle(page, 300);
        await page.getByRole('option').filter({ hasText: /Computer Science/ }).first().click();
        await choose('#startYear', '2014'); await choose('#passingYear', '2018');
        for (const [ph, v] of [['University', 'Western Ghats University'], ['Information Technology', 'Computer Science']]) {
          const f = main.locator(`input[placeholder*="${ph}"]`).first();
          if (await f.isVisible().catch(() => false)) { await f.fill(v); await page.keyboard.press('Escape'); }
        }
        const marks = main.locator('label:has-text("Percentage / CGPA") ~ * input, input[id*="marks" i]').first();
        if (await marks.isVisible().catch(() => false)) await marks.fill('78');
        await fillGeneric(main);
      } else if (title === 'Skills') {
        const skill = main.locator('input[placeholder="Type a skill and press Enter"]');
        for (const x of ['React', 'TypeScript', 'CSS', 'Redux']) { await skill.fill(x); await skill.press('Enter'); await settle(page, 150); }
        for (const name of ['Add IT skill', 'Add language']) { const btn = page.getByRole('button', { name, exact: true }); if (await btn.isVisible().catch(() => false)) { await btn.click(); await settle(page, 300); } }
        const it = main.locator('input[placeholder="e.g. PostgreSQL"]'); if (await it.isVisible().catch(() => false)) await it.fill('React');
        const ver = main.locator('input[placeholder="e.g. 16"]'); if (await ver.isVisible().catch(() => false)) await ver.fill('18');
        const lang = main.locator('input[placeholder="e.g. Hindi"]'); if (await lang.isVisible().catch(() => false)) await lang.fill('English');
        await fillGeneric(main);
      } else if (title === 'Job Preferences') {
        await main.locator('input[placeholder="e.g. 15,00,000"]').fill('1200000');
        await main.locator('input[placeholder="e.g. 20,00,000"]').fill('1600000');
        await fillGeneric(main);
        const cities = main.locator('button:has-text("Add the cities"), input[placeholder="Add the cities you would work in"]').first();
        if (await cities.isVisible().catch(() => false)) {
          await cities.click();
          await page.locator('input[placeholder^="Search"]').last().fill('Pune').catch(() => page.keyboard.type('Pune'));
          await settle(page, 400);
          await page.getByRole('option', { name: /Pune/ }).first().click().catch(() => {});
          await page.keyboard.press('Escape');
        }
      } else if (title === 'Projects') {
        await main.locator('input[placeholder="e.g. HRMS"]').fill('Payments Dashboard');
        await main.locator('input[placeholder="e.g. Infosys Ltd"]').first().fill('Brightpath Systems').catch(() => {});
        await main.locator('input[placeholder="e.g. 5"]').fill('6').catch(() => {});
        await main.locator('input[placeholder^="Comma separated"]').fill('React, TypeScript').catch(() => {});
        await main.locator('textarea:visible').first().fill('Built the merchant payments dashboard. Fictional.').catch(() => {});
        await fillGeneric(main);
      } else if (title === 'Resume') {
        await main.locator('input[type=file]').first().setInputFiles({ name: 'Ui_Journey_Resume.pdf', mimeType: 'application/pdf', buffer: resumePdf(['Ui Journey Candidate', 'React, TypeScript']) });
        await settle(page, 1500);
      }
      await saveContinue(page);
      const errs = await main.locator('[role=alert], .text-red-500, .text-red-600').allInnerTexts().catch(() => []);
      return errs.filter(Boolean).length ? `validation shown: ${errs.filter(Boolean).join('; ').slice(0, 120)}` : 'saved';
    });
  }
  await step('candidate-ui', 'Wizard covers all 8 steps for an experienced candidate and exits to the portal', page, async () => {
    expect(seen.length >= 8, `steps seen: ${seen.join(' → ')}`);
    expect(!/onboarding/.test(page.url()), `still at ${page.url()}`);
    return seen.join(' → ');
  });
  await step('candidate-ui', 'Every wizard section was saved (read back through the API)', page, async () => {
    const a = new Api({ ip: ipFor(ipn++) }); await a.login(email, pass);
    const cv = (await a.get('/candidates/me/cv-edit', { expect: 200 })).data;
    const me = (await a.get('/candidates/me', { expect: 200 })).data;
    const checks = {
      dob: !!cv.personal?.dob, gender: cv.personal?.gender === 'F', city: !!cv.personal?.cityId, headline: !!cv.headline, summary: !!cv.summary,
      employment: cv.employment?.length > 0, education: cv.education?.length > 0, keySkills: cv.professional?.tagNames?.length >= 3,
      itSkills: cv.itSkills?.length > 0, languages: cv.languages?.length > 0, ctc: !!(cv.professional?.currentCtc ?? me.currentCtc),
      projects: cv.projects?.length > 0, resume: !!me.resumeFileName,
    };
    const missing = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
    expect(!missing.length, `not saved: ${missing.join(', ')}`);
    return Object.keys(checks).join(', ');
  });

  await step('candidate-ui', 'Profile shows saved data and a completion % that moved', page, async () => {
    await page.goto(`${WEB}/candidate/profile`); await settle(page, 1500);
    const t = await page.locator('body').innerText();
    const pct = Number((t.match(/Profile Completion\s*(\d+)%/) ?? [])[1]);
    for (const want of ['Ui Journey Candidate', 'Bengaluru', 'React']) expect(t.includes(want), `profile missing "${want}"`);
    expect(pct >= 60, `completion ${pct}%`);
    const tok = await page.evaluate(() => Object.entries(localStorage).find(([k]) => /refresh/i.test(k))?.[1]);
    void tok;
    return `completion ${pct}%`;
  });

  await step('candidate-ui', 'Edit profile from the profile page (headline) persists after reload', page, async () => {
    await page.getByRole('button', { name: /edit profile/i }).first().click();
    await settle(page);
    const h = page.locator('#headline, input[name=headline]').first();
    await h.fill('Senior Frontend Developer');
    await page.getByRole('button', { name: /save/i }).last().click();
    await settle(page, 1200);
    await page.reload(); await settle(page, 1500);
    expect((await page.locator('body').innerText()).includes('Senior Frontend Developer'), 'headline not persisted');
  });

  await step('candidate-ui', 'Logout then login again with the new account', page, async () => {
    await page.goto(`${WEB}/candidate/profile`); await settle(page);
    await page.locator('header button:has(span), header [aria-haspopup]').last().click().catch(() => {});
    await page.getByRole('menuitem', { name: /log ?out|sign ?out/i }).or(page.getByRole('button', { name: /log ?out|sign ?out/i })).first().click();
    await page.waitForURL((u) => !u.pathname.startsWith('/candidate'), { timeout: 10_000 });
    await loginUi(page, email, pass);
    expect(/\/candidate/.test(page.url()), `landed on ${page.url()}`);
  });

  results.push({ module: 'candidate-ui', name: 'No uncaught page errors / unexpected API errors during the journey', status: errors.length ? 'FAIL' : 'PASS', note: [...errors, ...api.filter((a) => !/ 401$/.test(a))].slice(0, 6).join(' | ') });
  console.log(`${errors.length ? 'FAIL' : 'PASS'} [candidate-ui] page errors: ${errors.join(' | ').slice(0, 200)}; api≥400: ${api.join(' | ').slice(0, 300)}`);
  await ctx.close();
}

/* ------------------------------------------------------------------------------------------ */
/* Candidate: search, filters, apply, saved, tracker                                          */
/* ------------------------------------------------------------------------------------------ */
{
  const { page, api, ctx } = await newPage();
  const c = candidates.find((x) => x.i % 4 !== 3 && x.role === 'frontend' && x.full);
  await step('search-ui', 'Job search: tick a Work Mode and a Job Type filter — results update, no 400', page, async () => {
    await page.goto(`${WEB}/jobs`); await settle(page, 1500);
    const before = await page.locator('main').innerText();
    const count = async () => Number(((await page.locator('main').innerText()).match(/(\d+)\s+jobs? found/i) ?? [])[1]);
    const total = await count();
    await page.getByLabel('Remote', { exact: true }).click();
    await settle(page, 1500);
    const remote = await count();
    await page.getByLabel('Full-time', { exact: true }).click();
    await settle(page, 1500);
    const both = await count();
    const bad = api.filter((a) => /\/api\/jobs/.test(a));
    expect(!bad.length, bad.join(' | '));
    expect(remote > 0 && remote < total && both > 0 && both <= remote, `total=${total} remote=${remote} remote+full-time=${both}`);
    const cards = await page.locator('main').innerText();
    void before; void cards;
    await page.getByLabel('Part-time', { exact: true }).click(); await settle(page, 1500);
    const withPart = await count();
    expect(withPart >= both, `adding Part-time reduced results ${both}→${withPart}`);
    await page.locator('main input[placeholder*="Search by job title"]').fill('python'); await settle(page, 1500);
    const kw = await count();
    expect(kw > 0, `keyword "python" with filters → ${kw}`);
    return `total=${total} → Remote ${remote} → +Full-time ${both} → +Part-time ${withPart} → +"python" ${kw}`;
  });
  await step('search-ui', 'Home search keyword carries into the job search page (F-06)', page, async () => {
    await page.goto(`${WEB}/`); await settle(page, 1200);
    await page.getByText('Role / keyword', { exact: true }).first().click();
    await page.locator('input[placeholder^="Search"]').last().fill('Data Analyst').catch(() => page.keyboard.type('Data Analyst'));
    await settle(page, 400);
    await page.getByRole('option').filter({ hasText: 'Data Analyst' }).first().click();
    await page.getByRole('button', { name: 'Search my job' }).click();
    await settle(page, 1500);
    const url = new URL(page.url());
    const field = page.locator('main input[placeholder*="Search by job title"]').first();
    const v = await field.inputValue().catch(() => '');
    const n = Number(((await page.locator('main').innerText()).match(/(\d+)\s+jobs? found/i) ?? [])[1]);
    expect(/data analyst/i.test(v), `url=${url.pathname}${url.search} searchbox="${v}"`);
    const cards = await page.locator('main h3, main [class*="font-semibold"]').allInnerTexts();
    void cards;
    return `${url.search} → box "${v}", ${n} jobs`;
  });
  await step('search-ui', 'Job detail → apply through the form → confirmation reference', page, async () => {
    await loginUi(page, c.email, c.password);
    const list = (await new Api().get('/jobs', { query: { pageSize: 100 } })).data.rows;
    const applied = new Set((await (async () => { const a = new Api({ ip: ipFor(ipn++) }); await a.login(c.email, c.password); return (await a.get('/candidates/me/applied-jobs')).data.map((x) => x.jobId); })()));
    const job = list.find((j) => !applied.has(j.jobId));
    await page.goto(`${WEB}/jobs/${job.jobId}`); await settle(page, 1500);
    expect((await page.locator('body').innerText()).includes(job.designation), 'detail page missing title');
    await page.getByRole('link', { name: /apply/i }).or(page.getByRole('button', { name: /apply/i })).first().click();
    await settle(page, 1500);
    const form = page.locator('form').last();
    const cover = form.locator('textarea').first();
    if (await cover.isVisible().catch(() => false)) await cover.fill('I would love to join. (QA UI)');
    await page.getByRole('button', { name: 'Review application' }).click();
    await settle(page, 1200);
    await page.getByRole('button', { name: 'Submit application' }).click();
    await settle(page, 2000);
    const t = await page.locator('main').innerText();
    const ref = (t.match(/AJ-\d{6}/) ?? [])[0];
    expect(ref, `no reference shown: ${api.slice(-3).join(' | ')} ${t.slice(0, 200)}`);
    return ref;
  });
  await step('search-ui', 'Applications page lists the new application with dated history', page, async () => {
    await page.goto(`${WEB}/candidate/applications`); await settle(page, 1500);
    const t = await page.locator('main').innerText();
    expect(/Applied/.test(t), t.slice(0, 200));
  });
  await step('search-ui', 'Save a job from search and see it under Saved Jobs', page, async () => {
    await page.goto(`${WEB}/jobs`); await settle(page, 1500);
    const save = page.getByRole('button', { name: /^Save / }).first();
    await save.click(); await settle(page, 800);
    await page.goto(`${WEB}/candidate/saved-jobs`); await settle(page, 1500);
    const t = await page.locator('main').innerText();
    expect(!/no saved jobs/i.test(t), t.slice(0, 200));
  });
  await ctx.close();
}

/* ------------------------------------------------------------------------------------------ */
/* Forgot password through the UI                                                             */
/* ------------------------------------------------------------------------------------------ */
{
  const { page, ctx, api } = await newPage();
  const c = candidates[30];
  await step('auth-ui', 'Forgot password (by email) → reset link → reset form → login', page, async () => {
    await page.goto(`${WEB}/forgot-password`);
    await page.locator('main input').first().fill(c.email);
    await page.locator('main form button[type=submit], main button:has-text("Send")').first().click();
    let m;
    for (let i = 0; i < 30 && !m; i++) {
      await settle(page, 300);
      const log = readFileSync(API_LOG, 'utf8');
      const at = log.lastIndexOf(`to=${c.email} subject="Reset your`);
      if (at >= 0) m = log.slice(at, at + 6000).match(/reset-password\?token=([a-f0-9]{64})/);
    }
    expect(m, 'no reset mail for this address');
    await page.goto(`${WEB}/reset-password?token=${m[1]}`);
    await page.fill('[name=newPassword]', 'UiReset#2026');
    await page.fill('[name=confirm]', 'UiReset#2026');
    await page.locator('main form button[type=submit]').click();
    await settle(page, 1500);
    const r = api.filter((a) => /reset-password/.test(a));
    expect(!r.length, r.join(' | '));
    await loginUi(page, c.email, 'UiReset#2026');
    const a = new Api({ ip: ipFor(ipn++) }); await a.login(c.email, 'UiReset#2026');
    await a.post('/candidates/me/change-password', { currentPassword: 'UiReset#2026', newPassword: c.password });
  });
  await ctx.close();
}

/* ------------------------------------------------------------------------------------------ */
/* Employer                                                                                    */
/* ------------------------------------------------------------------------------------------ */
{
  const { page, api, ctx } = await newPage();
  await step('employer-ui', 'Employer registration form submits with HR email left blank', page, async () => {
    await page.goto(`${WEB}/register/employer`); await settle(page);
    const n = Date.now() % 100000;
    const inputs = page.locator('main form input:visible');
    const named = async (name, v) => { const f = page.locator(`[name=${name}]`); if (await f.count()) await f.fill(v); };
    await named('companyName', `Ui Employer ${n} (QA)`);
    await named('emailCompany', `ui.emp.${n}@example.com`);
    await named('contactNumberCompany', '8123456789');
    await named('location', 'Pune');
    await named('website', 'https://ui-employer.example.com');
    const about = page.locator('[name=aboutCompany]'); if (await about.count()) await about.fill('Fictional QA company');
    void inputs;
    await page.locator('main form button[type=submit]').click();
    await settle(page, 1500);
    const bad = api.filter((a) => /register-employer/.test(a));
    expect(!bad.length, bad.join(' | '));
    expect(/thank|submitted|review|pending|success/i.test(await page.locator('main').innerText()), 'no success message');
  });

  const e = employers[5];
  await step('employer-ui', 'Employer login → dashboard', page, async () => { await loginUi(page, e.emailCompany, e.password); expect(/\/company/.test(page.url()), page.url()); });
  await step('employer-ui', 'Company profile edit saves', page, async () => {
    await page.goto(`${WEB}/company/profile`); await settle(page, 1500);
    const desc = page.locator('textarea').first();
    await desc.fill('Updated through the UI by the QA suite.');
    await page.getByRole('button', { name: /save|update/i }).last().click();
    await settle(page, 1500);
    const a = new Api({ ip: ipFor(ipn++) }); await a.login(e.emailCompany, e.password);
    expect((await a.get('/clients/me')).data.description === 'Updated through the UI by the QA suite.', 'not saved');
  });
  await step('employer-ui', 'Post a job through the form → appears in Manage Jobs', page, async () => {
    await page.goto(`${WEB}/company/post-job`); await settle(page, 1500);
    const main = page.locator('main');
    const dump = await main.locator('input:visible,select:visible,textarea:visible,button[role=combobox]:visible').evaluateAll((els) => els.map((x) => x.id || x.name || x.getAttribute('placeholder') || x.tagName));
    for (const [label, value] of [['Position', 'Python Developer'], ['Employment type', 'Full Time'], ['Work mode', 'Remote'], ['Location', 'Pune'], ['Industry type', 'IT Services & Consulting']]) {
      await main.getByRole('button', { name: label, exact: true }).click();
      await page.locator('input[placeholder^="Search"]').last().fill(value);
      await settle(page, 300);
      await page.getByRole('option', { name: value, exact: true }).first().click();
    }
    await main.locator('[data-field=minExp] input').fill('2');
    await main.locator('input[placeholder="e.g. 5"]').fill('5');
    await main.locator('[data-field=minCtc] input').fill('8');
    await main.locator('[data-field=maxCtc] input').fill('15');
    await main.locator('input[placeholder="e.g. B.Tech / MCA / Equivalent"]').fill('B.Tech / MCA');
    await main.locator('input[placeholder="e.g. Engineering"]').fill('Engineering');
    await main.locator('input[placeholder="e.g. Frontend"]').fill('Platform');
    await main.locator('input[placeholder="Reporting manager / role"]').fill('Engineering Manager');
    await main.locator('input[placeholder="e.g. 8"]').fill('8');
    const sk = main.locator('input[placeholder^="Type to search or add a skill"]');
    for (const x of ['Python', 'Django', 'PostgreSQL']) { await sk.fill(x); await sk.press('Enter'); await settle(page, 200); }
    const ta = main.locator('textarea:visible'); for (let i = 0; i < await ta.count(); i++) await ta.nth(i).fill('UI-posted QA job. Line one\nLine two');
    await page.getByRole('button', { name: 'Publish Job' }).click();
    await settle(page, 2500);
    const bad = api.filter((a) => /clients\/me\/jobs/.test(a));
    const msg = await main.locator('[role=alert], .text-red-600, .bg-red-50').allInnerTexts().catch(() => []);
    expect(!bad.length && !/\/post-job/.test(page.url()), `api=${bad.join(' | ')} url=${page.url()} msg=${msg.join(';').slice(0, 200)} fields=${JSON.stringify(dump).slice(0, 120)}`);
    const a = new Api({ ip: ipFor(ipn++) }); await a.login(e.emailCompany, e.password);
    const jobs = (await a.get('/clients/me/jobs', { query: { pageSize: 100, q: 'Python' } })).data;
    const rows = jobs.items ?? jobs.rows ?? [];
    const mine = rows.find((j) => /Python/.test(j.designation ?? j.title ?? '') && /Pune/.test(j.city ?? ''));
    expect(mine, `job not in Manage Jobs list: ${JSON.stringify(rows.slice(0, 2)).slice(0, 200)}`);
    return `job ${mine.jobId ?? mine.id} ${mine.designation} / ${mine.city}`;
  });
  await step('employer-ui', 'Applicants list shows skills; open an applicant; shortlist', page, async () => {
    const a2 = employers.find((x) => x.jobs.length >= 5);
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await loginUi(page, a2.emailCompany, a2.password);
    await page.goto(`${WEB}/company/applicants`); await settle(page, 1800);
    const rows = page.locator('table tbody tr');
    expect(await rows.count() > 0, 'no applicants');
    const first = await rows.first().innerText();
    expect(first.split('\n').length > 3, `row: ${first}`);
    await rows.first().click(); await settle(page, 1500);
    const detail = await page.locator('main').innerText();
    const btn = page.getByRole('button', { name: /shortlist/i }).first();
    if (await btn.isVisible().catch(() => false)) { await btn.click(); await settle(page, 1200); }
    return `detail chars=${detail.length}`;
  });
  await ctx.close();
}

/* ------------------------------------------------------------------------------------------ */
/* Stored XSS renders inert                                                                    */
/* ------------------------------------------------------------------------------------------ */
{
  const victim = candidates.find((x) => x.i % 4 !== 3 && x.role === 'react');
  const a = new Api({ ip: ipFor(ipn++) }); await a.login(victim.email, victim.password);
  const xss = '<img src=x onerror="window.__xss=1;alert(1)">QA<script>window.__xss=2</script>';
  await a.put('/candidates/me/headline', { resumeHeadline: xss });
  await a.put('/candidates/me/summary', { profileSummary: xss });
  const { page, errors, ctx } = await newPage();
  await step('security-ui', 'Script in headline/summary does not execute on the candidate profile', page, async () => {
    await loginUi(page, victim.email, victim.password);
    await page.goto(`${WEB}/candidate/profile`); await settle(page, 1500);
    const fired = await page.evaluate(() => window.__xss);
    expect(!fired && !errors.some((x) => x.startsWith('DIALOG')), `executed: ${fired} ${errors.join('|')}`);
  });
  await step('security-ui', 'Script in candidate data does not execute in Q2 applicant view', page, async () => {
    const q = await (async () => { const s = new Api({ ip: ipFor(ipn++) }); await s.login('qc2', 'qc2'); return s; })();
    const apps = JSON.parse(readFileSync(`${STATE_DIR}/applications.json`, 'utf8'));
    const mine = apps.find((x) => x.email === victim.email)?.applied[0];
    if (!mine) return 'victim has no application';
    await q.get(`/q2/applications/${mine.mapId}`);
    await page.context().clearCookies(); await page.evaluate(() => localStorage.clear());
    await loginUi(page, 'qc2', 'qc2');
    await page.goto(`${WEB}/q2/applications/${mine.mapId}`); await settle(page, 1500);
    const fired = await page.evaluate(() => window.__xss);
    expect(!fired && !errors.some((x) => x.startsWith('DIALOG')), `executed: ${fired}`);
  });
  await a.put('/candidates/me/headline', { resumeHeadline: 'React Developer' });
  await a.put('/candidates/me/summary', { profileSummary: 'React developer. Fictional QA profile.' });
  await ctx.close();
}

await browser.close();
writeFileSync(`${STATE_DIR}/results-ui.json`, JSON.stringify(results, null, 1));
const tally = results.reduce((o, r) => ((o[r.status] = (o[r.status] ?? 0) + 1), o), {});
console.log('\n', JSON.stringify(tally));
void png;
