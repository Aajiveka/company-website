# QA Test Report — 1,000 candidates / 100 employers

> Run 2026-11-08 against an **isolated local QA stack** built from `main` (`358ab06`) plus the fixes listed below.
> Every result here was executed and verified; nothing is inferred from reading code alone.

## 0. Environment and method

| | |
|---|---|
| Database | `aajiveka_qa` — a new PostgreSQL 16 database, migrated and seeded from scratch. The dev database `aajiveka` and production were **not touched**. |
| API | Built `dist/` on :4100, `EMAIL_DRIVER=log`, `SMS_DRIVER=log` (OTPs, temporary passwords and reset links read from the log — **no email/SMS was sent**), Redis db 5, own storage dir |
| Web | Vite dev server :5174 and **production build** (`vite build` + preview) :5175 |
| Payments | Razorpay has no offline sandbox. Subscriptions for 750 candidates were written as a marked DB fixture (`OrderRef QA-FIXTURE-*`); the 403 gate for unsubscribed candidates was tested live |
| Tooling | Reusable suite in `tests/qa/` (see its README): data generators, ~80 API cases, 4-viewport browser crawl, real-form UI journeys, load test; Playwright (Chromium), Lighthouse 12.6 |

Why not the live site: bulk-creating 1,100 accounts, applications and interviews on production would pollute real data and trigger real mail; the brief requires staging for bulk data.

## 1. Totals (verified in the database)

| Entity | Count |
|---|---|
| Candidates created (register → email OTP → full profile) | **1,000** (1,000 logins, 0 duplicates) |
| Employers created (register → admin approval → login → profile + logo) | **100** (100 logins, 0 duplicates) |
| Jobs | **445** (404 active, 41 drafts) across 24 roles, 16 industry groups, 4 employment types, 5 work modes |
| Applications | **1,497** (from 750 subscribed candidates; 250 left unsubscribed for the 403 gate) |
| Saved jobs / resumes / photos | 701 / 888 / ~580 |

Candidate mix: freshers 120, interns 80, 0–1 y 110, 1–2 y 110, 2–3 y 110, 3–5 y 130, 5–8 y 130, 8–10 y 100, 10+ y 110; 597 employed / 403 not; 485 immediate joiners, 515 with 15–90-day notice; 60 career-gap; 152 remote-only; 437 relocation-ready; 692 with every optional section filled.

## 2. Results by module

| Module | Result | Evidence |
|---|---|---|
| Candidate workflow | **PASS** (2 N/A) | Registration validation, OTP (wrong/expired/reuse/resend cooldown), login by email & mobile, refresh rotation, logout, forgot → reset (UI + API), every profile section incl. resume upload/replace/download/delete, search & filters, apply, duplicate apply (400), saved jobs, applied jobs + history, settings. N/A: withdraw (not implemented), in-app notifications (not implemented) |
| Employer workflow | **PASS with gaps** | Registration (incl. blank HR email), admin approve/reject, login, profile edit, logo, job create/edit/publish/close/reopen, applicants + filters, profile view, resume download, shortlist/undo/reject, notes, interview request, Hire. Gaps: no forced change of the emailed temporary password; no employer notifications/settings pages; no cross-applicant candidate search (by design) |
| Application lifecycle | **PASS** | Applied → Q2 review → Q3 → sent to company → shortlisted → R1 scheduled → conducted → final round → selected → documents → offer → accepted → joined; and a reject path. DB status, candidate view and employer view agree at every step; log rows written; out-of-order transitions refused |
| Matching | **PASS — 95.9 % accuracy** | All 1,493 applications scored: precision 98.6 %, recall 96.7 %; relevant avg 82.1 vs irrelevant 43.9 (before fixes: relevant avg 65.3, only 75 % recognised) |
| API | **PASS** | Consistent error shape, correct 400/401/403/404/409/429 codes, 0 server errors in the final run |
| Database | **PASS** | Exact counts, no duplicates, no orphans across 7 relations, all 984 stored files present, admin stats = DB |
| Responsive UI | **PASS** | 228/228 page loads clean (6 roles × 4 viewports: 1440/1280/768/375): no console errors, failed API calls, 404s, horizontal overflow or blank pages |
| UI journeys (real forms) | **PASS 29/29** | On the production build |
| Performance — API | **PASS** | 0 errors at 10/25/50/100 concurrent users (zero think time); p95 26 / 61 / 146 / 450 ms; ~750–885 req/s on one Node process |
| Performance — front end | **PARTIAL** | Desktop Lighthouse 96–98, CLS 0.000 everywhere; mobile 74–75 with LCP 5.3–5.9 s on simulated slow 4G |
| Security | **PARTIAL** | All authz/IDOR/injection/XSS/rate-limit checks pass after fixes; 2 open items (§5) |

## 3. Performance detail

**Load (final run, 20 s per level)**

