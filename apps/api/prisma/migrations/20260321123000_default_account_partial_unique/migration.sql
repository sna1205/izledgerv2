WITH ranked_defaults AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY created_at ASC, id ASC
    ) AS row_number
  FROM accounts
  WHERE is_default = true
),
users_missing_default AS (
  SELECT DISTINCT a.user_id
  FROM accounts a
  WHERE NOT EXISTS (
    SELECT 1
    FROM accounts existing_default
    WHERE existing_default.user_id = a.user_id
      AND existing_default.is_default = true
  )
),
first_account_per_user AS (
  SELECT DISTINCT ON (a.user_id)
    a.id
  FROM accounts a
  INNER JOIN users_missing_default missing
    ON missing.user_id = a.user_id
  ORDER BY a.user_id, a.created_at ASC, a.id ASC
)
UPDATE accounts
SET is_default = false
WHERE id IN (
  SELECT id
  FROM ranked_defaults
  WHERE row_number > 1
);

WITH users_missing_default AS (
  SELECT DISTINCT a.user_id
  FROM accounts a
  WHERE NOT EXISTS (
    SELECT 1
    FROM accounts existing_default
    WHERE existing_default.user_id = a.user_id
      AND existing_default.is_default = true
  )
),
first_account_per_user AS (
  SELECT DISTINCT ON (a.user_id)
    a.id
  FROM accounts a
  INNER JOIN users_missing_default missing
    ON missing.user_id = a.user_id
  ORDER BY a.user_id, a.created_at ASC, a.id ASC
)
UPDATE accounts
SET is_default = true
WHERE id IN (
  SELECT id
  FROM first_account_per_user
);

CREATE UNIQUE INDEX IF NOT EXISTS "accounts_one_default_per_user_idx"
ON "accounts" ("user_id")
WHERE "is_default" = true;
