# Aajiveka

Recruitment / ATS platform. A rebuild of **AajivikaPortal** (ASP.NET Web Forms + SQL Server)
on a modern stack, working from the legacy backup and reference sources.

| | |
|---|---|
| **Web** | React 19 · Vite 7 · TypeScript · Tailwind v4 · Radix (shadcn structure, Aajiveka skin) · TanStack Query · Zustand · RHF + Zod |
| **API** | NestJS 11 · Prisma 7 · PostgreSQL 16 · Redis · BullMQ · Argon2 · Swagger |
| **Infra** | Docker Compose · nginx · GitHub Actions |

## Run it

```bash
docker compose up -d --build                                  # http://localhost:8080
docker compose exec -e SEED_DEMO_USERS=1 api npx tsx prisma/seed.ts
```

Demo logins (dev/CI only — password equals the username): `anuj` (candidate), `qc1` (QC),
`anuj@aajiveka.com` (employer).

See **[deploy/DEPLOYMENT.md](deploy/DEPLOYMENT.md)** for configuration, secrets and the
legacy data migration.

## Develop

```bash
npm install
npm run dev              # web on :5173, proxying /api to :4100
npm run dev:api          # api on :4000 (PORT=4100 to match the web proxy)

npm run typecheck && npm run lint
node tests/e2e.mjs       # drives every page and all three roles against the real API
```

`tests/e2e.mjs` is the regression suite that matters: it runs against a **real API and
database, no mocks**. It is what caught the frontend sending a search parameter the API
rejects.

## Layout

```
apps/web            React SPA — feature-based (auth, candidates, clients, jobs, recruitment, public)
apps/api            NestJS — modules mirror the same domains
apps/api/prisma     schema, migrations, seed, and the legacy data migration
db/                 the restored database: schema, 97 procs, 10 udt types, ER diagram, seed data
deploy/             nginx config + deployment guide
tests/e2e.mjs       end-to-end regression suite
reference/          extracted legacy sources (git-ignored)
```

## Where the schema came from

`db/` is **not** guesswork. `db_aajiveka.bak` was restored on SQL Server and the catalogs read
directly — 73 tables, 97 stored procedures, 10 table-valued types. `db/SCHEMA_REPORT.md` has
the inventory; `db/ER-DIAGRAM.md` has the model.

Two facts drove every schema decision:

- **The legacy database declares zero foreign keys**, and 36 of its 73 tables have no primary
  key. Referential integrity lived entirely in the stored procedures. The relational model was
  therefore *derived* from the `JOIN … ON` clauses in `db/procs/` and then **validated against
  the real data with orphan checks** — see `db/foreign-keys.psv`, which records the confidence
  of each of the 66 relations. It was not transcribed, and it was not guessed.
- **13 tables are dead** (no rows, referenced by no procedure) and are omitted.

## Known gaps

These are real, and deliberately not papered over:

- **Email and SMS are logged, not sent** until a provider is configured. The API says so at
  boot. The credentials in the legacy `Web.config` are compromised and must be rotated.
- **BillDesk payment is implemented but NOT verified against BillDesk.** We have no sandbox
  credentials, and the ones in the legacy `Web.config` are compromised. The signing,
  verification, order lifecycle, amount checking and idempotency are proved end to end
  against `tests/billdesk-stub.mjs`, which implements BillDesk's documented ve1_2 contract.
  That proves *our* side — not that BillDesk agrees with our reading of its spec. **A sandbox
  run is required before go-live.**
- **Candidate logins migrated from the legacy DB have no `SubscriberID` link**, because the
  legacy schema records none. They get a 404 on `/candidates/me` until the mapping is
  supplied. Guessing it would hand one candidate another candidate's CV.
