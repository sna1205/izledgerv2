# Backup And Restore Guide

This repo cannot turn on Neon backups or S3 bucket versioning by itself. What it can do is make the required production setup explicit, provide safe config templates, and give you a repeatable restore verification command.

For phase 1, use this production baseline:

- database: Neon Postgres with point-in-time restore enabled
- screenshot storage: AWS S3 with bucket versioning enabled
- app runtime: Render for `apps/api`, Vercel for `apps/web`

If you stay on another S3-compatible provider, keep the same storage-key format and retention goals, but do not treat the setup as production-ready unless the provider gives you version history or an equivalent immutable retention workflow.

## 1. Backup strategy

### Database backups

Use two layers:

1. Primary recovery: Neon point-in-time restore (PITR)
2. Secondary recovery: nightly logical exports kept outside the database provider

Recommended production settings:

- enable Neon PITR before the first real-user launch
- keep at least 7 days of restore history; prefer 30 days for beta or production users
- use a direct Postgres connection string for backup/export jobs
- store nightly logical dumps in a separate S3 backup bucket, not in the screenshot bucket
- keep backup-bucket credentials separate from the app runtime credentials

Nightly logical export shape:

- command: `pg_dump --format=custom --no-owner --no-privileges`
- output name: `postgres/daily/YYYY/MM/DD/izledger-<timestamp>.dump`
- retention: 35 days for daily dumps, 180 days for weekly/monthly checkpoints if you keep them

You can schedule that export from a GitHub Actions workflow, a Render cron service, or another scheduler that can reach the production database with a direct connection string. The repo does not activate a scheduler automatically.

### Screenshot/object storage protection

Preferred production storage is AWS S3 because the app already uses the S3 API and S3 supports versioning without code changes.

Required storage settings:

- create a dedicated screenshots bucket
- keep screenshots in object storage only; never write them to Render disk
- enable bucket versioning before production data lands
- enable server-side encryption
- keep public access blocked unless you intentionally use a public `STORAGE_PUBLIC_BASE_URL`
- keep noncurrent object versions for at least 30 days
- keep delete markers and old versions long enough to recover from bad deletes or bad deploys
- apply lifecycle cleanup only to noncurrent versions and abandoned multipart uploads

Use the template in [aws-s3-screenshot-lifecycle.json](/mnt/c/Users/PCM/Documents/IZledgerV2/IZLedgerV2/docs/templates/aws-s3-screenshot-lifecycle.json).

### Backup bucket for logical dumps

Create a second bucket for database exports:

- bucket example: `izledger-prod-db-backups`
- versioning: enabled
- encryption: enabled
- lifecycle: expire old daily exports, keep weekly/monthly exports longer

Use the template in [aws-s3-logical-backup-lifecycle.json](/mnt/c/Users/PCM/Documents/IZledgerV2/IZLedgerV2/docs/templates/aws-s3-logical-backup-lifecycle.json).

## 2. Provider setup checklist

### Neon production database

1. Create a dedicated production Neon project.
2. Create the production database and users.
3. Record both:
   - pooled `DATABASE_URL`
   - direct `DIRECT_URL`
4. Enable point-in-time restore for the project.
5. Set the PITR retention window to your launch target.
6. Store Neon admin access separately from app runtime credentials.
7. Document who can create restore branches and who can rotate credentials.

### AWS S3 screenshots bucket

1. Create the production screenshots bucket in the same region family as the API when possible.
2. Enable bucket versioning.
3. Enable default encryption.
4. Block public access unless you intentionally serve public screenshot URLs.
5. Apply the screenshot lifecycle template.
6. Create one access key for the app runtime only.
7. Do not reuse the backup-bucket credentials for the app runtime.

### AWS S3 logical-backup bucket

1. Create a second bucket only for logical database exports.
2. Enable bucket versioning.
3. Enable default encryption.
4. Apply the logical-backup lifecycle template.
5. Restrict write access to the backup automation principal only.
6. Restrict read/delete access to operators who perform restore drills.

## 3. Runtime env and config checklist

Runtime env vars already used by the app:

