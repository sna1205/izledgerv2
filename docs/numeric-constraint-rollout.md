# Numeric Constraint Rollout

## Scope

This rollout protects the persisted numeric fields that matter for trade integrity and analytics:

- `accounts.balance`
- `trades.entry`
- `trades.stop_loss`
- `trades.take_profit`
- `trades.profit`
- `trades.entry <> trades.stop_loss` to prevent zero-risk trades

There is no persisted lot-size field in the backend schema today. The lot calculator is frontend-only and is not part of this DB rollout.

## Staged rollout

### Phase 0: audit first

Run:

```bash
npm run numeric:audit --workspace @izledger/api
```

If any rows are reported, generate a remediation report:

```bash
npm run numeric:backfill --workspace @izledger/api
```

This script writes a report under `apps/api/prisma/backfill-reports/`.
It does not auto-clamp financial history.

## Why automatic mutation is disabled

Silently changing persisted balances, prices, or PnL is unsafe for a trading journal.
If numeric rows are already corrupt, they must be corrected from the source of truth or explicitly reviewed.

### Phase 1: protect new writes immediately

Migration `20260322150000_numeric_constraints_not_valid` adds DB constraints as `NOT VALID`.

That means:

- new inserts/updates are checked immediately
- existing bad rows do not block the migration yet

### Phase 2: validate only when clean

Migration `20260322150500_numeric_constraints_validate` attempts to validate each constraint only if the target database is already clean.

If violations still exist, it skips validation with a PostgreSQL notice instead of failing the deploy.

### Phase 3: explicitly validate after cleanup

If phase 2 skipped validation because the database still had bad legacy rows, fix those rows from the source of truth first, then run:

```bash
npm run numeric:validate --workspace @izledger/api
```

This command refuses to run while the audit still finds invalid rows.

## Commands

```bash
npm run numeric:audit --workspace @izledger/api
npm run numeric:backfill --workspace @izledger/api
npm run numeric:validate --workspace @izledger/api
```

## What to verify after deploy

1. `npm run numeric:audit --workspace @izledger/api` returns zero invalid rows.
2. Invalid raw SQL writes are rejected by the database.
3. Trade analytics still load normally.

## Constraint list

- `accounts_balance_range_chk`
- `trades_entry_range_chk`
- `trades_stop_loss_range_chk`
- `trades_take_profit_range_chk`
- `trades_profit_range_chk`
- `trades_entry_stop_loss_gap_chk`
