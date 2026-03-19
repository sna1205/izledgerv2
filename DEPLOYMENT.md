# Deployment Guide

This project is set up for:

- frontend on Vercel
- backend API on Render
- database on Supabase Postgres

Use this deploy order:

1. Prepare the repo
2. Create Supabase
3. Deploy the backend to Render
4. Deploy the frontend to Vercel
5. Verify the full stack

## Pre-deploy checklist

Before clicking deploy, confirm:

- Latest code is pushed to GitHub on the branch Render/Vercel will deploy.
- `render.yaml` changes are committed if you changed deploy commands or env defaults.
- If Prisma schema changed, matching files exist in `apps/api/prisma/migrations`.
- Local builds pass:
  - `npm run build --workspace @izledger/api`
  - `npm run build --workspace @izledger/web`
- Render service settings match this repo:
  - Root Directory: `apps/api`
  - Build Command: `npm install --include=dev && npm run prisma:generate && npm run build`
  - Start Command: `npm run start:render`
- Render env vars are present and correct:
  - `DATABASE_URL` = Supabase pooler URL
  - `DIRECT_URL` = direct Supabase Postgres URL when available
  - `FRONTEND_URL` = exact Vercel production URL
  - `SESSION_COOKIE_SECURE=true`
  - `SESSION_COOKIE_SAME_SITE=none`
  - `STORAGE_ENABLED=false` unless object storage is configured
- Vercel env var is present:
  - `VITE_API_BASE_URL=https://your-render-service.onrender.com`
- After deploy, test `GET /health` on the Render service before testing login from the frontend.

## 1. Prepare the repo

1. Push your latest code to GitHub.
2. Make sure Prisma migrations are committed from `apps/api/prisma/migrations`.
3. Make sure these files are present:
   - `apps/api/.env.example`
   - `apps/web/.env.example`
   - `render.yaml`
   - `apps/web/vercel.json`
4. If you do not want screenshot storage yet, plan to set `STORAGE_ENABLED=false` in Render.

## 2. Create Supabase

1. Create a new Supabase project.
2. Wait for provisioning to finish.
3. Open `Project Settings` -> `Database`.
4. Copy the Postgres connection string.
5. Prefer the pooled connection string for Render production traffic.
6. Optionally open `Project Settings` -> `API` and copy:
   - project URL
   - anon key
   - service role key

Important:

- `DATABASE_URL` is required by Prisma and the backend.
- `DIRECT_URL` is recommended for Prisma migrations on Render when `DATABASE_URL` uses the Supabase pooler.
- If `DIRECT_URL` is not set, the Render predeploy step falls back to `DATABASE_URL`.
- `SUPABASE_SERVICE_ROLE_KEY` must stay on the backend only.
- Do not put private Supabase keys in Vercel.
- On Render, do not use the direct Supabase host like `db.<project-ref>.supabase.co:5432` if it fails to connect. Use the Supabase connection pooler URL instead.

## 3. Deploy the backend to Render

### Create the service

1. Log in to Render.
2. Click `New` -> `Web Service`.
3. Connect your GitHub repo.
4. Select this repository.
5. Set `Root Directory` to `apps/api`.

### Render settings

Use these values:

- Runtime: `Node`
- Build Command: `npm install --include=dev && npm run prisma:generate && npm run build`
- Start Command: `npm run start:render`
- Health Check Path: `/health`

If Render detects `render.yaml`, you can deploy from the blueprint instead.
If you configured the service manually in the Render dashboard already, update the Build Command there to match this exactly.
This repo does not require a Render Pre-Deploy Command, which helps on plans where that feature is unavailable.

### Render environment variables

Required:

```bash
NODE_ENV=production
HOST=0.0.0.0
FRONTEND_URL=https://your-frontend.vercel.app
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
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

Optional:

```bash
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PORT=10000
STORAGE_ENABLED=false
```

Recommended connection split:

- `DATABASE_URL`: Supabase pooler URL for app/runtime traffic
- `DIRECT_URL`: direct Postgres URL for `prisma migrate deploy`

If you want screenshot uploads in production, configure storage instead of disabling it:

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

### First backend deploy

1. Save the env vars in Render.
2. Trigger the deploy.
3. Wait for build, startup migration, and app start to finish.
4. Open the Render URL.
5. Visit `/health`.

Expected result:

```json
{
  "status": "ok",
  "service": "izledger-backend"
}
```

If deploy appears stuck on `prisma migrate deploy` during startup while using a `*.pooler.supabase.com` connection, set `DIRECT_URL` in Render to the direct database connection string from Supabase and keep `DATABASE_URL` on the pooler string.

If you see Prisma error `P1001: Can't reach database server at db.<project-ref>.supabase.co:5432`, change `DATABASE_URL` in Render to the Supabase pooler connection string from `Project Settings` -> `Database` -> `Connection string` -> `Transaction pooler` or `Session pooler`, then set `DIRECT_URL` to the direct connection string if migrations need a single direct connection.

## 4. Deploy the frontend to Vercel

### Create the project

1. Log in to Vercel.
2. Click `Add New` -> `Project`.
3. Import the same GitHub repo.
4. Set `Root Directory` to `apps/web`.

### Vercel settings

Use these values:

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

SPA rewrites are already configured in `apps/web/vercel.json`.

### Vercel environment variables

Required:

```bash
VITE_API_BASE_URL=https://your-render-service.onrender.com
```

Important:

- Only `VITE_` variables are exposed to the browser.
- Never put `JWT_SECRET`, database credentials, storage secrets, or `SUPABASE_SERVICE_ROLE_KEY` in Vercel.

### First frontend deploy

1. Save the env var in Vercel.
2. Trigger the deploy.
3. Open the Vercel domain.
4. Confirm the site loads and deep links do not 404.

## 5. Connect frontend and backend

After both services exist:

1. Copy the real Vercel production URL.
2. Go back to Render.
3. Set `FRONTEND_URL` to that exact URL.
4. Redeploy Render so CORS and cookies use the correct frontend origin.

If you later add a custom domain, update `FRONTEND_URL` again.

## 6. Verify production

Check these items:

1. `GET /health` returns `200` on Render.
2. The Vercel site loads successfully.
3. Frontend requests point at the Render API URL from `VITE_API_BASE_URL`.
4. No private secrets appear in browser env output.
5. Render logs show `prisma migrate deploy` completed successfully during startup.
6. If frontend and API are on different domains, confirm:
   - `SESSION_COOKIE_SAME_SITE=none`
   - `SESSION_COOKIE_SECURE=true`

## 7. Safe Prisma production flow

For future releases:

1. Change the Prisma schema locally.
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

Do not use `prisma db push` in production.
On free-plan Render deployments, this migration runs from the service start command instead of a separate pre-deploy step.

## 8. Local env reference

### `apps/api/.env`

```bash
NODE_ENV=development
PORT=4000
HOST=0.0.0.0
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
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
