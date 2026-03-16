# IZLedger API

Fastify + Prisma backend for the IZLedger trading journal.

## Local development

1. Copy envs:

```bash
cp .env.example .env
```

2. Start local services if needed:

```bash
docker compose up -d
```

3. Generate Prisma client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate:dev
```

4. Start the API:

```bash
npm run dev
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

## Notes

- New users no longer receive seeded starter data.
- Screenshots are stored in S3-compatible object storage when enabled.
- Session auth is cookie-based and intended for the companion SPA frontend.