- `DATABASE_URL`
- `DIRECT_URL`
- `STORAGE_ENABLED`
- `STORAGE_BUCKET`
- `STORAGE_REGION`
- `STORAGE_ENDPOINT`
- `STORAGE_ACCESS_KEY`
- `STORAGE_SECRET_KEY`
- `STORAGE_PUBLIC_BASE_URL`
- `STORAGE_FORCE_PATH_STYLE`
- `STORAGE_SIGNED_READS`
- `STORAGE_SIGNED_READ_TTL_SECONDS`

Restore-verification-only env vars added in this step:

- `RESTORE_VERIFY_API_URL`
- `RESTORE_VERIFY_STORAGE_SAMPLE_SIZE`
- `RESTORE_VERIFY_REQUIRE_API`
- `RESTORE_VERIFY_REQUIRE_STORAGE`

Non-runtime provider settings that must exist outside the repo:

- Neon PITR enabled
- screenshots bucket versioning enabled
- logical-backup bucket versioning enabled
- lifecycle rules applied to both buckets
- scheduled nightly logical export configured
- restore operator list documented

## 4. Restore runbook

Use this runbook for a real restore or a scheduled restore drill.

### A. Freeze and capture state

1. Stop deploys and pause any background jobs that mutate production data.
2. Put the frontend in maintenance mode or temporarily block write traffic.
3. Record the target restore timestamp in UTC.
4. Export the current broken state before changing anything if the database is still reachable.

### B. Restore the database

Preferred path:

1. Create a Neon restore branch at the target timestamp.
2. Obtain fresh pooled and direct connection strings for the restored branch.
3. Do not point production traffic at the restored branch yet.

Fallback path if you are restoring from a logical dump:

1. Create a new empty Postgres database.
2. Restore the `.dump` file with `pg_restore`.
3. Set `DATABASE_URL` and `DIRECT_URL` to the restored database.

### C. Restore object storage if needed

If the screenshot bucket still exists and the incident was database-only:

- do not rewrite the bucket
- keep the bucket as-is
- verify screenshot rows still point at valid objects

If objects were deleted or overwritten:

1. Use S3 object version history to restore the affected keys.
2. Restore only the versions for keys still referenced by `trade_screenshots`.
3. Do not bulk-delete current objects during the restore.

### D. Reconcile schema and app version

1. Deploy the app commit that matches the restored schema state, or a forward-compatible newer commit.
2. Run `npm run release:migrate --workspace @izledger/api` against the restored database.
3. Confirm migrations complete cleanly before any production cutover.

### E. Boot and verify

1. Start the restored API against the restored database.
2. Confirm `GET /health` returns `200`.
3. Run:

```bash
npm run restore:verify --workspace @izledger/api -- --api-url=https://api-restored.example.com --storage-sample-size=50
```

4. Verify at least one known real user can:
   - log in
   - open accounts
   - open trades
   - load review history
   - view a trade with screenshots

### F. Cut over

1. Swap Render env vars to the restored `DATABASE_URL` and `DIRECT_URL`.
2. Re-deploy the API if needed.
3. Re-run `npm run restore:verify --workspace @izledger/api`.
4. Re-enable frontend traffic.

## 5. Restore verification command

This step adds:

```bash
npm run restore:verify --workspace @izledger/api
```

What it checks:

- database connectivity
- row counts for core persistence tables
- latest completed Prisma migration
- optional API `/health` response if `RESTORE_VERIFY_API_URL` is set
- screenshot storage-key prefix integrity
- existence of sampled screenshot objects when storage is enabled

Useful flags:

```bash
npm run restore:verify --workspace @izledger/api -- --api-url=https://api-restored.example.com
npm run restore:verify --workspace @izledger/api -- --storage-sample-size=all
npm run restore:verify --workspace @izledger/api -- --require-api=true --require-storage=true
```

## 6. Minimal restore drill checklist

Run this at least once before onboarding beta users:

1. Restore production-like data into a non-production database.
2. Point a temporary API instance at the restored database.
3. Run `npm run restore:verify --workspace @izledger/api`.
4. Open the app and confirm the restored API boots and serves real data.
5. Verify at least one trade with screenshots still resolves its screenshot objects.
6. Record the restore duration, issues found, and final command history.

If any of these fail, the backup setup is not production-ready.
