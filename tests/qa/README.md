# QA suite — bulk data, workflows, browser, load

Drives the **real** API and web app (no mocks). Local or staging only: every script refuses a
non-localhost API unless `QA_ALLOW_REMOTE=1`, and refuses an API reporting `env=production`.

| Script | What it does |
|---|---|
| `seed-candidates.mjs [n]` | n candidates (default 1,000) via register → email OTP → every profile section → resume + photo, across 9 experience bands |
| `seed-employers.mjs [n]` | n employers (default 100) via public registration → admin approval → login with the mailed temporary password → profile + logo → 3–6 jobs each |
| `seed-applications.mjs` | Subscription fixture for 75% of candidates (Razorpay has no offline sandbox), then search → apply, saved jobs, duplicate-apply checks |
| `workflows.mjs` | ~80 API cases: candidate, employer, full lifecycle, matching, security, DB integrity |
| `browser-crawl.mjs` | Every page for 6 roles × desktop/laptop/tablet/mobile: console errors, API ≥400, 404, overflow, blank |
| `ui-journeys.mjs` | Real-form journeys: register + 8-step wizard, search filters, apply, forgot password, employer post job, XSS |
| `load.mjs [levels] [s]` | Concurrent virtual users (default 10,25,50,100 for 20 s each) |
| `run-all.sh` | All of the above in order |

## Environment

The API must run with `EMAIL_DRIVER=log` (OTPs, temporary passwords and reset links are read
from its log — nothing is ever sent) and a high `THROTTLE_LIMIT_PER_MIN`. Each synthetic actor
sends its own `X-Forwarded-For`, so per-IP auth limits (5 logins/min) still apply per actor.
That header only works when the API is reached directly; behind nginx it is overwritten.

```bash
createdb aajiveka_qa && (cd apps/api && DATABASE_URL=… npx prisma migrate deploy && SEED_DEMO_USERS=1 DATABASE_URL=… npm run db:seed)
PORT=4100 EMAIL_DRIVER=log THROTTLE_LIMIT_PER_MIN=100000 DATABASE_URL=…/aajiveka_qa REDIS_URL=redis://localhost:6379/5 \
  node apps/api/dist/main.js > /tmp/qa-api.log 2>&1 &
(cd apps/web && VITE_API_PROXY=http://localhost:4100 npx vite --port 5174) &
QA_API_LOG=/tmp/qa-api.log QA_STORAGE_ROOT=… QA_DATABASE_URL=…/aajiveka_qa tests/qa/run-all.sh
```

Run state (accounts, results JSON, screenshots) goes to `tests/qa/.state/` (git-ignored).
The data is deterministic: re-running on the same database collides with existing accounts,
so start from a freshly seeded database.
