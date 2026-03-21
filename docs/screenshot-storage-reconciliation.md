# Screenshot Storage Reconciliation

## Why this exists

Screenshot metadata lives in Postgres and screenshot files live in object storage.
Those two systems can drift when:

- a screenshot DB row is deleted but blob deletion fails
- a presigned upload expires after the browser already uploaded the object
- a blob exists in storage without any live DB reference
- a DB screenshot row still points at a blob that no longer exists

The app now handles that drift with a durable `screenshot_cleanup_tasks` queue plus a reconciliation command.

## Queue behavior

### User-facing delete flow

1. The API deletes the `trade_screenshots` row inside a DB transaction.
2. In the same transaction it upserts a `screenshot_cleanup_tasks` row for the blob delete.
3. The API tries to process that task immediately.
4. If object deletion fails, the user still gets a successful delete response and the task stays queued for retry.

### Expired upload flow

1. The cleanup runner finds expired incomplete `trade_screenshot_uploads`.
2. It queues:
   - blob deletion for the uploaded key
   - row deletion for the expired pending upload
3. Both tasks retry independently until they succeed.

### Reconciliation flow

The reconciliation command also:

- scans object storage for orphaned screenshot objects
- checks screenshot rows for missing blobs
- queues cleanup tasks for both cases

## Commands

Run the normal retry queue:

```bash
npm run screenshots:cleanup:run --workspace @izledger/api
```

Run a wider reconciliation pass:

```bash
npm run screenshots:reconcile --workspace @izledger/api
```

Optional flags:

- `--limit=250`
- `--prefix=users/`

Examples:

```bash
npm run screenshots:cleanup:run --workspace @izledger/api -- --limit=250
npm run screenshots:reconcile --workspace @izledger/api -- --limit=500 --prefix=users/
```

## What to schedule

Production should schedule `screenshots:cleanup:run` on a short interval, for example every 5 to 15 minutes.

Use `screenshots:reconcile`:

- after storage incidents
- after restoring DB or object storage backups
- before or after bucket migration work
- during manual integrity audits

## What success looks like

- `screenshot_cleanup_tasks.completed_at` is populated for processed tasks
- expired pending upload rows are removed
- orphaned objects are deleted
- dangling screenshot rows are removed

## What to check if cleanup stalls

- `STORAGE_ENABLED=true`
- storage credentials point at the correct bucket
- `screenshot_cleanup_tasks.last_error` contains recent retry failures
- `next_attempt_at` keeps moving forward instead of staying stuck

## Safety notes

- The queue uses a dedupe key so repeated delete/reconcile runs do not multiply tasks for the same target.
- Cleanup is idempotent. Re-running the commands is safe.
- No founder/admin UI is required. These are internal operator commands only.
