# Master System Flow

> One diagram that connects roles, login, dashboards, modules, APIs, services, data stores, notifications and outcomes, followed by focused diagrams for the complex parts. Everything shown exists in code at commit `8de48cf`. Dashed lines mark paths that exist but are broken or unused (see TESTING_AND_ISSUES).

## 1. Master flow

```mermaid
flowchart LR
  %% ---------- Roles ----------
  subgraph ROLES["User roles"]
    direction TB
    RC([Candidate · 1])
    RE([Employer · 4])
    RQ1([QC1 · 2])
    RQ2([QC2 · 3])
    RQ3([Q3 · 7])
    RA([Admin · 5])
    RP([Public visitor])
  end

  %% ---------- Auth ----------
  subgraph AUTH["Login & authentication"]
    direction TB
    L1[/login · role portals/]
    L2[/register + email OTP/]
    L3[/register/employer/]
    AAPI["POST /api/auth/login · refresh · register · verify-otp<br/>AuthService + OtpService"]
    GUARD{{"Global guards<br/>Throttler → JwtAuth → Roles"}}
  end

  %% ---------- Dashboards ----------
  subgraph DASH["Role home / dashboard (ProtectedRoute + ROLE_HOME)"]
    direction TB
    DC["/candidate/profile<br/>CandidatePortalLayout"]
    DE["/company<br/>EmployerLayout"]
    DQ1["/q1/dashboard · Q1Shell"]
    DQ2["/q2/dashboard · Q2Shell"]
    DQ3["/q3/dashboard · Q3Layout"]
    DA["/admin · AdminShell"]
    DP["/ · /jobs · public pages"]
  end

  %% ---------- Modules / APIs ----------
  subgraph API["NestJS API · /api"]
    direction TB
    M_CAND["/candidates · /files<br/>CandidatesService"]
    M_JOBS["/jobs<br/>JobsService · JobApplicationsService"]
    M_PAY["/payments<br/>PaymentsService · Razorpay"]
    M_EMP["/clients<br/>EmployersService"]
    M_Q1["/q1 · Q1Service"]
    M_Q2["/q2 · Q2Service · ScoringService"]
    M_Q3["/q3 · Q3 Read/Referrals/Interviews/Documents"]
    M_REC["/recruitment<br/>CvReferral · InterviewRound · OfferLetter"]
    M_ADM["/admin · AdminService"]
    M_EXP["/exports"]
    M_NOT["/notifications (SSE)"]
    TS(["transitionStatus()<br/>single status write path"])
  end

  %% ---------- Data ----------
  subgraph DATA["Data stores"]
    direction TB
    PG[("PostgreSQL 16<br/>94 Prisma models")]
    RD[("Redis<br/>OTP · BullMQ")]
    FS[("Storage<br/>local disk / S3")]
  end

  %% ---------- Async & integrations ----------
  subgraph ASYNC["Notifications & integrations"]
    direction TB
    QN[["BullMQ notifications<br/>→ SMTP / SES / log"]]
    QX[["BullMQ cv-expiry<br/>hourly"]]
    RZP{{Razorpay}}
    BD{{BillDesk}}
    SMS{{SMS providers}}
  end

  %% ---------- Outcomes ----------
  subgraph OUT["Final outcomes"]
    direction TB
    O1((Joined · 22))
    O2((Rejected · 5))
    O3((CV expired · 23<br/>back to Q2))
    O4((Subscription active))
    O5((Employer approved))
  end

  RP --> DP
  RC --> L1 & L2
  RE --> L3 & L1
  RQ1 & RQ2 & RQ3 & RA --> L1
  L1 & L2 & L3 --> AAPI --> RD & PG
  AAPI --> GUARD
  GUARD --> DC & DE & DQ1 & DQ2 & DQ3 & DA

  DP --> M_JOBS
  DC --> M_CAND & M_JOBS & M_PAY & M_REC & M_NOT
  DE --> M_EMP & M_REC & M_EXP
  DQ1 --> M_Q1 & M_REC
  DQ2 --> M_Q2 & M_REC
  DQ3 --> M_Q3
  DA --> M_ADM & M_EXP

  M_PAY --> RZP
  M_PAY -.->|no settle route| BD
  M_PAY --> O4
  M_JOBS -- apply needs O4 --> TS
  M_EMP & M_Q2 & M_Q3 & M_REC --> TS
  TS --> PG
  M_CAND & M_EMP & M_Q3 & M_Q2 --> FS
  M_Q1 & M_ADM & M_EXP & M_CAND --> PG
  M_ADM --> O5

  M_Q3 & M_REC & AAPI & M_ADM --> QN
  QX --> M_REC
  QN --> RD
  M_NOT -.->|no producer| RC
  SMS -.->|never called| QN

  TS --> O1 & O2 & O3
```

### How to read it

