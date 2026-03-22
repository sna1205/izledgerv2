# Deployment Guide

This project should launch with:

- frontend on Vercel
- backend API on Render
- database on Postgres
- screenshots/files on S3-compatible object storage

Phase 1 goal: safe real-user launch with low migration risk.
Do not move the API to Cloudflare for the initial release.
Cloudflare can be considered later for R2 and/or DNS/CDN after production is stable.

## Release Architecture

- `apps/web` is a Vite SPA served from Vercel.
- `apps/api` is a long-running Fastify + Prisma Node service on Render.
- Postgres is the system of record for auth, sessions, accounts, trades, reviews, shares, and screenshot metadata.
- Screenshot binaries live in S3-compatible storage and are uploaded from the browser with API-issued presigned URLs.
- Prisma migrations run in a dedicated release step, not during API startup.

## Safe Deploy Order

1. Validate local parity on a clean Postgres test volume.
2. Create staging infrastructure and env vars.
3. Run release migrations in staging.
4. Verify auth, CRUD, and screenshot flows in staging.
5. Enable backups, alerts, and monitoring.
6. Promote the same deploy flow to production.

## 1. Local Parity

Run these commands from the repo root:

```bash
npm run build:api
npm run build:web
npm test --workspace @izledger/api
npm test --workspace @izledger/web
```

Notes:

- `npm test --workspace @izledger/api` now provisions a dedicated clean Postgres volume from `apps/api/docker-compose.test.yml`.
- The API integration suite no longer skips when Postgres is unavailable.
- If you need the integration database prepared without running the tests, use:

```bash
npm run test:db:prepare --workspace @izledger/api
```

## 2. Staging Domains

Use production-like custom domains before launch:

- frontend: `https://app-staging.example.com`
- API: `https://api-staging.example.com`

Recommended production shape:

- frontend: `https://izledger.xyz`
- API: `https://api.izledger.xyz`

Keep `FRONTEND_URL` set to the exact frontend origin that should be allowed by CORS.

## 3. Backend Deploy On Render

Render service settings:

- Root Directory: `apps/api`
- Runtime: `Node`
- Region: `singapore`
- Build Command: `npm install --include=dev && npm run prisma:generate && npm run build`
- Pre-Deploy Command: `npm run release:migrate`
- Start Command: `npm run start:server`
- Health Check Path: `/health`

Why this flow is safer:

- Prisma migrations run before the new process is promoted.
- Runtime boot stays predictable and does not mutate the database on every restart.
- `/health` now checks both API boot and database reachability.

## 4. Frontend Deploy On Vercel

Vercel project settings:

- Root Directory: `apps/web`
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

`apps/web/vercel.json` already contains the SPA rewrite fallback.

## 5. Required Env Vars

### Frontend

Set in Vercel:

```bash
VITE_API_BASE_URL=https://api.izledger.xyz
```

### Backend

Set in Render:

```bash
NODE_ENV=production
HOST=0.0.0.0
FRONTEND_URL=https://izledger.xyz
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?sslmode=require
DIRECT_URL=postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?sslmode=require
SESSION_COOKIE_NAME=izledger_session
SESSION_TTL_DAYS=14
SESSION_COOKIE_SAME_SITE=none
SESSION_COOKIE_DOMAIN=
SESSION_COOKIE_SECURE=true
BCRYPT_ROUNDS=12
AUTH_RATE_LIMIT_MAX=10
AUTH_RATE_LIMIT_WINDOW_MINUTES=1
STORAGE_ENABLED=true
STORAGE_BUCKET=your-bucket-name
STORAGE_REGION=auto
STORAGE_ENDPOINT=https://your-storage-endpoint
STORAGE_ACCESS_KEY=replace-me
STORAGE_SECRET_KEY=replace-me
STORAGE_PUBLIC_BASE_URL=
STORAGE_FORCE_PATH_STYLE=true
STORAGE_SIGNED_READS=true
STORAGE_SIGNED_READ_TTL_SECONDS=900
LOG_LEVEL=info
```

Notes:

- `FRONTEND_URL` is required in production. If it is missing or malformed, `node dist/server.js` exits during startup before the API can listen.
- Leave `SESSION_COOKIE_DOMAIN` blank unless you intentionally need cross-subdomain cookie scope.
- For `https://izledger.xyz` calling `https://api.izledger.xyz`, keep `SESSION_COOKIE_SAME_SITE=none` and `SESSION_COOKIE_SECURE=true` so Safari and iOS can receive the auth cookie reliably.
- Only set `SESSION_COOKIE_DOMAIN=.izledger.xyz` if you explicitly need that wider scope. A host-only cookie on `api.izledger.xyz` is preferred by default.
- If your Postgres provider offers pooled and direct connection strings, prefer pooled for `DATABASE_URL` and direct for `DIRECT_URL`.
- If staging storage is not ready yet, keep `STORAGE_ENABLED=false` until the staging upload checklist passes.

## 5.1 API Custom Domain On Render

Point `api.izledger.xyz` at the Render web service before updating the frontend.

1. In the Render dashboard, open the API web service and add `api.izledger.xyz` under `Settings -> Custom Domains`.
2. In your DNS provider, create a `CNAME` record for `api` that points to the service's `onrender.com` hostname.
3. If you use Cloudflare DNS, set the new `CNAME` to `DNS only` until Render verifies the domain and issues the certificate.
4. Remove conflicting `AAAA` records for `api.izledger.xyz` while verifying the Render custom domain.
5. Back in Render, click `Verify` for `api.izledger.xyz` and wait for the managed TLS certificate to show as valid.
6. After the custom domain is healthy, update `VITE_API_BASE_URL=https://api.izledger.xyz` in Vercel and redeploy the frontend.
7. Optionally disable the default `onrender.com` hostname after the custom domain is live and verified.

