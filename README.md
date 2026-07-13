# Aajiveka — Modern React + Node/TS Rebuild

A production-grade rebuild of **AajivikaPortal**, a recruitment / ATS platform, migrating the
legacy ASP.NET Web Forms app to a modern **React (Vite + TypeScript + Tailwind)** frontend and a
**Node.js + Express + TypeScript** API that reuses the existing **SQL Server** database and its
179 stored procedures.

> **Status — Milestone 1 (foundation + vertical slice).** The shared architecture, design
> system, auth flow and one representative page per role are built end-to-end. Remaining pages
> follow the same patterns (see `Roadmap`).

## Monorepo layout

```
aajiveka/
├── apps/
│   ├── web/     # React 18 + Vite + TS + Tailwind + React Query + RHF/Zod
│   └── api/     # Express + TS + mssql (stored-proc layer) + JWT
├── db/          # Reverse-engineered schema report, DDL, and recovered procs
└── reference/   # Extracted legacy app (read-only reference, git-ignored)
```

## Prerequisites

- Node.js ≥ 20, npm ≥ 10
- (Optional, for real data) SQL Server with `db_aajiveka` restored from `db_aajiveka.bak` — see `db/README.md`.

## Quick start

```bash
# 1. Install all workspaces
npm install

# 2. Generate the MSW mock service worker (one-time, for the web app)
npm --workspace apps/web exec msw init public --save

# 3. Configure env
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env

# 4. Run the frontend (uses the MSW mock API by default — no DB needed)
npm run dev:web        # http://localhost:5173

# 5. (Optional) Run the API against a real SQL Server
npm run dev:api        # http://localhost:4000
```

### Demo logins (mock mode)

The MSW layer seeds one user per role. Password for all: **`demo123`**.

| Username    | Role      | Lands on              |
|-------------|-----------|-----------------------|
| `candidate` | Candidate | `/candidate/profile`  |
| `qc1`       | QC1       | `/recruitment/candidates` |
| `employer`  | Employer  | `/company/profile`    |
| `admin`     | Admin     | `/company/profile`    |

Set `VITE_USE_MOCKS=0` in `apps/web/.env` to talk to the real API instead.

## Architecture highlights

- **Feature-based structure** (`src/features/<feature>/{pages,components,api,types}`).
- **Reusable UI kit** in `src/components/ui` (Button, Input, Select, Card, Modal, Alert, Toast,
  Table, Pagination, Breadcrumbs, Loader, Skeleton, Dropdown).
- **Auth**: JWT with in-memory access token + refresh; Axios interceptors attach the token and
  perform one-shot refresh on 401. Role-based `ProtectedRoute`.
- **Data**: TanStack Query with centralized `queryKeys`; forms via React Hook Form + Zod.
- **Performance**: route-level code splitting (`React.lazy`), manual vendor chunks, lazy images,
  skeleton screens, memoized table columns.
- **API**: every DB access goes through `callProc()` → the recovered stored procedures. Zod
  validation, `helmet`, CORS, rate-limited auth endpoints, centralized error handler, RBAC.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:web` / `dev:api` | Start web / API in watch mode |
| `npm run build` | Build both apps |
| `npm run typecheck` | `tsc --noEmit` across workspaces |
| `npm run lint` | ESLint across workspaces |
| `npm --workspace apps/api test` | API unit tests (proc-caller) |

## Pages built

**Milestone 1 — foundation + vertical slice:** Home, Login, Register (+OTP), Forgot/Reset
password, Candidate Profile, Company Profile, Candidates list, QC1 Dashboard.

**Milestone 2 — public site + dashboards:**
- **Public:** About, Contact, Career, Pricing, Subscription, Resume/Services, Testimonial,
  Privacy, Terms, Blogs + blog detail.
- **Candidate:** CV Manager, Applied Jobs, Job Alerts, Documents (upload), Change Password.
- **Client:** Manage Jobs, Post a Job, Applicants.
- **Recruitment/QC:** Candidate Details, Interviews, Document Verification.

### Remaining (Milestone 3)

Payment/PaymentResponse (BillDesk), company-details, opening/manage-opening, dashboard-messages,
assign-job, interview scheduling/reschedule, and any remaining long-tail `.aspx` — all on the
same architecture, each verified visually against its reference page.

## Security notes

- Secrets live only in `.env` (never committed). The legacy `Web.config` hard-coded DB
  credentials and BillDesk keys — these must be rotated and moved to env.
- The legacy DB stores **plaintext passwords** (`spSecUserLogin`). Plan a migration to hashed
  passwords (bcrypt/argon2) — the `authService` is the single seam to add this.
