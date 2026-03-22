import assert from "node:assert/strict";
import test from "node:test";

process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@127.0.0.1:5433/izledger_test";
process.env.STORAGE_ENABLED = "true";
process.env.STORAGE_BUCKET = "izledger";
process.env.STORAGE_REGION = "auto";
process.env.STORAGE_ACCESS_KEY = "access-key";
process.env.STORAGE_SECRET_KEY = "secret-key";
process.env.STORAGE_ENDPOINT = "https://example.r2.cloudflarestorage.com/izledger";

const [{ createPresignedUpload, normalizeStorageEndpoint, storageObjectUrl }] = await Promise.all([
  import("../src/lib/storage.js"),
]);

test("storage endpoint normalization removes a duplicate bucket suffix", async () => {
  assert.equal(
    normalizeStorageEndpoint("https://example.r2.cloudflarestorage.com/izledger", "izledger"),
    "https://example.r2.cloudflarestorage.com",
  );

  const upload = await createPresignedUpload({
    key: "users/user-1/trades/trade-1/chart.png",
    contentType: "image/png",
  });

  assert.equal(upload.url, upload.uploadUrl);
  const uploadUrl = new URL(upload.uploadUrl);

  assert.equal(uploadUrl.origin, "https://example.r2.cloudflarestorage.com");
  assert.equal(uploadUrl.pathname, "/izledger/users/user-1/trades/trade-1/chart.png");
  assert.equal(
    storageObjectUrl("users/user-1/trades/trade-1/chart.png"),
    "https://example.r2.cloudflarestorage.com/izledger/users/user-1/trades/trade-1/chart.png",
  );
});
