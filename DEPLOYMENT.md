# Deployment Guide

## Frontend

- Root directory: `apps/web`
- Build command: `npm run build`
- Output directory: `dist`
- Required env: `VITE_API_BASE_URL=https://your-api-domain`

## Backend

- Root directory: `apps/api`
- Start command: `npm run start`
- Run migrations on deploy: `npm run prisma:migrate:deploy`

Required backend envs:

```bash
NODE_ENV=production
HOST=0.0.0.0
DATABASE_URL=postgresql://...
FRONTEND_ORIGIN=https://your-frontend-domain
SESSION_COOKIE_NAME=izledger_session
SESSION_TTL_DAYS=14
SESSION_COOKIE_SAME_SITE=none
SESSION_COOKIE_SECURE=true
BCRYPT_ROUNDS=12
AUTH_RATE_LIMIT_MAX=10
AUTH_RATE_LIMIT_WINDOW_MINUTES=1
STORAGE_ENABLED=false
LOG_LEVEL=info
```

If screenshots are enabled:

```bash
STORAGE_BUCKET=...
STORAGE_REGION=...
STORAGE_ENDPOINT=
STORAGE_ACCESS_KEY=...
STORAGE_SECRET_KEY=...
STORAGE_PUBLIC_BASE_URL=
STORAGE_FORCE_PATH_STYLE=false
STORAGE_SIGNED_READS=true
STORAGE_SIGNED_READ_TTL_SECONDS=900
```

## Checklist

- Frontend points to the production API URL.
- Backend `FRONTEND_ORIGIN` matches the deployed frontend exactly.
- Cookies are `Secure` in production.
- Prisma migrations run during deploy.
- Storage is either fully configured or disabled.
