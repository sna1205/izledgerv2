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
npm run prisma:check:release
npm run check:persistence:release
```

The persistence gate prepares a clean PostgreSQL integration database and runs a fixed test set covering:

- account create/update/archive/delete-blocked behavior
- trade create/read/update/delete persistence
- review create/read/list uniqueness behavior
- screenshot metadata and cleanup lifecycle
- trade share snapshot parsing and legacy payload compatibility

## Contributor note

Do not weaken this gate by adding `.skip`, `test.skip`, `.todo`, `test.todo`, `.only`, or `test.only` to the persistence-critical test files.

If a persistence-critical test is flaky or broken, fix it or remove the feature from the release path. Do not ship around the gate.

