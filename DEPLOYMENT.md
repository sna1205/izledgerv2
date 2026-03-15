# Deployment Guide

This repo can be deployed with:

- frontend on Vercel
- backend on Railway

## Current app state

The backend is production-capable and includes:

- Fastify API
- Prisma migrations
- health endpoint at `/health`
- cookie-based auth

The frontend is deployable as a Vite SPA, but most data modules still read and write from `localStorage`.

That means:

- Vercel deployment works today
- Railway deployment works today
- full end-to-end production behavior still requires wiring the frontend to the backend API modules

## Frontend on Vercel

Create a Vercel project with:

- Root Directory: `apps/web`
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

The SPA fallback is already configured in [apps/web/vercel.json](/mnt/c/Users/PCM/Documents/IZledgerV2/IZLedgerV2/apps/web/vercel.json).

### Recommended frontend env vars

If you later switch the frontend to the API client pattern in `apps/api/FRONTEND_INTEGRATION.md`, add:

```bash
VITE_API_URL=https://your-railway-api.up.railway.app
```

## Backend on Railway

Create a Railway service from this repo with:

- Root Directory: `apps/api`
- Config as Code path: `/apps/api/railway.json`

The Railway config already defines:

- Dockerfile builder
- `npm run start`
- `npx prisma migrate deploy` before deploy
- health check at `/health`

### Required backend env vars

Set these in Railway:

```bash
NODE_ENV=production
HOST=0.0.0.0
DATABASE_URL=postgresql://...
FRONTEND_ORIGIN=https://your-frontend-domain.vercel.app
SESSION_COOKIE_NAME=izledger_session
SESSION_TTL_DAYS=14
SESSION_COOKIE_SAME_SITE=none
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_DOMAIN=
BCRYPT_ROUNDS=12
AUTH_RATE_LIMIT_MAX=10
AUTH_RATE_LIMIT_WINDOW_MINUTES=1
STORAGE_BUCKET=...
STORAGE_REGION=...
STORAGE_ENDPOINT=https://...
STORAGE_ACCESS_KEY=...
STORAGE_SECRET_KEY=...
STORAGE_PUBLIC_BASE_URL=
STORAGE_FORCE_PATH_STYLE=false
STORAGE_SIGNED_READS=true
STORAGE_SIGNED_READ_TTL_SECONDS=900
LOG_LEVEL=info
```

Railway will normally inject `PORT` for you, so you usually do not need to set it manually.

## Cookie note

If the frontend stays on Vercel and the API stays on a different Railway domain, cross-site cookies usually require:

- `SESSION_COOKIE_SAME_SITE=none`
- `SESSION_COOKIE_SECURE=true`

If you later proxy API requests through the Vercel domain, you may be able to relax that setup.

## Deploy order

1. Provision the production database and object storage.
2. Deploy the backend on Railway.
3. Set `FRONTEND_ORIGIN` to the Vercel production URL or custom domain.
4. Deploy the frontend on Vercel.
5. If you wire the frontend to the API, set `VITE_API_URL` in Vercel.

## Verification checklist

- Vercel site loads without 404s on deep links
- Railway `/health` returns `200`
- Prisma migrations run during deploy
- login cookies are marked `Secure`
- CORS origin exactly matches the deployed frontend domain
