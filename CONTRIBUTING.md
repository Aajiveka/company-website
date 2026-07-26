# Contributing to Aajiveka

Thank you for your interest in contributing to the Aajiveka recruitment platform.

## Prerequisites

- **Node.js 22** (LTS)
- **Docker** and **Docker Compose**
- **pnpm** or **npm** (the repo uses npm by default)

## Local Development Setup

```bash
# 1. Clone the repo
git clone https://github.com/Aajiveka/company-website.git
cd company-website

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Fill in POSTGRES_PASSWORD and the two JWT secrets

# 4. Start Postgres and Redis (dev overlay publishes ports 15432 / 16379)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis

# 5. Run API + Web together
npm run dev          # API on :4000, Web on :5173

# Or run individually:
npm run dev:api
npm run dev:web
```

> `apps/api/.env` must use the same `POSTGRES_PASSWORD` as the root `.env`.

## Project Structure

```
apps/web            React 19 SPA (Vite, Tailwind v4, TanStack Query, Zustand)
apps/api            NestJS 11 API (Prisma 7, PostgreSQL 16, Redis/BullMQ)
apps/api/prisma     Schema, migrations, seed, legacy data migration
deploy/             nginx config + deployment guide
tests/              e2e regression suite + BillDesk stub
db/                 Restored legacy database artifacts
```

## Coding Conventions

- **TypeScript strict mode** everywhere -- no `any` unless truly unavoidable.
- **Tailwind CSS v4** for styling. Use the project's design tokens (colors, spacing).
- **i18n**: All user-facing strings go through `react-i18next`. Add keys to the relevant
  namespace JSON files under `apps/web/src/i18n/locales/`.
- **Components**: Feature-based organization (`apps/web/src/features/<domain>/`). Shared UI
  lives in `apps/web/src/components/ui/`.
- **API modules**: Mirror the same domain structure under `apps/api/src/modules/`.
- **Zod** for runtime validation; **RHF** (React Hook Form) for forms.

## Branch Naming and PR Process

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/<scope>-<short-desc>` | `feat/jobs-saved-search` |
| Bug fix | `fix/<scope>-<short-desc>` | `fix/auth-token-refresh` |
| Chore | `chore/<short-desc>` | `chore/upgrade-prisma` |

1. Create a branch from `main`.
2. Make small, focused commits.
3. Open a PR against `main` with a clear title and description.
4. Ensure CI passes (lint, typecheck, e2e).
5. Request review from at least one maintainer.

## Running Tests

```bash
# Type checking and linting
npm run typecheck && npm run lint

# End-to-end tests (requires running API + database)
node tests/e2e.mjs
```

The e2e suite drives every public page and all three roles against a real API and database
with no mocks. It is the primary quality gate.

## Adding Translations

1. Open the relevant namespace file under `apps/web/src/i18n/locales/en/` (e.g., `jobs.json`).
2. Add your key in a logical group.
3. Use the key with `useTranslation('<namespace>')` and `t('your.key')`.
4. Add the same key to every supported locale directory.

## Storybook

```bash
cd apps/web
npx storybook dev -p 6006
```

Story files live next to their components (e.g., `Button.stories.tsx` beside `Button.tsx`).
Use CSF3 format with named exports for each variant.
