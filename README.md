# IZLedger

IZLedger is a monorepo with:

- `apps/web`: React + Vite frontend
- `apps/api`: Fastify + Prisma backend
- `packages/shared`: shared domain types

The app is now fully API-backed. Mock journal data, local-only auth, and client-side trade storage have been removed.

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

5. Start both apps:

```bash
npm run dev
```

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
FRONTEND_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://...
SESSION_COOKIE_NAME=izledger_session
SESSION_TTL_DAYS=14
SESSION_COOKIE_SAME_SITE=lax
SESSION_COOKIE_SECURE=false
BCRYPT_ROUNDS=12
AUTH_RATE_LIMIT_MAX=10
AUTH_RATE_LIMIT_WINDOW_MINUTES=1
STORAGE_ENABLED=false
LOG_LEVEL=info
```

If `STORAGE_ENABLED=true`, these are also required:

```bash
STORAGE_BUCKET=...
STORAGE_REGION=...
STORAGE_ACCESS_KEY=...
STORAGE_SECRET_KEY=...
```

Optional storage settings:

```bash
STORAGE_ENDPOINT=
STORAGE_PUBLIC_BASE_URL=
STORAGE_FORCE_PATH_STYLE=true
STORAGE_SIGNED_READS=true
STORAGE_SIGNED_READ_TTL_SECONDS=900
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
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:migrate:deploy
npm run prisma:studio
```

## Production deployment notes

- Set `VITE_API_BASE_URL` to the public API origin used by the frontend.
- Set `NODE_ENV=production` on the API.
- Set `FRONTEND_ORIGIN` to the deployed frontend origin.
- Set `SESSION_COOKIE_SECURE=true` in production.
- If the frontend and API are on different domains, use `SESSION_COOKIE_SAME_SITE=none` and HTTPS.
- Run `npm run prisma:migrate:deploy` during backend deploys.
- Prefer managed Postgres and S3-compatible object storage for screenshots.
- If screenshot storage is not ready yet, set `STORAGE_ENABLED=false`.

## Production readiness summary

- No mock/demo journal seeding remains.
- Frontend auth uses backend HTTP-only cookie sessions.
- Frontend requests go through a centralized API client and env config.
- Empty databases render clean empty states instead of fake starter content.
- Frontend and backend both build successfully for production.
