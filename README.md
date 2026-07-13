# Aajiveka

Recruitment / ATS platform. A rebuild of **AajivikaPortal** (ASP.NET Web Forms + SQL Server),
working from the legacy backup and reference sources.

| | |
|---|---|
| **Web** | React 19 · Vite 7 · TypeScript · Tailwind v4 · Radix (shadcn structure, Aajiveka skin) · TanStack Query · Zustand · RHF + Zod |
| **API** | NestJS 11 · Prisma 7 · PostgreSQL 16 · Redis · BullMQ · Argon2 · Swagger |
| **Infra** | Docker Compose · nginx · GitHub Actions |

## Run it

```bash
cp .env.example .env      # fill in POSTGRES_PASSWORD and the two JWT secrets
docker compose up -d --build

docker compose exec -e SEED_DEMO_USERS=1 api npm run db:seed
```

The app is on **http://localhost:8080**; the API docs are at **/api/docs**. Migrations apply
on start, and nginx proxies `/api` to the API container — the API is never exposed directly.

Demo logins (**dev/CI only** — the password equals the username): `anuj` (candidate), `qc1`
(QC), `anuj@aajiveka.com` (employer).

See **[deploy/DEPLOYMENT.md](deploy/DEPLOYMENT.md)** for secrets, storage, payments and the
legacy data migration.

## Develop

```bash
npm install
npm run dev:api          # PORT=4100, to match the web proxy
npm run dev              # web on :5173

npm run typecheck && npm run lint
node tests/e2e.mjs       # every page, all three roles, against a REAL api + database
```

`tests/e2e.mjs` is the check that matters. It drives every public page and all three roles
against a real API and database — **no mocks**. Mocks agree with whatever you tell them; this
suite is what caught the frontend sending a search parameter the API rejects.

## Layout

```
apps/web            React SPA — feature-based (auth, candidates, clients, jobs, recruitment, public)
apps/api            NestJS — modules mirror the same domains
apps/api/prisma     schema, migrations, seed, and the legacy data migration
db/                 the restored database: schema, 97 procs, 10 udt types, ER diagram, seed data
deploy/             nginx config + deployment guide
tests/              e2e regression suite + a BillDesk stub
reference/          extracted legacy sources (git-ignored)
```

## Where the schema came from

`db/` is **not** guesswork. `db_aajiveka.bak` was restored on SQL Server and the catalogs read
directly — 73 tables, 97 stored procedures, 10 table-valued types. `db/SCHEMA_REPORT.md` has
the inventory; `db/ER-DIAGRAM.md` has the model.

Three facts drove every schema decision:

- **The legacy database declares zero foreign keys**, and 36 of its 73 tables have no primary
  key. Referential integrity lived entirely in the stored procedures. The relational model was
  *derived* from the `JOIN … ON` clauses in `db/procs/` and then **validated against the real
  data with orphan checks** — `db/foreign-keys.psv` records the confidence of each of the 63
  relations. Not transcribed, and not guessed.
- **A passing orphan check is not proof.** Several columns look like foreign keys, and the data
  does not contradict them, and they are still wrong — a column that is its own `IDENTITY` key,
  a flag that happens to overlap a lookup's ids, a polymorphic column that points at a
  different table depending on the role. Each was only settled by reading the procedure that
  uses it. `db/ER-DIAGRAM.md` lists every one, with the evidence, so nobody re-derives them.
- **13 tables are dead** (no rows, referenced by no procedure) and are omitted.

## Known gaps

Real, and deliberately not papered over:

- **Email and SMS are logged, not sent** until a provider is configured. The API says so at
  boot: *"SMTP not configured — emails will be logged, not sent"*. Sending a reset link that
  never arrives is worse than not claiming to have sent it.
- **BillDesk payment has never run against BillDesk.** There are no sandbox credentials.
  Signing, signature verification, the order lifecycle, amount checking and idempotency are all
  proved end to end against `tests/billdesk-stub.mjs`, which implements BillDesk's documented
  ve1_2 contract — but that proves *our* side, not that BillDesk agrees with our reading of its
  spec. **A sandbox run is required before go-live.**
- **The credentials in the legacy `Web.config` are compromised** — the BillDesk merchant key,
  the 2Factor SMS key, the SMTP password and the production SQL Server `sa` password were all
  committed in plaintext. Rotate them; do not reuse any of them.