| Users | Requests | req/s | 5xx | p50 | p95 | p99 | Slowest p95 endpoint |
|---|---|---|---|---|---|---|---|
| 10 | 15,216 | 761 | 0 | 9 ms | 26 ms | 46 ms | Q2 applicants 312 ms |
| 25 | 17,695 | 885 | 0 | 24 ms | 61 ms | 80 ms | Q2 applicants 96 ms |
| 50 | 15,276 | 764 | 0 | 54 ms | 146 ms | 207 ms | recommendations / Q2 applicants 224 ms |
| 100 | 10,709 | 535 | 0 | 155 ms | 450 ms | 564 ms | Q2 applicants 698 ms |

Hot spots at 100 users are the list endpoints that load every row and paginate in memory (Q2 applicants, admin stats, employer applicants) and the new ranked recommendations.

**Lighthouse (production build)**

| Page | Before (mobile / desktop perf, CLS) | After |
|---|---|---|
| `/` | 66 / 72, CLS 0.53 desktop | 74 / 96, CLS 0 |
| `/jobs` | 68 / 96 | 75 / 98 |
| `/jobs/:id` | 68 / 85, CLS 0.22 | 74 / 97, CLS 0 |
| `/login` | 45 / 86, CLS 0.70 | 75 / 98, CLS 0 |
| `/register` | 42 / 86, CLS 0.81 | 75 / 98, CLS 0 |

Accessibility 90–95, Best Practices 100, SEO 92–100 (61 on login/register: `noindex` and no canonical).

## 4. Bugs found and fixed

Every fix was retested by the suite that found it, plus API unit tests (201/201), web unit tests (579/579), typecheck and lint on both apps.

| ID | Sev | Module | Defect (actual result) | Root cause | Fix | Retest |
|---|---|---|---|---|---|---|
| BUG-01 | Critical | Search (web) | Ticking any Job Type / Work Mode filter or picking a location → 400, search breaks (F-04) | axios serialised arrays as `workModes[]=`, rejected by whitelist validation | `paramsSerializer: { indexes: null }` (`apps/web/src/lib/axios.ts`) | PASS (API + browser) |
| BUG-02 | Critical | Security | Any signed-in user could download any stored file (CVs, ID documents) by key (S-01) | Generic `/files/:folder/:sub/:name` had no ownership check | Owner (key prefix) or staff only, else 404 (`files.controller.ts`) | PASS |
| BUG-03 | Critical | Security | Employer could point the **public** logo URL at any stored file, e.g. a candidate CV (S-02) | `companyLogo` accepted any string; registration logo text copied on approval | Only `''` accepted; approval no longer copies it (`employers.dto.ts`, `admin.service.ts`) | PASS |
| BUG-04 | High | Search | Full-time / Part-time filters returned 0 jobs; legacy "Work From Home/Office" jobs invisible to Remote/In-office filters | UI labels ≠ master labels; literal matching | Label normalisation + synonyms (`jobs.service.ts`) | PASS (402 → Remote 163 → +Full-time 128) |
| BUG-05 | High | Search | Search box ("title, keyword or company") found nothing for "python" or a company | Term sent as exact `designation` | New `q` keyword param (designation/company/skill, substring) | PASS |
| BUG-06 | High | Employer | Applicant list and detail showed **no skills** for every candidate | Read only `tblSubscriberTags` (7 master tags) | Merge Key Skills text + tags (`employers.service.ts`) | PASS (UI screenshot) |
| BUG-07 | High | Matching | Key-skills-only candidates scored 0 on skills; extra skills lowered the score; job-role match almost never 100; preferred cities ignored | IT-skills table only; Jaccard; sub-function id vs designation id (different masters) | Skills = IT + key skills, coverage ratio, role match by designation/normalised name, preferred cities (`scoring.service.ts`, `q2.service.ts`) | PASS (95.9 % accuracy) |
| BUG-08 | High | Lifecycle | Employer "Hire" left Q3 stuck at "Decision"; documents → offer → joined never opened (W-01) | Employer path didn't write `decision`/`selectedAt`/doc requests | `recordSelection` mirrors Q3's Selected (`interview-round.service.ts`) | PASS |
| BUG-09 | High | Auth | Forgot password with an **email** replied "link sent" but sent nothing | Lookup by UserName only (mobile for candidates) | Same email fallback as login (`auth.service.ts`) | PASS (UI) |
| BUG-10 | High | Employer | Employer sign-up failed when HR email left blank (F-01); company email > 50 chars passed then crashed approval with 500 | `IsEmail` on `''`; no length cap | `ValidateIf` blank; `MaxLength(50)` | PASS (UI) |
| BUG-11 | Medium | Email | Reset and other emails' plain-text part had **no link** | `stripHtml` dropped `href` | Keep "label: url" | PASS |
| BUG-12 | Medium | Candidate | Status history showed "Applied" twice and no date on every later step | Read never-written `MappedTimestamp`; synthetic Applied always added | Use `TimestampIns`, synthetic only as fallback | PASS |
| BUG-13 | Medium | Candidate | 8 of 12 notification preferences reverted on reload (F-07) | Upsert wrote 4 fields | Write all 12 | PASS |
| BUG-14 | Medium | Employer | Company profile saved "not-an-email"; long name / bad city → 500 | No `IsEmail`/`MaxLength`; FK unchecked | DTO limits + FK checks | PASS |
| BUG-15 | Medium | Jobs | Jobs saved with min CTC > max CTC or min exp > max exp; unknown designation → 500 | No range/FK checks | `assertJobInput` on create + edit | PASS |
| BUG-16 | Medium | API | DB constraint violations returned 500 everywhere (D-04) | Prisma errors unmapped | Global filter maps P2000/P2002/P2003/P2025 → 400/409/400/404 | PASS (0 5xx) |
| BUG-17 | Medium | Security | A text file renamed `.pdf` accepted as a CV | Only MIME + extension checked | Magic-byte check (`storage.service.ts`) | PASS |
| BUG-18 | Medium | Candidate | Recommendations were "any job in your city or industry" — 0/19 relevant for a Python developer | Skills via tag index; no ranking | Ranked by role, skills, city, industry | PASS (all 6 Python jobs first) |
| BUG-19 | Medium | Data | Fresh environments had duplicate dropdown entries (Hybrid ×2, Contract ×2, 8 designations); "Work From Home" / "Full Time" ids lost | Migrations insert labels before the seed's id-keyed `DO NOTHING` | Seed restores legacy labels on id clash (`seed.ts`) | PASS (fresh DB) |
| BUG-20 | Medium | UX/perf | Layout shift 0.5–0.8 on public pages | Footer painted in viewport before lazy page loaded | `min-h-svh` on `<main>` | PASS (CLS 0) |
| BUG-21 | Medium | Search | Home search keyword dropped on the job page (F-06) | `?designation=` vs `?q=` | Page reads both | PASS (UI) |
| BUG-22 | Low | Security | Draft jobs readable by anyone at `/jobs/:id` | Detail unfiltered | Drafts 404 publicly | PASS |
| BUG-23 | Low | Perf | 140 KB of PDF code preloaded on every page | `manualChunks` pinned a shared helper | Removed `pdf-vendor` chunk | PASS |
| BUG-24 | Low | Candidate | Dashboard `interviewCount` always 0; API `profileCompletion` capped at 90 % | Legacy interview table only; skills via tags | Count interview rounds; key skills count | PASS |
| BUG-25 | Low | Q2 | Q2 card showed "12th" for graduates | Last-entered education row | Order by passing year | PASS |

