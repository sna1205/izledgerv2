# IZLedger Persistence Architecture

## Target architecture in simple terms

The frontend is a UI client, not the system of record.
All important journal data lives in Postgres behind the API.
Authentication is handled by backend-issued HTTP-only session cookies.
Screenshot files live in S3-compatible object storage, while Postgres stores only metadata and ownership.
Schema changes move through Prisma migrations so deploys do not wipe data.

## Current stack in this repo

- Frontend: React + Vite (`apps/web`)
- Backend: Fastify (`apps/api`)
- ORM: Prisma
- Frontend deployment target: Vercel (`apps/web/vercel.json`)
- Backend deployment target: Render (`render.yaml`)
- Database target: Neon Postgres
- File storage: S3-compatible object storage via the AWS SDK
- Auth: server-side session auth with HTTP-only cookies

## Phase 1 audit

### Server-backed data already in production flow

- accounts: API + Prisma + Postgres
- trades: API + Prisma + Postgres
- setups: API + Prisma + Postgres
- reviews: API + Prisma + Postgres
- trade shares: API + Prisma + Postgres
- screenshot uploads: API + Prisma + object storage

### Remaining browser-only persistence

- theme preference in `apps/web/index.html`
- active account filter preference in `apps/web/src/lib/account-filter.ts`
- legacy auth cache key in `localStorage`

Only the first two are UI preferences. They are not business data.
The legacy auth cache is now treated as stale migration residue and cleared on startup.

## Data ownership model

### User-owned tables

- `users`
- `sessions`
- `accounts`
- `setups`
- `trades`
- `reviews`
- `trade_shares`
- `trade_screenshot_uploads`
- `trade_screenshots`

Every user-owned row now carries `user_id` directly, including screenshot metadata.

## Screenshot storage flow

1. The authenticated client asks the API for a presigned upload.
2. The API validates trade ownership and creates a pending upload row.
3. The browser uploads the file directly to object storage.
4. The client calls the completion endpoint.
5. The API verifies the signed upload token, checks object metadata, and writes screenshot metadata to Postgres.
6. Deleting a screenshot removes the metadata row and queues durable blob cleanup.
7. A background cleanup runner retries failed deletes and reconciles expired uploads, orphaned blobs, and dangling screenshot rows.

## Environment separation

- Frontend env lives in `apps/web/.env.local` and only exposes `VITE_*` variables.
- Backend env lives in `apps/api/.env`.
- Secrets such as database credentials, session settings, and storage keys stay server-side only.
- Example env templates now live in:
  - `apps/web/.env.example`
  - `apps/api/.env.example`

## Deployment and data safety

- Database schema changes must be committed under `apps/api/prisma/migrations`
- Render runs `prisma migrate deploy` in a dedicated pre-deploy step
- Production should use Neon pooled `DATABASE_URL`
- `DIRECT_URL` is recommended for Prisma migrations
- Object storage should be treated as persistent infrastructure, never temporary server disk

## Migration status

No remaining core trading entities were found in browser storage during this audit.
There is no trade/account/review/setup localStorage dataset to import in the current repo state.
The only browser migration concern is the legacy cached auth identity key, which is now cleared automatically.
