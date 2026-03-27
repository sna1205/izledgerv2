# IZLedger API

Fastify + Prisma backend for the IZLedger trading journal.

## Local development

1. Copy envs:

```bash
cp .env.example .env.local
```

`.env.local` is the only file-backed source of truth for local API runtime values. `.env` is intentionally non-runtime so local config cannot drift across two files.

2. Start local services if needed:

```bash
docker compose up -d
```

3. Generate Prisma client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate:dev
```

4. Prepare the clean integration database when you want to run the API suite:

```bash
npm run test:db:prepare
```

Optional restore verification after a restore drill:

```bash
npm run restore:verify
```

Backup readiness and logical backup automation:

```bash
npm run backup:check
npm run backup:logical
```

Read-only data cleanup audits and remediation planning:

```bash
npm run data:audit
npm run data:plan
```

Manual screenshot cleanup and reconciliation:

```bash
npm run screenshots:cleanup:run
npm run screenshots:reconcile
```

Numeric audit and remediation planning:

```bash
npm run numeric:audit
npm run numeric:backfill
npm run numeric:validate
```

Persistence-critical release gate:

```bash
npm run release:check
```

Optional uniqueness audit before shipping setup/review scope constraints:

```bash
npm run uniqueness:audit
npm run uniqueness:backfill -- --apply
```

5. Start the API:

```bash
npm run dev
```

Production-like local API boot after a build:

```bash
npm run build
npm run start
```

## Main routes

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/change-password`
- `GET /accounts`
- `POST /accounts`
- `PATCH /accounts/:id`
- `DELETE /accounts/:id`
- `GET /setups`
- `POST /setups`
- `PATCH /setups/:id`
- `DELETE /setups/:id`
- `GET /trades`
- `POST /trades`
- `GET /trades/:id`
- `PATCH /trades/:id`
- `DELETE /trades/:id`
- `POST /trades/:id/screenshots/presign`
- `POST /trades/:id/screenshots/complete`
- `DELETE /trades/:id/screenshots/:screenshotId`
- `GET /reviews`
- `POST /reviews`
- `PATCH /reviews/:id`
- `DELETE /reviews/:id`
- `GET /dashboard/summary`
- `GET /analytics/breakdowns`
- `GET /analytics/calendar`
- `POST /trade-shares`
- `GET /trade-shares/:shareId`

## Notes

- New users no longer receive seeded starter data or an auto-created default account.
- Screenshots are stored in S3-compatible object storage when enabled.
- Session auth is cookie-based and intended for the companion SPA frontend.
- Use `APP_URL` for the deployed frontend origin in production, such as `https://app.example.com`.
- Keep `API_URL=https://api.example.com` aligned with the deployed API origin, and mirror the allowed frontend origin into `CORS_ALLOWED_ORIGINS`.
- For `https://app.example.com` calling `https://api.example.com`, use `SESSION_COOKIE_SAME_SITE=lax` with `SESSION_COOKIE_SECURE=true`. If the frontend and backend are on different sites, switch `SESSION_COOKIE_SAME_SITE=none`.
- Use `STORAGE_ENABLED=false` if screenshot storage is not configured yet.
- Render deploys should run from the monorepo root, validate DB config before build and before `npm run release:migrate`, then keep runtime start on `npm run start:server` (`npm run start` locally).
- `npm test` now boots a dedicated clean Postgres test volume before running the API suite.
- Backup and restore runbooks live in `docs/backup-and-restore.md`.
- Screenshot cleanup/reconciliation runbook lives in `docs/screenshot-storage-reconciliation.md`.
- Numeric constraint rollout notes live in `docs/numeric-constraint-rollout.md`.
- Persistence release gate notes live in `docs/persistence-release-gate.md`.

## Review list query params

`GET /reviews` returns a stable paginated response:

- `items`: review rows
- `pagination`: `page`, `pageSize`, `total`, `totalPages`, `hasNextPage`, `hasPreviousPage`

Supported query params:

- `type`: `daily` | `weekly` | `trade`
- `tradeId`: UUID for a specific trade review
- `dateFrom`: inclusive `YYYY-MM-DD` window start
- `dateTo`: inclusive `YYYY-MM-DD` window end
- `page`: 1-based page number
- `pageSize`: bounded page size
- `sortBy`: `updatedAt` | `createdAt` | `reviewDate` | `weekEnd`
- `sortOrder`: `asc` | `desc`

Date-window behavior:

- `daily` and `trade` filters apply to `reviewDate`
- `weekly` filters use overlap logic on `weekStart` / `weekEnd`
