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

2. Create env files:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
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

- creates `apps/api/.env` and `apps/web/.env.local` from their examples when missing
- keeps the frontend pointed at the backend automatically
- falls forward to the next free port if `4000` or `5173` is already in use

Default local app URLs:

- web: `http://localhost:5173`
- api: `http://localhost:4000`

## Required env vars

Frontend in `apps/web/.env.local`:

```bash
VITE_API_BASE_URL=http://localhost:4000
```

Backend in `apps/api/.env`:

```bash
NODE_ENV=development
PORT=4000
HOST=0.0.0.0
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://...
DIRECT_URL=
SESSION_COOKIE_NAME=izledger_session
SESSION_TTL_DAYS=14
SESSION_COOKIE_SAME_SITE=lax
SESSION_COOKIE_DOMAIN=
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
LOG_LEVEL=info
```

Optional backend env vars:

```bash
TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/izledger_test
PRISMA_MIGRATE_CHECK_SHADOW_DATABASE_URL=
```

## Run commands

From the repo root:

```bash
npm run dev
npm run dev:web
npm run dev:api
npm run build
npm run build:web
npm run build:api
npm run prisma:validate
npm run prisma:check:migrations
npm run prisma:check:release
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:migrate:deploy
npm run prisma:studio
npm run restore:verify
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

See `DEPLOYMENT.md` for the full step-by-step guide, `docs/backup-and-restore.md` for backup policy and restore verification, `docs/screenshot-storage-reconciliation.md` for screenshot cleanup/reconciliation operations, `docs/numeric-constraint-rollout.md` for staged numeric DB hardening, and `docs/persistence-release-gate.md` for the persistence-critical release gate.

## Persistence Release Gate

Before merging or deploying persistence-affecting changes, run:

```bash
npm run prisma:check:release
npm run check:persistence:release
```

This gate is intentionally strict. Persistence-critical tests cannot be skipped or marked todo in release.

For Render builds, use:

```bash
npm install --include=dev && npm run prisma:generate && npm run build
```

This ensures build-time packages like TypeScript and `@types/node` are available even when `NODE_ENV=production`.
## Production notes

- Set `VITE_API_BASE_URL` to the public API origin used by the frontend, for example `https://api.izledger.xyz`.
- Set `NODE_ENV=production` on the API.
- Set `FRONTEND_URL` to the deployed frontend origin, for example `https://izledger.xyz`.
- The API will fail during startup in production if `FRONTEND_URL` is missing or invalid.
- On Render, keep runtime boot clean with `npm run start:server` and run Prisma migrations in the pre-deploy step with `npm run release:migrate`.
- If your Postgres provider offers pooled and direct URLs, use the pooled URL in `DATABASE_URL` and the direct URL in `DIRECT_URL`.
- Set `SESSION_COOKIE_SECURE=true` in production.
- For the current production layout of `https://izledger.xyz` talking to `https://api.izledger.xyz`, set `SESSION_COOKIE_SAME_SITE=none`, keep `SESSION_COOKIE_SECURE=true`, and leave `SESSION_COOKIE_DOMAIN` blank unless you intentionally need a wider cookie scope such as `.izledger.xyz`.
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
7. Run `npm run prisma:check:release`.

That release check fails when Prisma files are uncommitted, schema validation fails, client generation fails, or committed migrations no longer match `schema.prisma`.

## Production readiness summary

- No mock/demo journal seeding remains.
- Frontend auth uses backend HTTP-only cookie sessions.
- Frontend requests go through centralized API modules and env config.
- Empty databases render clean empty states instead of fake starter content.
- API integration tests now run against a clean dedicated Postgres test volume instead of skipping on missing DB connectivity.
- Frontend and backend both build successfully for production.
