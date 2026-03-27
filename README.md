# IZLedger

IZLedger is a monorepo with:

- `apps/web`: React + Vite frontend
- `apps/api`: Fastify + Prisma backend
- `packages/shared`: shared domain types

The app is API-backed. Frontend requests go through the backend, and auth uses HTTP-only cookie sessions.

## Local setup

1. Install dependencies:

```bash
npm install
```

If you run the repo from WSL, make sure `npm` also comes from WSL/Linux instead of `C:\\Program Files\\nodejs\\npm`. A mixed Windows `npm` + Linux `node` shell can start the app with the wrong runtime context and cause hard-to-debug local auth or database issues.

2. Create env files:

```bash
cp apps/api/.env.example apps/api/.env.local
cp apps/web/.env.example apps/web/.env.local
```

3. Start backend dependencies from `apps/api` if you use the included Docker stack:

```bash
cd apps/api
docker compose up -d
cd ../..
```

4. Generate Prisma client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate:dev
```

5. Prepare the dedicated integration test database when you want the API suite to run against a clean Postgres volume:

```bash
npm run test:db:prepare --workspace @izledger/api
```

6. Start both apps:

```bash
npm run dev
```

The root dev launcher now:

- creates `apps/api/.env.local` and `apps/web/.env.local` from their examples when missing
- validates that local frontend and backend URLs agree before starting
- applies committed Prisma migrations to the local API database before booting the backend
- uses the ports and core URLs from the local env files instead of silently overriding them
- only supplements WSL-safe temp-directory vars for the API process

Default local app URLs:

- web: `http://localhost:5173`
- api: `http://localhost:4000`

## Required env vars

Frontend in `apps/web/.env.local`:

```bash
VITE_APP_ENV=local
VITE_API_BASE_URL=http://localhost:4000
```

Backend in `apps/api/.env.local`:

```bash
NODE_ENV=development
APP_ENV=development
APP_DEBUG=false
PORT=4000
HOST=0.0.0.0
APP_URL=http://localhost:5173
API_URL=http://localhost:4000
CORS_ALLOWED_ORIGINS=http://localhost:5173
DATABASE_URL=postgresql://...
DIRECT_URL=
SESSION_COOKIE_NAME=izledger_session
SESSION_TTL_DAYS=14
SESSION_COOKIE_SAME_SITE=lax
COOKIE_DOMAIN=
SESSION_COOKIE_SECURE=false
BCRYPT_ROUNDS=12
AUTH_RATE_LIMIT_MAX=10
AUTH_RATE_LIMIT_WINDOW_MINUTES=1
STORAGE_ENABLED=false
STORAGE_BUCKET=
STORAGE_REGION=auto
STORAGE_ENDPOINT=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_PUBLIC_BASE_URL=
STORAGE_FORCE_PATH_STYLE=true
STORAGE_SIGNED_READS=true
STORAGE_SIGNED_READ_TTL_SECONDS=900
# Use `trading-economics` in production for real historical and future calendar ranges.
ECONOMIC_CALENDAR_PROVIDER=fair-economy
ECONOMIC_CALENDAR_PROVIDER_URL=https://nfs.faireconomy.media/ff_calendar_thisweek.json
ECONOMIC_CALENDAR_TRADING_ECONOMICS_BASE_URL=https://api.tradingeconomics.com
ECONOMIC_CALENDAR_TRADING_ECONOMICS_API_KEY=
ECONOMIC_CALENDAR_PROVIDER_TIMEOUT_MS=7000
ECONOMIC_CALENDAR_CACHE_TTL_SECONDS=300
LOG_LEVEL=info
```

Optional backend env vars:

```bash
TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/izledger_test
PRISMA_MIGRATE_CHECK_SHADOW_DATABASE_URL=
```

## Local Env Strategy

- `apps/api/.env.local` is the source of truth for local backend `PORT`, `APP_URL`, `API_URL`, and `CORS_ALLOWED_ORIGINS`.
- `apps/web/.env.local` is the source of truth for local frontend `VITE_APP_ENV`, `VITE_API_BASE_URL`, and `VITE_FEATURE_ECONOMIC_CALENDAR`.
- `npm run dev` creates missing `.env.local` files from the examples, validates that `apps/web/.env.local` points at `apps/api/.env.local` `API_URL`, then starts both apps with those file values.
- `npm run dev:api` uses `apps/api/.env.local` only. It does not redefine `PORT`, `APP_URL`, or `API_URL`.
- `npm run dev:web` uses `apps/web/.env.local` for Vite env vars and uses the `APP_URL` port from `apps/api/.env.local` so it matches `npm run dev`.
- `npm run start` builds the API and a local web preview, then starts both from built output using the same `.env.local` values.
- All local run commands now agree on the default local values: API URL `http://localhost:4000`, web app env `local`, web port `5173`, and API port `4000`.

## Run commands

