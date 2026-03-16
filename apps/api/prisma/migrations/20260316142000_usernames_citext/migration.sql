CREATE EXTENSION IF NOT EXISTS "citext";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "users" u1
    JOIN "users" u2
      ON LOWER(u1."username") = LOWER(u2."username")
     AND u1."id" <> u2."id"
  ) THEN
    RAISE EXCEPTION 'Cannot convert users.username to CITEXT while case-insensitive duplicate usernames exist.';
  END IF;
END $$;

ALTER TABLE "users"
  ALTER COLUMN "username" TYPE CITEXT
  USING "username"::CITEXT;
