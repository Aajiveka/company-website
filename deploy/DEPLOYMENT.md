# Deployment

## Prerequisites

- Docker + Docker Compose
- The four secrets below. Nothing boots without them — the API validates its environment at
  startup and refuses to start in production with a missing or weak secret.

## 1. Configure

```bash
cp .env.example .env
```

Fill in:

```bash
POSTGRES_PASSWORD=$(openssl rand -hex 16)
JWT_ACCESS_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)   # MUST differ from the access secret
```

Access and refresh tokens are signed with **separate** secrets. Reusing one for both makes a
refresh token usable as an access token — that was a real bug in the Express API.

## 2. Run

```bash
docker compose up -d --build
```

The API applies pending migrations on start (`prisma migrate deploy`, which only replays
committed migrations — it never generates or resets). Postgres and Redis have healthchecks,
and the API waits for both.

The app is on **http://localhost:8080** (nginx serves the SPA and proxies `/api` to the API
container; the API is never exposed directly).

## 3. Seed

```bash
docker compose exec api npx tsx prisma/seed.ts
```

That loads the master/lookup data (real values from the restored backup: designations,
cities, statuses, roles). It does **not** create logins.

For a dev or CI database that needs the three demo roles:

```bash
docker compose exec -e SEED_DEMO_USERS=1 api npx tsx prisma/seed.ts
```

**Never set `SEED_DEMO_USERS=1` in production** — the demo passwords equal the usernames.

## Migrating the legacy data

`apps/api/prisma/migrate-data.ts` copies the legacy database into Postgres. It needs the
restored SQL Server running (see `db/README.md`). It hashes the plaintext passwords with
Argon2id, maps sentinel zeros to NULL, and reports every orphaned row it had to NULL rather
than silently coercing it.

It will also tell you that candidate logins have **no SubscriberID link**. That is real: the
legacy schema records no mapping between `tblSecUser` and `tblSubscriberRegistration`, and
the C# that knew it was not recovered. Those users get a 404 on `/candidates/me` until the
mapping is supplied. Do not guess it — guessing hands one candidate another candidate's CV.

## What is NOT sending

Email and SMS are **logged, not sent**, unless you configure a provider. The API says so at
boot:

```
SMTP not configured — emails will be logged, not sent
2Factor not configured — SMS will be logged, not sent
```

Set `SMTP_*` and `TWOFACTOR_API_KEY` to send for real. **The credentials in the legacy
`Web.config` are compromised** (they were committed in plaintext, along with the BillDesk
merchant key and the production SQL Server `sa` password) and must be rotated first.

## Payments (BillDesk)

Set `BILLDESK_CLIENT_ID`, `BILLDESK_MERCHANT_ID` and `BILLDESK_SECRET_KEY`. Without them,
`POST /payments/orders` returns a clear 400 rather than pretending.

**It has never been run against BillDesk.** We have no sandbox credentials, and the ones in
the legacy `Web.config` are compromised. Everything on our side is proved end to end against
`tests/billdesk-stub.mjs` — signing, signature verification, the order lifecycle, amount
checking, idempotency — but that only proves our side. **Do a sandbox run before go-live.**

The design, for review:

- The amount is read from the plan in the database and copied onto the order. It is never
  taken from the client; the request DTO has no amount field at all.
- A subscription is activated **only** by the server-to-server webhook, whose JWS signature
  is verified before the payload is read. The browser redirect is a UI hint — it arrives
  through the user's own browser, so trusting it would let anyone mark their own order paid.
- If the settled amount does not match the order, the payment is **failed and audited**, not
  honoured.
- Webhook delivery is idempotent: a unique constraint on `Subscription.OrderID` means a
  redelivery cannot extend a subscription twice, even under a race.
- A renewal extends from the current expiry, not from today, so renewing early does not throw
  away time already paid for.

## Storage

`STORAGE_DRIVER=local` writes to the `uploads` volume and serves through the API.
`STORAGE_DRIVER=s3` needs `S3_BUCKET` and AWS credentials; the bucket stays private and the
API hands out short-lived signed URLs.

## Health

```bash
curl http://localhost:8080/api/health     # {"status":"ok","db":"up"}
docker compose ps                          # every service reports healthy
```

## Operating notes

- **Backups**: the `pgdata` volume is the database. Back it up.
- **Scaling the API**: `docker compose up -d --scale api=3`. `migrate deploy` takes an
  advisory lock, so concurrent starts are safe. Sessions are in Postgres and the OTP store is
  Redis, so nothing is held in a single process's memory.
- **Logs**: `docker compose logs -f api`.
