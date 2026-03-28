import assert from "node:assert/strict";
import test from "node:test";
import { createAccountViaApi } from "./helpers.js";

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

function buildTradePayload(accountId: string, date: string, checklistResponses: Array<{
  checklistRuleId: string;
  checked: boolean;
}>, setupId: string) {
  return {
    date,
    accountId,
    pair: "EURUSD",
    direction: "Buy",
    entry: 1.1025,
    stopLoss: 1.1,
    takeProfit: 1.1075,
    profit: 150,
    result: "Win",
    setupId,
    notes: "Checklist integration test trade",
    checklistResponses,
    checklistScopeMode: "applicable",
  };
}

test("pre-trade checklist rules are enforced, snapshotted, and preserved historically", async () => {
  await prisma.$connect();

  const username = `cl${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "Password123!";
  const app = await buildApp();

  try {
    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { username, password },
    });

    assert.equal(registerResponse.statusCode, 201);
    const sessionCookie = getSessionCookie(registerResponse.headers["set-cookie"]);
    const account = await createAccountViaApi(app, sessionCookie);
    const createSetupResponse = await app.inject({
      method: "POST",
      url: "/setups",
      headers: { cookie: sessionCookie },
      payload: {
        name: "Breakout",
        description: "London continuation breakout setup.",
      },
    });

    assert.equal(createSetupResponse.statusCode, 201);
    const setupId = createSetupResponse.json().setup.id as string;

    const createRequiredRuleResponse = await app.inject({
      method: "POST",
      url: "/checklist-rules",
      headers: { cookie: sessionCookie },
      payload: {
        title: "Confirmed higher timeframe bias",
        description: "Bias aligned before entry.",
        isRequired: true,
        isActive: true,
        setupId,
      },
    });

    assert.equal(createRequiredRuleResponse.statusCode, 201);
    const requiredRuleId = createRequiredRuleResponse.json().rule.id as string;

    const createAccountRuleResponse = await app.inject({
      method: "POST",
      url: "/checklist-rules",
      headers: { cookie: sessionCookie },
      payload: {
        title: "Risk model matches this account",
        description: "Sizing confirmed against the active account constraints.",
        isRequired: true,
        isActive: true,
        accountId: account.id,
      },
    });

    assert.equal(createAccountRuleResponse.statusCode, 201);
    const accountRuleId = createAccountRuleResponse.json().rule.id as string;

    const createGlobalRuleResponse = await app.inject({
      method: "POST",
      url: "/checklist-rules",
      headers: { cookie: sessionCookie },
      payload: {
        title: "Journal intent is written down",
        description: "Reason for taking the trade is documented before entry.",
        isRequired: true,
        isActive: true,
      },
    });

    assert.equal(createGlobalRuleResponse.statusCode, 201);
    const globalRuleId = createGlobalRuleResponse.json().rule.id as string;

    const createOptionalRuleResponse = await app.inject({
      method: "POST",
      url: "/checklist-rules",
      headers: { cookie: sessionCookie },
      payload: {
        title: "Captured chart markup",
        description: "Annotated the setup before logging.",
        isRequired: false,
        isActive: true,
        setupId,
        accountId: account.id,
      },
    });

    assert.equal(createOptionalRuleResponse.statusCode, 201);
    const optionalRuleId = createOptionalRuleResponse.json().rule.id as string;

    const applicableRulesResponse = await app.inject({
      method: "GET",
      url: `/checklist-rules?activeOnly=true&accountId=${account.id}&setupId=${setupId}&scopeMode=applicable`,
      headers: { cookie: sessionCookie },
    });

    assert.equal(applicableRulesResponse.statusCode, 200);
    assert.deepEqual(
      (applicableRulesResponse.json().items as Array<{ title: string }>).map((rule) => rule.title),
      [
        "Confirmed higher timeframe bias",
        "Risk model matches this account",
        "Journal intent is written down",
        "Captured chart markup",
      ],
    );

    const setupsResponse = await app.inject({
      method: "GET",
      url: "/setups",
      headers: { cookie: sessionCookie },
    });

    assert.equal(setupsResponse.statusCode, 200);
    const setupSummary = (setupsResponse.json().items as Array<{
      id: string;
      preTradeChecklist?: Array<{
        id: string;
        title: string;
      }>;
    }>).find((item) => item.id === setupId);

    assert.ok(setupSummary);
    assert.equal(setupSummary.preTradeChecklist?.length, 2);
    assert.deepEqual(
      setupSummary.preTradeChecklist?.map((item) => item.title),
      ["Confirmed higher timeframe bias", "Captured chart markup"],
    );

    const softTradeResponse = await app.inject({
      method: "POST",
      url: "/trades",
      headers: { cookie: sessionCookie },
      payload: buildTradePayload(account.id, "2026-03-20", [
        { checklistRuleId: globalRuleId, checked: true },
        { checklistRuleId: accountRuleId, checked: true },
        { checklistRuleId: requiredRuleId, checked: false },
        { checklistRuleId: optionalRuleId, checked: true },
      ], setupId),
    });

    assert.equal(softTradeResponse.statusCode, 201, softTradeResponse.body);
    const softTradeId = softTradeResponse.json().trade.id as string;

    const softSnapshots = await prisma.tradeChecklistResponse.findMany({
      where: {
        tradeId: softTradeId,
      },
      orderBy: {
        sortOrderSnapshot: "asc",
      },
    });

    assert.equal(softSnapshots.length, 4);
    assert.equal(softSnapshots[0]?.ruleTitleSnapshot, "Confirmed higher timeframe bias");
    assert.equal(softSnapshots[0]?.checked, false);
    assert.equal(softSnapshots[1]?.ruleTitleSnapshot, "Risk model matches this account");
    assert.equal(softSnapshots[1]?.isRequiredSnapshot, true);
    assert.equal(softSnapshots[1]?.checked, true);
    assert.equal(softSnapshots[2]?.ruleTitleSnapshot, "Journal intent is written down");
    assert.equal(softSnapshots[2]?.checked, true);
    assert.equal(softSnapshots[3]?.ruleTitleSnapshot, "Captured chart markup");
    assert.equal(softSnapshots[3]?.checked, true);

    const strictPreferenceResponse = await app.inject({
      method: "PATCH",
      url: "/auth/preferences",
      headers: { cookie: sessionCookie },
      payload: {
        checklistEnforcementMode: "strict",
      },
    });

    assert.equal(strictPreferenceResponse.statusCode, 200);
    assert.equal(strictPreferenceResponse.json().user.checklistEnforcementMode, "strict");

    const strictBlockedResponse = await app.inject({
      method: "POST",
      url: "/trades",
      headers: { cookie: sessionCookie },
      payload: buildTradePayload(account.id, "2026-03-21", [
        { checklistRuleId: globalRuleId, checked: true },
        { checklistRuleId: accountRuleId, checked: true },
        { checklistRuleId: requiredRuleId, checked: false },
        { checklistRuleId: optionalRuleId, checked: true },
      ], setupId),
    });

    assert.equal(strictBlockedResponse.statusCode, 400);
    assert.equal(strictBlockedResponse.json().error.code, "CHECKLIST_INCOMPLETE");

    const strictTradeResponse = await app.inject({
      method: "POST",
      url: "/trades",
      headers: { cookie: sessionCookie },
      payload: buildTradePayload(account.id, "2026-03-22", [
        { checklistRuleId: globalRuleId, checked: true },
        { checklistRuleId: accountRuleId, checked: true },
        { checklistRuleId: requiredRuleId, checked: true },
        { checklistRuleId: optionalRuleId, checked: false },
      ], setupId),
    });

    assert.equal(strictTradeResponse.statusCode, 201);
    const strictTradeId = strictTradeResponse.json().trade.id as string;

    const updateRuleResponse = await app.inject({
      method: "PUT",
      url: `/checklist-rules/${requiredRuleId}`,
      headers: { cookie: sessionCookie },
      payload: {
        title: "Waited for daily confirmation",
        description: "Changed after trades were already journaled.",
        isRequired: false,
        isActive: true,
      },
    });

    assert.equal(updateRuleResponse.statusCode, 200);

    const deleteRuleResponse = await app.inject({
      method: "DELETE",
      url: `/checklist-rules/${optionalRuleId}`,
      headers: { cookie: sessionCookie },
    });

    assert.equal(deleteRuleResponse.statusCode, 204);

    const strictTradeDetailResponse = await app.inject({
      method: "GET",
      url: `/trades/${strictTradeId}`,
      headers: { cookie: sessionCookie },
    });

    assert.equal(strictTradeDetailResponse.statusCode, 200);
    const checklistResponses = strictTradeDetailResponse.json().trade.checklistResponses as Array<{
      checklistRuleId: string | null;
      ruleTitleSnapshot: string;
      isRequiredSnapshot: boolean;
      checked: boolean;
    }>;

    assert.equal(checklistResponses.length, 4);
    assert.equal(checklistResponses[0]?.ruleTitleSnapshot, "Confirmed higher timeframe bias");
    assert.equal(checklistResponses[0]?.isRequiredSnapshot, true);
    assert.equal(checklistResponses[0]?.checked, true);
    assert.equal(checklistResponses[1]?.ruleTitleSnapshot, "Risk model matches this account");
    assert.equal(checklistResponses[1]?.checked, true);
    assert.equal(checklistResponses[2]?.ruleTitleSnapshot, "Journal intent is written down");
    assert.equal(checklistResponses[2]?.checked, true);
    assert.equal(checklistResponses[3]?.ruleTitleSnapshot, "Captured chart markup");
    assert.equal(checklistResponses[3]?.checked, false);
    assert.equal(checklistResponses[3]?.checklistRuleId, null);
  } finally {
    await app.close();
    await prisma.user.deleteMany({
      where: { username },
    });
    await prisma.$disconnect();
  }
});

test("setup and account deletion are blocked while checklist rules still reference their scope", async () => {
  await prisma.$connect();

  const username = `clscope${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "Password123!";
  const app = await buildApp();

  try {
    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { username, password },
    });

    assert.equal(registerResponse.statusCode, 201);
    const sessionCookie = getSessionCookie(registerResponse.headers["set-cookie"]);
    const primaryAccount = await createAccountViaApi(app, sessionCookie);
    const secondaryAccount = await createAccountViaApi(app, sessionCookie, {
      name: "Rules Account",
      isDefault: false,
    });

    const createSetupResponse = await app.inject({
      method: "POST",
      url: "/setups",
      headers: { cookie: sessionCookie },
      payload: {
        name: "Checklist Scope Guard",
        description: "Setup used to verify safe delete behavior.",
      },
    });

    assert.equal(createSetupResponse.statusCode, 201);
    const setupId = createSetupResponse.json().setup.id as string;

    const createSetupRuleResponse = await app.inject({
      method: "POST",
      url: "/checklist-rules",
      headers: { cookie: sessionCookie },
      payload: {
        title: "Setup still referenced",
        isRequired: true,
        isActive: true,
        setupId,
      },
    });

    assert.equal(createSetupRuleResponse.statusCode, 201);

    const createAccountRuleResponse = await app.inject({
      method: "POST",
      url: "/checklist-rules",
      headers: { cookie: sessionCookie },
      payload: {
        title: "Account still referenced",
        isRequired: true,
        isActive: true,
        accountId: secondaryAccount.id,
      },
    });

    assert.equal(createAccountRuleResponse.statusCode, 201);

    const deleteSetupResponse = await app.inject({
      method: "DELETE",
      url: `/setups/${setupId}`,
      headers: { cookie: sessionCookie },
    });

    assert.equal(deleteSetupResponse.statusCode, 409);
    assert.equal(deleteSetupResponse.json().error.code, "SETUP_IN_USE_BY_CHECKLIST_RULES");

    const deleteAccountResponse = await app.inject({
      method: "DELETE",
      url: `/accounts/${secondaryAccount.id}`,
      headers: { cookie: sessionCookie },
    });

    assert.equal(deleteAccountResponse.statusCode, 409);
    assert.equal(deleteAccountResponse.json().error.code, "ACCOUNT_IN_USE_BY_CHECKLIST_RULES");

    const archivePrimaryAccountResponse = await app.inject({
      method: "PATCH",
      url: `/accounts/${primaryAccount.id}`,
      headers: { cookie: sessionCookie },
      payload: {
        isArchived: true,
      },
    });

    assert.equal(archivePrimaryAccountResponse.statusCode, 200);
  } finally {
    await app.close();
    await prisma.user.deleteMany({
      where: { username },
    });
    await prisma.$disconnect();
  }
});
