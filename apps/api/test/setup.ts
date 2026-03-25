process.env.NODE_ENV = "test";
process.env.LOG_LEVEL ??= "silent";
process.env.STORAGE_ENABLED ??= "false";
process.env.APP_URL ??= "http://127.0.0.1:3000";
process.env.DATABASE_URL ??= process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5433/izledger_test";
process.env.DIRECT_URL ??= process.env.DATABASE_URL;
