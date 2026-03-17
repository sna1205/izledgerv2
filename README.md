# IZLedger Monorepo

IZLedger is a workspace-based monorepo with:

- `apps/web`: React + Vite frontend for Vercel
- `apps/api`: Fastify + Prisma backend for Render
- `packages/shared`: shared domain types used by the frontend

The repo is now set up for a simple MVP deployment stack:

- frontend on Vercel
- backend API on Render
- database on Supabase Postgres

The backend is production-ready and already exposes `/health`. The frontend is still mostly local-first today, so this pass standardizes deployment config and API environment handling without rewriting the current auth and trade flows.

## Repo structure

```text
apps/
  api/      Fastify API + Prisma
  web/      React + Vite app
packages/
  shared/   Shared types
```

## Local development

1. Install dependencies from the repo root:

```bash
npm install
```

2. Configure local environment files:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

3. Start the local database and object storage used by the backend:

```bash
cd apps/api
docker compose up -d
cd ../..
```

4. Run Prisma locally:

```bash
npm run prisma:generate
npm run prisma:migrate:dev
```

5. Start both apps:

```bash
npm run dev
```

Local URLs:

- frontend: `http://localhost:3000`
- backend: `http://localhost:4000`
- backend health check: `http://localhost:4000/health`

## Environment variables

### Frontend (`apps/web/.env.local`)

```bash
VITE_API_BASE_URL=http://localhost:4000
```

- Use the public Render API URL in Vercel production.
- Only `VITE_` variables are exposed to the browser, so never put private secrets here.

### Backend (`apps/api/.env`)

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

Notes:

- `DATABASE_URL` is the only database variable Prisma needs.
- `SUPABASE_SERVICE_ROLE_KEY` must stay on the backend only.
- `SUPABASE_ANON_KEY` is safe for browsers in general, but this repo does not currently need it in the frontend.
- `FRONTEND_URL` is required in production so CORS and cookies only trust the deployed Vercel app.
- `JWT_SECRET` is reserved as a server-side secret. Do not expose it to the browser.

## Deployment

### Backend on Render

Recommended Render service settings:

- Service type: `Web Service`
- Root Directory: `apps/api`
- Build Command: `npm install && npm run prisma:generate && npm run build`
- Pre-Deploy Command: `npm run prisma:migrate:deploy`
- Start Command: `npm run start`
- Health Check Path: `/health`

Required Render environment variables:

```bash
NODE_ENV=production
HOST=0.0.0.0
FRONTEND_URL=https://your-frontend.vercel.app
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true
JWT_SECRET=generate-a-long-random-secret
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

Optional Render environment variables:

```bash
PORT=10000
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<optional>
SUPABASE_SERVICE_ROLE_KEY=<server-only>
STORAGE_ENABLED=false
```

If you want screenshot uploads in production, keep `STORAGE_ENABLED=true` and provide your S3-compatible storage settings. If you want the simplest MVP rollout first, set `STORAGE_ENABLED=false` and deploy without screenshot uploads.

### Frontend on Vercel

Recommended Vercel project settings:

- Framework Preset: `Vite`
- Root Directory: `apps/web`
- Build Command: `npm run build`
- Output Directory: `dist`

Required Vercel environment variables:

```bash
VITE_API_BASE_URL=https://your-render-service.onrender.com
```

The SPA fallback is already configured in `apps/web/vercel.json`.

### Supabase Postgres

1. Create a Supabase project.
2. Copy the Postgres connection string into `DATABASE_URL`.
3. Prefer the pooled connection string for Render web traffic.
4. Keep the direct connection string available for local admin tools if you need it.
5. Run `npm run prisma:migrate:deploy` during backend deploys.

## Prisma production migration flow

This repo already contains Prisma migrations in `apps/api/prisma/migrations`.

Safe production flow:

1. Create migrations locally with `npm run prisma:migrate:dev`.
2. Commit the generated migration files.
3. Let Render run `npm run prisma:migrate:deploy` before each production release.
4. Do not use `prisma db push` against production.

## App scripts

These existing scripts are already suitable for deployment:

- root dev: `npm run dev`
- frontend dev/build: `npm run dev --workspace @izledger/web`, `npm run build --workspace @izledger/web`
- backend dev/build/start: `npm run dev --workspace @izledger/api`, `npm run build --workspace @izledger/api`, `npm run start --workspace @izledger/api`

## Additional docs

- Backend details: `apps/api/README.md`
- Existing deployment notes: `DEPLOYMENT.md`
