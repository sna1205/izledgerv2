# Deployment Guide

This project deploys as:

- frontend on Vercel
- backend API on Render
- database on Neon Postgres
- object storage on S3-compatible storage when enabled

The app architecture stays the same in production:

- `apps/web` talks only to the backend API
- `apps/api` handles auth, Prisma, and storage
- Prisma is the only database layer
- auth uses HTTP-only cookies

## Deploy Order

1. Prepare the repo
2. Create the Neon database
3. Deploy the backend to Render
4. Deploy the frontend to Vercel
5. Verify the full stack

## 1. Prepare The Repo

Before deploying:

1. Push the latest code to GitHub.
2. Make sure Prisma migrations are committed under `apps/api/prisma/migrations`.
3. Confirm these files are present and up to date:
   - `render.yaml`
   - `apps/api/.env.example`
   - `apps/web/.env.example`
   - `apps/web/vercel.json`
4. Confirm local builds pass:

```bash
npm run build --workspace @izledger/api
npm run build --workspace @izledger/web
```

5. If you do not want screenshot uploads yet, plan to set `STORAGE_ENABLED=false` in production.

## 2. Create The Neon Database

1. Create a new Neon project.
2. Open the database connection details.
3. Copy the pooled Postgres connection string for app runtime traffic.
4. Copy the direct Postgres connection string for Prisma migrations.
5. Confirm both strings include `sslmode=require`.

Recommended split:

- `DATABASE_URL`: pooled Neon connection string
- `DIRECT_URL`: direct Neon connection string

Example shape:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxxxx-pooler.REGION.aws.neon.tech/DB_NAME?sslmode=require
DIRECT_URL=postgresql://USER:PASSWORD@ep-xxxxxx.REGION.aws.neon.tech/DB_NAME?sslmode=require
```

Notes:

- `DATABASE_URL` is required by Prisma and the backend.
- `DIRECT_URL` is optional, but recommended for `prisma migrate deploy`.
- This repo's Render start command uses `DIRECT_URL` for migrations when it is set, then runs the API normally on `DATABASE_URL`.
- For a long-running backend service, prefer the pooled Neon URL for `DATABASE_URL`.

## 3. Deploy The Backend To Render

### Render Service Settings

Create a Render web service with:

- Root Directory: `apps/api`
- Runtime: `Node`
- Build Command: `npm install --include=dev && npm run prisma:generate && npm run build`
- Start Command: `npm run start:render`
- Health Check Path: `/health`

If Render detects `render.yaml`, you can deploy from the blueprint instead.

### Required Backend Env Vars

```bash
NODE_ENV=production
HOST=0.0.0.0
FRONTEND_URL=https://your-frontend.vercel.app
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxxxx-pooler.REGION.aws.neon.tech/DB_NAME?sslmode=require
JWT_SECRET=replace-with-a-long-random-secret
SESSION_COOKIE_NAME=izledger_session
SESSION_TTL_DAYS=14
SESSION_COOKIE_SAME_SITE=none
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_DOMAIN=
BCRYPT_ROUNDS=12
AUTH_RATE_LIMIT_MAX=10
AUTH_RATE_LIMIT_WINDOW_MINUTES=1
LOG_LEVEL=info
```

### Optional Backend Env Vars

```bash
DIRECT_URL=postgresql://USER:PASSWORD@ep-xxxxxx.REGION.aws.neon.tech/DB_NAME?sslmode=require
PORT=10000
STORAGE_ENABLED=false
STORAGE_BUCKET=
STORAGE_REGION=auto
STORAGE_ENDPOINT=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_PUBLIC_BASE_URL=
STORAGE_FORCE_PATH_STYLE=false
STORAGE_SIGNED_READS=true
STORAGE_SIGNED_READ_TTL_SECONDS=900
```

Storage notes:

- Set `STORAGE_ENABLED=false` if uploads are not ready yet.
- If storage is enabled, provide the full bucket and credential configuration.
- Never expose storage credentials to the frontend.

### First Backend Deploy

1. Save env vars in Render.
2. Trigger a deploy.
3. Wait for build, migration, and startup to finish.
4. Open the Render URL.
5. Check:

```bash
GET /health
```

Expected response:

```json
{
  "status": "ok",
  "service": "izledger-backend"
}
```

If migrations hang while `DATABASE_URL` is pooled, add `DIRECT_URL` with the direct Neon connection string.

If Render logs show a Prisma `P1001` connection error while the app uses a direct Neon runtime URL, switch `DATABASE_URL` back to the pooled Neon URL and keep the direct string in `DIRECT_URL` only.

## 4. Deploy The Frontend To Vercel

### Vercel Project Settings

Create a Vercel project with:

- Root Directory: `apps/web`
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

SPA rewrites are already configured in `apps/web/vercel.json`.

### Required Frontend Env Var

```bash
VITE_API_BASE_URL=https://your-render-service.onrender.com
```

Important:

- Only `VITE_` variables are exposed to the browser.
- Never put `JWT_SECRET`, database credentials, or storage secrets in Vercel.

## 5. Connect Frontend And Backend

After both services exist:

1. Copy the real frontend production URL from Vercel.
2. Set `FRONTEND_URL` in Render to that exact origin.
3. Redeploy the backend so CORS and cookies use the correct frontend origin.

If you later add a custom domain, update `FRONTEND_URL` again and redeploy.

## 6. Verify Production

Check all of the following:

1. `GET /health` returns `200` from Render.
2. The frontend loads successfully on Vercel.
3. Login and logout still work with HTTP-only cookies.
4. Browser requests point to `VITE_API_BASE_URL`.
5. Render logs show `prisma migrate deploy` completed successfully.
6. CRUD flows work against the Neon database.
7. If frontend and backend are on different domains:
   - `SESSION_COOKIE_SAME_SITE=none`
   - `SESSION_COOKIE_SECURE=true`

## 7. Safe Prisma Release Flow

For future schema changes:

1. Update `apps/api/prisma/schema.prisma`.
2. Generate a migration locally:

```bash
npm run prisma:migrate:dev
```

3. Commit the migration files.
4. Push to GitHub.
5. Let Render run:

```bash
npm run start:render
```

That start command runs `prisma migrate deploy` before the API boots.

Do not use `prisma db push` in production.

## 8. Local Environment Reference

### `apps/api/.env`

```bash
NODE_ENV=development
PORT=4000
HOST=0.0.0.0
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/izledger
DIRECT_URL=
JWT_SECRET=replace-with-a-long-random-string
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

### `apps/web/.env.local`

```bash
VITE_API_BASE_URL=http://localhost:4000
```
