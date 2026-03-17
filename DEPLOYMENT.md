# Deployment Guide

This project is set up for:

- frontend on Vercel
- backend API on Render
- database on Supabase Postgres

This guide follows the safest MVP order:

1. Prepare the repo
2. Create Supabase
3. Deploy backend to Render
4. Deploy frontend to Vercel
5. Verify everything works

## 1. Prepare the repo

1. Push your latest code to GitHub.
2. Make sure Prisma migrations are committed from `apps/api/prisma/migrations`.
3. Confirm these files exist and are up to date:
   - `apps/api/.env.example`
   - `apps/web/.env.example`
   - `render.yaml`
   - `apps/web/vercel.json`
4. If you are not ready to configure screenshot storage yet, plan to set `STORAGE_ENABLED=false` in Render.

## 2. Create Supabase

1. Create a new Supabase project.
2. Wait for the database to finish provisioning.
3. In Supabase, open `Project Settings` -> `Database`.
4. Copy the Postgres connection string.
5. Prefer the pooled connection string for Render production traffic.
6. Keep the direct connection string somewhere safe for local admin use if needed.
7. In `Project Settings` -> `API`, copy these values if you plan to use them later:
   - `Project URL`
   - `anon public key`
   - `service_role secret key`

Important:

- `DATABASE_URL` is required by Prisma and the backend.
- `SUPABASE_SERVICE_ROLE_KEY` must stay server-side only.
- Do not put private Supabase keys in Vercel frontend env vars.

## 3. Deploy the backend to Render

### Create the Render service

1. Log in to Render.
2. Click `New` -> `Web Service`.
3. Connect your GitHub repo.
4. Select this repository.
5. Set `Root Directory` to `apps/api`.

### Render service settings

Use these settings:

- Runtime: `Node`
- Build Command: `npm install && npm run prisma:generate && npm run build`
- Pre-Deploy Command: `npm run prisma:migrate:deploy`
- Start Command: `npm run start`
- Health Check Path: `/health`

If Render detects `render.yaml`, you can also deploy from that blueprint.

### Render environment variables

Set these required variables:

```bash
NODE_ENV=production
HOST=0.0.0.0
FRONTEND_URL=https://your-frontend.vercel.app
DATABASE_URL=postgresql://...
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

Optional variables:

```bash
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PORT=10000
STORAGE_ENABLED=false
```

If you want screenshot uploads in production, do not use `STORAGE_ENABLED=false`. Instead, configure your S3-compatible storage variables:

```bash
STORAGE_ENABLED=true
STORAGE_BUCKET=...
STORAGE_REGION=...
STORAGE_ENDPOINT=https://...
STORAGE_ACCESS_KEY=...
STORAGE_SECRET_KEY=...
STORAGE_PUBLIC_BASE_URL=
STORAGE_FORCE_PATH_STYLE=false
STORAGE_SIGNED_READS=true
STORAGE_SIGNED_READ_TTL_SECONDS=900
```

### Deploy backend

1. Save the Render environment variables.
2. Trigger the first deploy.
3. Wait for build, migrate, and start to finish.
4. Open your Render service URL.
5. Visit `/health`.

Expected result:

```json
{
  "status": "ok",
  "service": "izledger-backend"
}
```

If `/health` fails, stop and fix Render before deploying the frontend.

## 4. Deploy the frontend to Vercel

### Create the Vercel project

1. Log in to Vercel.
2. Click `Add New` -> `Project`.
3. Import the same GitHub repository.
4. Set `Root Directory` to `apps/web`.

### Vercel project settings

Use these settings:

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

SPA rewrites are already handled in `apps/web/vercel.json`.

### Vercel environment variables

Set this required variable:

```bash
VITE_API_BASE_URL=https://your-render-service.onrender.com
```

Important:

- Only `VITE_` variables are exposed to the browser.
- Never put `JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, database credentials, or storage secrets in Vercel.

### Deploy frontend

1. Save the Vercel environment variable.
2. Trigger the deployment.
3. Open the Vercel domain after the build completes.
4. Confirm the site loads and deep links do not 404.

## 5. Connect frontend and backend

After both deployments exist:

1. Copy the real Vercel production URL.
2. Go back to Render.
3. Set `FRONTEND_URL` to the exact Vercel URL.
4. Redeploy Render so CORS uses the correct frontend origin.

If you later add a custom frontend domain, update `FRONTEND_URL` again in Render.

## 6. Post-deploy verification

Run this checklist:

1. Backend `/health` returns `200`.
2. Frontend loads from Vercel.
3. Browser requests point to the Render API URL from `VITE_API_BASE_URL`.
4. No private secrets appear in browser devtools env output.
5. Render logs show Prisma migrations completed successfully.
6. If using cookies across Vercel and Render, confirm:
   - `SESSION_COOKIE_SAME_SITE=none`
   - `SESSION_COOKIE_SECURE=true`

## 7. Safe Prisma production flow

Use this workflow for future releases:

1. Change Prisma schema locally.
2. Run:

```bash
npm run prisma:migrate:dev
```

3. Commit the generated migration files.
4. Push to GitHub.
5. Let Render run:

```bash
npm run prisma:migrate:deploy
```

Do not use `prisma db push` against production.

## 8. Local env reference

### `apps/api/.env`

```bash
NODE_ENV=development
PORT=4000
HOST=0.0.0.0
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/izledger
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=replace-with-a-long-random-string
SESSION_COOKIE_NAME=izledger_session
SESSION_TTL_DAYS=14
SESSION_COOKIE_SAME_SITE=lax
SESSION_COOKIE_DOMAIN=
SESSION_COOKIE_SECURE=false
BCRYPT_ROUNDS=12
AUTH_RATE_LIMIT_MAX=10
AUTH_RATE_LIMIT_WINDOW_MINUTES=1
STORAGE_ENABLED=true
STORAGE_BUCKET=izledger-dev
STORAGE_REGION=auto
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
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

## 9. Summary

Set in Vercel:

- `VITE_API_BASE_URL`

Set in Render:

- `NODE_ENV`
- `HOST`
- `FRONTEND_URL`
- `DATABASE_URL`
- `JWT_SECRET`
- session settings
- auth/rate-limit settings
- optional Supabase values
- optional storage values

Do manually in Supabase:

- create project
- copy Postgres connection string
- optionally copy API keys
- keep service role secret on the backend only