From the repo root:

```bash
# Local dev with watch mode
npm run dev
npm run dev:web
npm run dev:api

# Local production-like start from built output
npm run start
npm run start:web
npm run start:api

# Production builds
npm run build
npm run build:web
npm run build:api

# Local preview build
npm run build:web:local

# Tooling
npm run prisma:validate
npm run prisma:check:migrations
npm run prisma:check:release
npm run release:check
npm run backup:check
npm run backup:logical
npm run data:audit
npm run data:plan
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:migrate:deploy
npm run prisma:studio
npm run restore:verify
npm run backup:check --workspace @izledger/api
npm run backup:logical --workspace @izledger/api
npm run data:audit --workspace @izledger/api
npm run data:plan --workspace @izledger/api
npm run numeric:audit --workspace @izledger/api
npm run numeric:backfill --workspace @izledger/api
npm run numeric:validate --workspace @izledger/api
npm run test:persistence
npm run check:persistence:release
npm run screenshots:cleanup:run --workspace @izledger/api
npm run screenshots:reconcile --workspace @izledger/api
npm test --workspace @izledger/api
```

## Deployment

Deploy with:

- frontend on Vercel
- backend on Render
- database on Postgres
- screenshots/files on S3-compatible object storage

See `DEPLOYMENT.md` for the full step-by-step guide, `docs/backup-and-restore.md` for backup policy, scheduled logical backups, and restore verification, `docs/screenshot-storage-reconciliation.md` for screenshot cleanup/reconciliation operations, `docs/numeric-constraint-rollout.md` for staged numeric DB hardening, and `docs/persistence-release-gate.md` for the persistence-critical release gate.

## Persistence Release Gate

Before merging or deploying persistence-affecting changes, run:

```bash
npm run release:check
```

This gate is intentionally strict. Persistence-critical tests cannot be skipped or marked todo in release.

For Render builds, use:

```bash
node ./scripts/validate-render-db-config.mjs && npm install --include=dev && npm run prisma:generate && npm run build
```

This ensures build-time packages like TypeScript and `@types/node` are available even when `NODE_ENV=production`.
## Production notes

- Set `APP_URL=https://app.example.com` on the API and allow that exact frontend origin in `CORS_ALLOWED_ORIGINS`.
- Set `API_URL=https://api.example.com` on the API and mirror that value into `VITE_API_BASE_URL` for the Vite frontend build.
- Set `NODE_ENV=production` on the API.
- Set `VITE_APP_ENV=production` for the frontend build.
- The API will fail during startup in production if `APP_URL`, `API_URL`, or other required security settings are invalid.
- On Render, keep runtime boot clean with `npm run start:server`, validate DB config before build and pre-deploy, and run Prisma migrations in the pre-deploy step with `npm run release:migrate`.
- If your Postgres provider offers pooled and direct URLs, use the pooled URL in `DATABASE_URL` and the direct URL in `DIRECT_URL`.
- Local development should keep `COOKIE_DOMAIN` blank and `SESSION_COOKIE_SECURE=false` so `http://localhost` works without special handling.
- Production should use `SESSION_COOKIE_SECURE=true`. Keep `SESSION_COOKIE_SAME_SITE=lax` for `https://app.example.com` and `https://api.example.com`, or switch to `none` only if the frontend and backend are on different sites.
- The session token stays in an HTTP-only cookie. It should not be copied to `localStorage` or exposed to client-side JavaScript.
- If screenshot storage is not ready yet, keep `STORAGE_ENABLED=false`.
- Cloudflare can be added later for R2 or DNS/CDN, but the API should stay on Render for phase 1.

## Prisma Release Checklist

Before merging or deploying a Prisma schema change:

1. Update `apps/api/prisma/schema.prisma`.
2. Generate the migration with `npm run prisma:migrate:dev`.
3. Commit both the schema change and the new migration files together.
4. Set `PRISMA_MIGRATE_CHECK_SHADOW_DATABASE_URL` to a disposable PostgreSQL database for drift checks.
5. Run `npm run uniqueness:audit --workspace @izledger/api` before any scope/name uniqueness migration.
6. If duplicates are reported, review the generated remediation report and run `npm run uniqueness:backfill --workspace @izledger/api -- --apply`.
7. Run `npm run release:check`.

That release check fails when Prisma files are uncommitted, schema validation fails, client generation fails, committed migrations no longer match `schema.prisma`, or persistence-critical integration coverage is not release-safe.

## Production readiness summary

- No mock/demo journal seeding remains.
- New user registration does not auto-create default accounts or other starter records.
- Frontend auth uses backend HTTP-only cookie sessions.
- Frontend requests go through centralized API modules and env config.
- Empty databases render clean empty states instead of fake starter content.
- API integration tests now run against a clean dedicated Postgres test volume instead of skipping on missing DB connectivity.
- Frontend and backend both build successfully for production.
