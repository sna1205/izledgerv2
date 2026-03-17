# IZLedger Backend

Production-minded Fastify + Prisma backend for the existing IZLedger frontend. It is designed around the current frontend behavior instead of replacing it with a new domain model.

## Stack

- Node.js + TypeScript
- Fastify
- PostgreSQL
- Prisma ORM
- S3-compatible object storage for screenshots
- HTTP-only cookie sessions

## Why HTTP-only cookie sessions

For this app, cookie-backed sessions are the simpler and safer fit than client-stored JWTs:

- the frontend already behaves like a single SPA talking to one API
- the browser handles cookie persistence automatically
- logout and password changes can invalidate sessions server-side
- no access token storage in `localStorage`

## Folder structure

```text
apps/api/
  prisma/
    schema.prisma
    migrations/
    seed.ts
  src/
    app.ts
    server.ts
    config/
    lib/
    middleware/
    modules/
      auth/
      accounts/
      setups/
      trades/
      screenshots/
      reviews/
      analytics/
    utils/
    types/
```

## Domain fit with the current frontend

This backend is aligned to the existing frontend in a few important ways:

- auth is now real, but the returned `user` shape is still simple
- trades still return `date`, `setup`, and `screenshots` in a frontend-friendly format
- `setup_id` is stored in the database, but API responses still expose the snapshot label as `setup`
- reviews return `reviewScope` alongside `type` so existing review screens map cleanly
- analytics endpoints mirror the current client-side dashboard and analytics calculations

## Key modeling decisions

- Every main entity is owned by a user.
- Trades are soft-deleted with `deleted_at`.
- Reviews keep `trade_snapshot` so journal history survives trade edits or deletions.
- Screenshots live in object storage, not Postgres.
- Trade records store both `setup_id` and `setup_name_snapshot`.
- Trade reviews are enforced as one-per-trade via the unique `trade_id` constraint on `reviews`.
- A `sessions` table was added to support secure server-side session invalidation.

## Indexes included

- `accounts(user_id)`
- `setups(user_id, name)`
- `trades(user_id, trade_date desc)`
- `trades(account_id, trade_date desc)`
- `trades(user_id, session)`
- `trades(user_id, emotion)`
- `trades(user_id, result)`
- `reviews(user_id, type, updated_at desc)`

These support the exact access patterns already present in the frontend: per-user lists, account-filtered views, date-sorted dashboards, and analytics breakdowns by session/emotion/result.

## Local development

1. Start infrastructure:

```bash
cd apps/api
cp .env.example .env
docker compose up -d
```

2. Install dependencies:

```bash
npm install
```

3. Generate Prisma client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate:dev
```

4. Seed demo data:

```bash
npm run prisma:seed
```

5. Start the API:

```bash
npm run dev
```

The API will run on `http://localhost:4000`.

Demo credentials after seeding:

- username: `demo`
- password: `DemoPass123!`

## Prisma commands

```bash
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:migrate:deploy
npm run prisma:studio
npm run prisma:seed
```

## Main routes

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/change-password`

### Accounts

- `GET /accounts`
- `POST /accounts`
- `PATCH /accounts/:id`
- `DELETE /accounts/:id`

### Setups

- `GET /setups`
- `POST /setups`
- `PATCH /setups/:id`
- `DELETE /setups/:id`

### Trades

- `GET /trades`
- `POST /trades`
- `GET /trades/:id`
- `PATCH /trades/:id`
- `DELETE /trades/:id`

### Screenshots

- `POST /trades/:id/screenshots/presign`
- `POST /trades/:id/screenshots/complete`
- `PATCH /trades/:id/screenshots/reorder`
- `DELETE /trades/:id/screenshots/:screenshotId`

### Reviews

- `GET /reviews`
- `POST /reviews`
- `GET /reviews/:id`
- `PATCH /reviews/:id`
- `DELETE /reviews/:id`

### Analytics

- `GET /dashboard/summary?accountId=...`
- `GET /analytics/breakdowns?accountId=...`
- `GET /analytics/calendar?accountId=...&month=2026-03`

## Screenshot upload flow

1. Create the trade first with `POST /trades`.
2. For each selected screenshot, call `POST /trades/:id/screenshots/presign`.
3. Upload the file directly to object storage using the returned `uploadUrl`.
4. Call `POST /trades/:id/screenshots/complete` with the `storageKey`.
5. Fetch the trade again or update local state with the returned screenshot asset.

This keeps image binaries out of the app server and out of Postgres.

## Read URL strategy

The storage layer supports:

- signed read URLs for private screenshots
- public URLs if you later choose a public bucket/CDN path

The default recommendation is signed read URLs for trader screenshots because these are private journal artifacts.

## Production notes

- Set `SESSION_COOKIE_SECURE=true` behind HTTPS.
- Put Postgres on managed infrastructure.
- Use S3, Cloudflare R2, or Supabase Storage in production.
- Keep `FRONTEND_URL` explicit.
- Consider Redis-backed rate limiting if you later scale horizontally.
- Move signed read URLs behind a CDN if screenshot traffic grows.

## Rollout order

1. Auth
2. Accounts and setups
3. Trades and screenshot upload flow
4. Reviews
5. Frontend swap from localStorage modules to React Query hooks
6. Analytics endpoints as the primary data source once CRUD is stable

## Frontend migration

See `FRONTEND_INTEGRATION.md` for concrete React Query and API client examples.
