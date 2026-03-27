# Persistence Release Gate

This gate is the minimum release check for user data safety.

It must pass before merging or deploying persistence-related changes.

## What it blocks

- uncommitted or untracked Prisma schema and migration changes
- Prisma schema drift against committed migrations
- persistence-critical integration tests that fail
- persistence-critical integration tests that are skipped, cancelled, or marked todo

## Commands

From the repo root:

```bash
npm run release:check
```

That wrapper runs, in order:

- `npm run prisma:check:release`
- `npm run check:persistence:release`
- `npm run backup:check -- --require-restore-drill=true` when `RELEASE_CHECK_REQUIRE_BACKUP=true` or backup env vars are present

Set `PRISMA_MIGRATE_CHECK_SHADOW_DATABASE_URL` to a disposable PostgreSQL database before running the gate so migration drift checks can compare committed migrations against `schema.prisma`.

The persistence gate prepares a clean PostgreSQL integration database and runs a fixed test set covering:

- account create/update/archive/delete-blocked behavior
- trade create/read/update/delete persistence
- review create/read/list uniqueness behavior
- screenshot metadata and cleanup lifecycle
- trade share snapshot parsing and legacy payload compatibility

## Contributor note

Do not weaken this gate by adding `.skip`, `test.skip`, `.todo`, `test.todo`, `.only`, or `test.only` to the persistence-critical test files.

If a persistence-critical test is flaky or broken, fix it or remove the feature from the release path. Do not ship around the gate.