## 6. Migration Plan

### Local development

Create migrations with:

```bash
npm run prisma:migrate:dev --workspace @izledger/api
```

### Release validation

Before merging a schema change:

```bash
npm run prisma:check:release --workspace @izledger/api
```

### Render pre-deploy

Render runs:

```bash
npm run release:migrate
```

That script:

- validates the target connection string
- builds a temporary isolated Prisma workspace
- runs `prisma migrate deploy`
- avoids accidental `.env` leakage into the wrong database target

Do not run `prisma db push` in staging or production.

## 7. Staging Auth Checklist

Verify all of the following against the real staging domains:

1. Register succeeds and sets an HTTP-only cookie.
2. Login succeeds and reuses the same cookie configuration.
3. `Set-Cookie` includes `HttpOnly`, `Secure`, `Path=/`, and `SameSite=None`.
4. Authenticated API calls succeed from `https://izledger.xyz` with `Access-Control-Allow-Credentials: true`.
5. Requests from a non-allowed origin fail CORS.
6. Logout clears the session cookie and revokes the stored session.
7. Reloading the frontend preserves the logged-in session until logout or expiry.
8. Opening the app over plain HTTP is redirected or unavailable in the real environment.
9. Safari on iOS and macOS sends the session cookie to `https://api.izledger.xyz` on `/auth/me`, `/dashboard/summary`, and `/analytics/*`.

## 8. Staging Storage Checklist

Run this before enabling screenshots for real users:

1. `POST /trades/:id/screenshots/presign` returns a valid presigned upload payload.
2. Browser upload to storage succeeds with the returned method and headers.
3. `POST /trades/:id/screenshots/complete` succeeds only after the object exists.
4. Shared-trade rendering hides screenshots when sharing settings disable them.
5. `DELETE /trades/:id/screenshots/:screenshotId` removes the metadata row and the object.
6. Completing with an invalid or reused upload token fails.
7. Completing with a missing object fails cleanly and does not create a screenshot row.
8. Expired pending upload rows can be cleaned with:

```bash
npm run screenshots:cleanup:expired --workspace @izledger/api
```

9. Run that cleanup command in staging after intentionally abandoning a few uploads.

## 9. Production Safety

Before launch, enable:

- managed Postgres backups and point-in-time recovery if your provider supports it
- screenshot bucket versioning and noncurrent-version retention
- a separate logical-backup bucket for nightly database exports
- Render health checks on `/health`
- Render alerting / uptime monitoring on API downtime and elevated 5xx rates
- Postgres storage alerts
- retention of application logs from Render

Detailed backup and restore setup now lives in [docs/backup-and-restore.md](/mnt/c/Users/PCM/Documents/IZledgerV2/IZLedgerV2/docs/backup-and-restore.md).

Operational notes:

- API errors are already logged through Fastify/Pino.
- `/health` now returns `503` if the database is unavailable.
- Keep the API and database in Singapore, or the closest SEA region your providers offer.
- Let Vercel handle global frontend delivery.

## 10. Production Launch Checklist

1. Confirm `npm run build:api`, `npm run build:web`, `npm test --workspace @izledger/api`, and `npm test --workspace @izledger/web` all pass on the release commit.
2. Confirm every Prisma migration directory contains a valid `migration.sql`.
3. Confirm staging passed the auth and storage checklists.
4. Confirm production Postgres backups are enabled.
5. Confirm screenshot bucket versioning is enabled and lifecycle rules are applied.
6. Confirm the nightly logical backup job is enabled and writing into the backup bucket.
7. Confirm `npm run restore:verify --workspace @izledger/api` has passed against a restore drill or staging restore target.
8. Confirm all production env vars are set exactly once and match the intended domains.
9. Confirm Render is using `preDeployCommand: npm run release:migrate`.
10. Confirm the API start command is `npm run start:server`.
11. Deploy the API first and verify `GET /health`.
12. Deploy the frontend and verify it points to the production API origin.
13. Register a real production test user and verify login, logout, CRUD, and screenshot upload.
14. Verify at least one revoked share link returns `410 TRADE_SHARE_REVOKED`.
15. Capture the release SHA, migration version, and deploy timestamps in your release notes.

## 11. Rollback Checklist

Use the lowest-risk rollback available:

1. If the frontend alone is bad, roll back the Vercel deployment first.
2. If the API deploy is bad and no destructive migration ran, roll back the Render service to the previous healthy build.
3. If a migration introduced an application bug but preserved data, deploy a forward fix rather than editing production data manually.
4. If a migration must be reversed, stop traffic first, take a fresh backup, and use a reviewed SQL rollback plan instead of ad hoc schema edits.
5. Keep object storage buckets intact during rollback; do not delete screenshot objects as part of an app rollback.
6. After rollback, re-run `/health`, login, logout, trade CRUD, and screenshot checks.

## 12. Known Launch Blockers That Were Fixed In This Repo

- API integration tests no longer skip when Postgres is missing.
- Prisma migrations no longer run from the API startup command.
- A broken committed migration for default-account cleanup was fixed for clean-database bootstraps.
- A stray empty migration directory was removed so fresh environments can apply the full migration chain.
- Account deletion now blocks when any trade still references the account, and archive is the safe path for historical accounts.

## 13. Phase 2 Only

After production is stable, you can evaluate Cloudflare for:

- R2 as the S3-compatible storage backend
- DNS and CDN proxying

Do not move the API runtime to Cloudflare as part of the initial launch.