1. **Roles → login.** Candidates self-register with email OTP. Employers submit a registration that an admin must approve. Staff accounts are created by an admin.
2. **Guards.** Every API call passes the throttler, the JWT check and the role check (`apps/api/src/app.module.ts`). On the web, `ProtectedRoute` sends each role to its home (`apps/web/src/types/roles.ts`).
3. **Dashboards → modules.** Each workspace calls its own API module. Shared hiring actions live in `/recruitment`.
4. **Status writes.** All application status changes funnel through `JobApplicationsService.transitionStatus` (`apps/api/src/modules/jobs/job-application.service.ts:167`). It writes the mapping, a status log row and the latest-status table in one transaction.
5. **Async.** Emails go through the BullMQ `notifications` queue. The hourly `cv-expiry` job returns unreviewed CVs to Q2 after 14 days.
6. **Outcomes.** These are joined, rejected, expired (re-queued), subscription active and employer approved.

## 2. Hiring pipeline: hand-offs between desks

```mermaid
flowchart TB
  A[Candidate applies<br/>POST /jobs/:id/apply<br/>status 1] --> B{Q1 screening<br/>/q1}
  A --> C{Q2 matching<br/>/q2 · score 0–100}
  B -.->|Verified is advisory, Q2 does not wait| C
  C -- forward --> D[14 Referred to Q3]
  C -- send back --> B2[11 Need more info<br/>screening = Incomplete]
  B2 -.->|no path back to Q2| C
  C -- reject --> R[5 Rejected]
  D --> E{Q3 validate<br/>/q3/referred}
  E -- return + reason --> C
  E -- forward --> F[15 Sent to company<br/>14-day window]
  F --> G{Company review<br/>employer portal or Q3 capture}
  G -- reject --> R
  G -- no answer 14d --> X[23 CV expired<br/>→ Q2 queue]
  X --> C
  G -- shortlist --> H[Interview rounds<br/>R1 → R2 → R3 → Final]
  H -- reject --> R
  H -- selected --> I[4 Selected<br/>documents requested]
  I --> J[Docs verified by Q3<br/>forwarded → approved]
  J --> K[20 Offer sent]
  K -- accept --> L[21 Offer accepted]
  K -.->|candidate rejects, stays 20| K
  L --> M[22 Joined]
```

## 3. Interview round lifecycle (one round)

```mermaid
stateDiagram-v2
  [*] --> Pending: round created<br/>(employer request, Q3 round-setup, next-round decision)
  Pending --> Pending: Q3 requests slots / edits panel
  Pending --> Scheduled: Q3 confirm slot (invites)<br/>or candidate select-slot
  Scheduled --> RescheduleRequested: Q3 reschedule before start
  Scheduled --> NoShow: Q3 reschedule after start, candidate absent
  RescheduleRequested --> Scheduled: re-confirm
  NoShow --> Scheduled: re-confirm
  Scheduled --> Completed: Q3 conducted (result due 24h)
  Completed --> [*]: decision — NextRound / FinalRound / Hold / Rejected / Selected
```

Two writers record outcomes. Q3 uses `decision`, `decidedAt`, `isFinal` and `ApplicationHiring`. The employer and `/recruitment` path (`submitResult`) uses `result` only. That split is the root cause of TESTING_AND_ISSUES W-01.

## 4. Request lifecycle (any API call)

```mermaid
sequenceDiagram
  participant B as Browser (React + TanStack Query)
  participant AX as axios instance (lib/axios.ts)
  participant NG as nginx (deploy/nginx.conf)
  participant API as NestJS (main.ts)
  participant G as Guards
  participant S as Service
  participant DB as Postgres / Redis / Storage
  B->>AX: useQuery / useMutation
  AX->>NG: /api/... + Bearer access token (+ X-CSRF-Token on writes)
  NG->>API: proxy_pass api:4000 (X-Forwarded-For)
  API->>G: Throttler → JwtAuth (@Public?) → Roles
  G-->>AX: 429 / 401 / 403
  G->>S: ValidationPipe(DTO) → controller → service
  S->>DB: Prisma queries / $transaction
  S-->>API: result or HttpException
  API-->>AX: JSON (AllExceptionsFilter on error)
  AX-->>AX: on 401 → POST /auth/refresh once, replay, on failure → /login
  AX-->>B: data → cache, invalidate feature key on mutations
```

## 5. Account lifecycle per role

```mermaid
flowchart LR
  subgraph Candidate
    c1[register] --> c2[verify OTP] --> c3[onboarding wizard] --> c4[portal]
  end
  subgraph Employer
    e1[register-employer · Pending] --> e2{Admin review}
    e2 -- Approved --> e3[company + login created<br/>temp password emailed] --> e4[/company portal/]
    e2 -- Rejected --> e5[no login]
  end
  subgraph Staff
    s1[Admin creates user<br/>or create-admin.ts] --> s2[set-password link] --> s3[workspace by role]
  end
  subgraph Admin_controls["Admin controls"]
    a1[deactivate / change role<br/>revokes refresh sessions]
  end
  c4 & e4 & s3 -.-> a1
```

Related documents: [COMPLETE_WORKFLOW.md](COMPLETE_WORKFLOW.md) (step-by-step), [ROLE_PERMISSION_MATRIX.md](ROLE_PERMISSION_MATRIX.md), [API_DOCUMENTATION.md](API_DOCUMENTATION.md), [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).