## 5. Remaining issues (not fixed)

| Sev | Issue | Why not fixed here |
|---|---|---|
| High | Employer's temporary password is emailed in plain text and never has to be changed; employers have no change-password at all (S-10) | Needs a new endpoint + first-login UI flow |
| Medium | Access tokens stay valid up to 15 min after logout/deactivation (S-05) | Needs a per-request session check (design decision on cost) |
| Medium | **Deploy note:** stored match scores (`tblCandidateJobScore`) were computed by the old scorer and are only recomputed when missing — re-score existing applications after deploying | Data operation on production |
| Medium | **Deploy note:** check production masters for duplicates (`SELECT "Descr", count(*) FROM "tblMstrWorkMode" GROUP BY 1 HAVING count(*) > 1`, same for EmpType/Designation/Skills) if it was seeded after the Aug-10 migrations | Can't inspect production from here |
| Medium | In-app notifications are never created; bell badges show "1"/a dot with nothing behind them | Feature not implemented |
| Medium | No application withdrawal (W-08) | Feature not implemented |
| Medium | Mobile LCP 5.3–5.9 s (slow 4G): ~700 KB JS, four web-font families | Bundle/font work, measurable separately |
| Medium | List endpoints paginate in memory (Q2 applicants, employer applicants, admin stats): p95 0.5–0.7 s at 100 users | Query refactor |
| Medium | Employers see pre-screening applicants with full contact details (S-09) | Product decision |
| Low | Accessibility: colour contrast, heading order; post-job form labels are `<span>`s (inputs have no accessible name) | — |
| Low | Wizard accepts a work-experience entry with no job title (shown as "Role"); apply form pre-fills LinkedIn with the portfolio URL; floating mascot widget overlaps content bottom-right on mobile | — |
| Info | Not in the masters: Freelance employment type; MERN Stack Developer, Project Manager, Accountant designations (mapped to Full Stack Developer / Product Manager / Finance Executive). No company-size or verification-document fields; gender is M/F only | Data/product decisions |
| Info | Razorpay checkout not exercised (no offline sandbox); a sandbox run is still required before go-live | — |

## 6. Readiness

**Not yet production-ready; close.** The three critical defects (search filters, file exposure ×2) and every high-severity functional defect found are fixed and retested, and the platform held 100 concurrent zero-think-time users with no errors. Before go-live: deploy these fixes, re-score stored matches, check production masters for duplicates, add forced password change for employers (S-10), decide on S-05, and run a Razorpay sandbox payment.

## 7. Re-running

See `tests/qa/README.md`. Results and screenshots land in `tests/qa/.state/` (git-ignored).
