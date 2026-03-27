import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { Prisma } from "@prisma/client";

process.env.NODE_ENV = "test";
process.env.STORAGE_ENABLED = "false";
process.env.LOG_LEVEL = "silent";
process.env.APP_URL ??= "http://127.0.0.1:3000";
process.env.DATABASE_URL ??= process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5433/izledger_test";

const [{ buildApp }, { prisma }] = await Promise.all([
  import("../src/app.js"),
  import("../src/lib/prisma.js"),
]);

function getSessionCookie(setCookieHeader: string | string[] | undefined) {
  const rawCookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  assert.ok(rawCookie, "Expected auth response to set a session cookie.");
  return rawCookie.split(";", 1)[0];
}

function expectForeignKeyError(error: unknown, constraintName: string) {
  assert.ok(error instanceof Prisma.PrismaClientKnownRequestError, "Expected Prisma FK error.");
  assert.equal(error.code, "P2003");
  const fieldName = String(error.meta?.field_name ?? "");
  assert.match(fieldName, new RegExp(constraintName));
}

test("ownership hardening blocks cross-user writes and still allows owner actions on archived trade history", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const ownerUsername = `own${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const attackerUsername = `atk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const password = "Password123!";

  try {
    const ownerRegisterResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        username: ownerUsername,
        password,
      },
    });

    assert.equal(ownerRegisterResponse.statusCode, 201);
    const ownerSessionCookie = getSessionCookie(ownerRegisterResponse.headers["set-cookie"]);
    const ownerUserId = ownerRegisterResponse.json().user.id as string;

    const attackerRegisterResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        username: attackerUsername,
        password,
      },
    });

    assert.equal(attackerRegisterResponse.statusCode, 201);
    const attackerUserId = attackerRegisterResponse.json().user.id as string;

    const ownerAccountResponse = await app.inject({
      method: "POST",
      url: "/accounts",
      headers: {
        cookie: ownerSessionCookie,
      },
      payload: {
        name: "Owner Account",
        broker: "Manual",
        type: "Personal",
        balance: 5000,
        currency: "USD",
      },
    });

    assert.equal(ownerAccountResponse.statusCode, 201);
    const ownerAccountId = ownerAccountResponse.json().account.id as string;

    const attackerAccount = await prisma.account.create({
      data: {
        userId: attackerUserId,
        name: "Attacker Account",
        broker: "Manual",
        type: "Personal",
        balance: 1000,
        currency: "USD",
      },
    });

    const ownerSetup = await prisma.setup.create({
      data: {
        userId: ownerUserId,
        name: "Owner Setup",
        nameNormalized: "owner setup",
        description: "Owner setup",
        color: "#10B981",
      },
    });

    const attackerRule = await prisma.checklistRule.create({
      data: {
        userId: attackerUserId,
        title: "Attacker rule",
        titleNormalized: "attacker rule",
        scopeType: "global",
      },
    });

    await assert.rejects(
      () =>
        prisma.trade.create({
          data: {
            userId: ownerUserId,
            accountId: attackerAccount.id,
            tradeDate: new Date("2026-03-21T00:00:00.000Z"),
            pair: "EURUSD",
            direction: "Buy",
            entry: 1.1,
            stopLoss: 1.09,
            takeProfit: 1.12,
            profit: 100,
            result: "Win",
            notes: "Cross-user account should fail",
          },
        }),
      (error) => {
        expectForeignKeyError(error, "trades_account_id_user_id_fkey");
        return true;
      },
    );

    const createTradeResponse = await app.inject({
      method: "POST",
      url: "/trades",
      headers: {
        cookie: ownerSessionCookie,
      },
      payload: {
        date: "2026-03-21",
        accountId: ownerAccountId,
        pair: "EURUSD",
        entry: 1.1,
        stopLoss: 1.09,
        takeProfit: 1.12,
        profit: 100,
        setupId: ownerSetup.id,
        notes: "Owner trade",
      },
    });

    assert.equal(createTradeResponse.statusCode, 201);
    const tradeId = createTradeResponse.json().trade.id as string;

    await assert.rejects(
      () =>
        prisma.tradeScreenshot.create({
          data: {
            userId: attackerUserId,
            tradeId,
            storageKey: `users/${attackerUserId}/trades/${tradeId}/cross-user.png`,
            sortOrder: 0,
          },
        }),
      (error) => {
        expectForeignKeyError(error, "trade_screenshots_trade_id_user_id_fkey");
        return true;
      },
    );

    await assert.rejects(
      () =>
        prisma.tradeScreenshotUpload.create({
          data: {
            id: crypto.randomUUID(),
            userId: attackerUserId,
            tradeId,
            storageKey: `users/${attackerUserId}/trades/${tradeId}/cross-user-upload.png`,
            fileName: "cross-user-upload.png",
            contentType: "image/png",
            fileSize: 128,
            expiresAt: new Date("2026-03-22T00:00:00.000Z"),
          },
        }),
      (error) => {
        expectForeignKeyError(error, "trade_screenshot_uploads_trade_id_user_id_fkey");
        return true;
      },
    );

    await assert.rejects(
      () =>
        prisma.tradeShare.create({
          data: {
            tradeId,
            userId: attackerUserId,
            shareId: `share_${Date.now().toString(36)}`,
            shareSettings: {
              version: 1,
              data: {
                showPnl: true,
                showAccountName: false,
                showNotes: true,
                showScreenshots: true,
                showExactPrices: true,
              },
            },
            snapshot: {
              version: 1,
              data: {
                tradeId,
                pair: "EURUSD",
                direction: "Buy",
                result: "Win",
                date: "2026-03-21",
                entry: 1.1,
                stopLoss: 1.09,
                takeProfit: 1.12,
                pnl: 100,
                screenshots: [],
              },
            },
          },
        }),
      (error) => {
        expectForeignKeyError(error, "trade_shares_trade_id_user_id_fkey");
        return true;
      },
    );

    await assert.rejects(
      () =>
        prisma.review.create({
          data: {
            userId: attackerUserId,
            type: "trade",
            tradeId,
            lessonLearned: "Cross-user review should fail",
          },
        }),
      (error) => {
        expectForeignKeyError(error, "reviews_trade_id_user_id_fkey");
        return true;
      },
    );

    await assert.rejects(
      () =>
        prisma.tradeChecklistResponse.create({
          data: {
            tradeId,
            userId: attackerUserId,
            checklistRuleId: null,
            ruleTitleSnapshot: "Cross-user response",
            checked: true,
          },
        }),
      (error) => {
        expectForeignKeyError(error, "trade_checklist_responses_trade_id_user_id_fkey");
        return true;
      },
    );

    await assert.rejects(
      () =>
        prisma.tradeChecklistResponse.create({
          data: {
            tradeId,
            userId: ownerUserId,
            checklistRuleId: attackerRule.id,
            ruleTitleSnapshot: "Wrong-owner rule",
            checked: true,
          },
        }),
      (error) => {
        assert.match(String(error.message), /same user/i);
        return true;
      },
    );

    const archiveAccountResponse = await app.inject({
      method: "PATCH",
      url: `/accounts/${ownerAccountId}`,
      headers: {
        cookie: ownerSessionCookie,
      },
      payload: {
        isArchived: true,
      },
    });

    assert.equal(archiveAccountResponse.statusCode, 200);

    const createShareAfterArchiveResponse = await app.inject({
      method: "POST",
      url: `/trades/${tradeId}/share`,
      headers: {
        cookie: ownerSessionCookie,
      },
      payload: {
        settings: {
          showPnl: true,
          showAccountName: true,
          showNotes: false,
          showScreenshots: false,
          showExactPrices: true,
        },
      },
    });

    assert.equal(createShareAfterArchiveResponse.statusCode, 201);
  } finally {
    await app.close();
    await prisma.user.deleteMany({
      where: {
        username: {
          in: [ownerUsername, attackerUsername],
        },
      },
    });
    await prisma.$disconnect();
  }
});
