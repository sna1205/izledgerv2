# IZLedger Monorepo

IZLedger is now organized as a workspace-based monorepo so the frontend, backend, and future shared packages can evolve together without the old mixed root layout.

## Structure

```text
apps/
  web/      React + Vite frontend
  api/      Fastify + Prisma backend
packages/
  shared/   Shared types and contracts
```

## Workspace commands

Install everything from the root:

```bash
npm install
```

Run both apps together:

```bash
npm run dev
```

Run one app at a time:

```bash
npm run dev:web
npm run dev:api
```

Build:

```bash
npm run build
```

Backend Prisma helpers:

```bash
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:seed
```

## App docs

- Web app: [apps/web](/mnt/c/Users/PCM/Documents/IZledgerV2/chart-mate-log/apps/web)
- API app: [apps/api/README.md](/mnt/c/Users/PCM/Documents/IZledgerV2/chart-mate-log/apps/api/README.md)
- Frontend integration notes: [apps/api/FRONTEND_INTEGRATION.md](/mnt/c/Users/PCM/Documents/IZledgerV2/chart-mate-log/apps/api/FRONTEND_INTEGRATION.md)

## Notes

- The frontend lives entirely under `apps/web`.
- The backend lives entirely under `apps/api`.
- Shared code can now move into `packages/shared` without cross-app path hacks.
