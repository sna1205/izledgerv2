import assert from "node:assert/strict";
import test from "node:test";

process.env.NODE_ENV = "test";
process.env.STORAGE_ENABLED = "false";
process.env.LOG_LEVEL = "silent";
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@127.0.0.1:5433/izledger_test";

const [
  {
    dedupeEconomicCalendarEvents,
    normalizeEconomicCalendarEvent,
  },
  {
    getDashboardImportantEvents,
    getEconomicCalendarEventDetail,
    listEconomicCalendarEvents,
    resetEconomicCalendarCache,
  },
  {
    getEconomicEventRelevance,
  },
] = await Promise.all([
  import("../src/modules/economic-calendar/provider.js"),
  import("../src/modules/economic-calendar/service.js"),
  import("../src/modules/economic-calendar/relevance.js"),
]);

function createRawEvent(overrides: Record<string, unknown> = {}) {
  return {
    title: "Core CPI y/y",
    country: "USD",
    date: "2026-03-25T08:30:00-04:00",
    impact: "High",
    forecast: "3.1%",
    previous: "3.0%",
    actual: "",
    revised: "",
    category: "",
    ...overrides,
  };
}

test("provider normalization keeps UTC internally and safely fills missing values", () => {
  const normalized = normalizeEconomicCalendarEvent(
    createRawEvent({
      country: "usd",
      forecast: undefined,
      previous: "",
      actual: "",
    }),
    new Date("2026-03-25T11:30:00.000Z"),
  );

  assert.ok(normalized);
  assert.equal(normalized.currency, "USD");
  assert.equal(normalized.country, "USD");
  assert.equal(normalized.eventTimeUtc, "2026-03-25T12:30:00.000Z");
  assert.equal(normalized.impactLevel, "high");
  assert.equal(normalized.previousValue, null);
  assert.equal(normalized.forecastValue, null);
  assert.equal(normalized.actualValue, null);
  assert.equal(normalized.status, "upcoming");
  assert.equal(normalized.category, "inflation");
});

test("provider normalization rejects malformed data cleanly", () => {
  const missingTitle = normalizeEconomicCalendarEvent(createRawEvent({ title: "" }));
  const invalidDate = normalizeEconomicCalendarEvent(createRawEvent({ date: "not-a-date" }));

  assert.equal(missingTitle, null);
  assert.equal(invalidDate, null);
});

test("duplicate provider events are collapsed predictably", () => {
  const earlier = normalizeEconomicCalendarEvent(createRawEvent({
    id: "provider-1",
    forecast: "",
  }), new Date("2026-03-25T10:00:00.000Z"));
  const richer = normalizeEconomicCalendarEvent(createRawEvent({
    id: "provider-1",
    forecast: "3.1%",
    actual: "3.3%",
  }), new Date("2026-03-25T10:05:00.000Z"));

  assert.ok(earlier);
  assert.ok(richer);

  const deduped = dedupeEconomicCalendarEvents([earlier, richer]);

  assert.equal(deduped.length, 1);
  assert.equal(deduped[0].actualValue, "3.3%");
});

test("relevance mapping handles gold and forex pairs centrally", () => {
  const gold = getEconomicEventRelevance({
    currency: "USD",
    title: "FOMC Statement",
    category: "central-bank",
  }, "XAUUSD");
  const cross = getEconomicEventRelevance({
    currency: "JPY",
    title: "National Core CPI y/y",
    category: "inflation",
  }, "GBPJPY");

  assert.equal(gold.relevant, true);
  assert.match(gold.reason ?? "", /XAUUSD|gold/i);
  assert.equal(cross.relevant, true);
  assert.match(cross.reason ?? "", /GBPJPY|JPY/i);
});

test("service filters by date range, currency, impact, and relevance", async () => {
  resetEconomicCalendarCache();

  const fetchStub: typeof fetch = async () => (
    new Response(JSON.stringify([
      createRawEvent({
        id: "usd-high",
        title: "FOMC Statement",
        date: "2026-03-25T14:00:00-04:00",
      }),
      createRawEvent({
        id: "eur-medium",
        title: "Flash Manufacturing PMI",
        country: "EUR",
        impact: "Medium",
        date: "2026-03-27T04:00:00-04:00",
      }),
      createRawEvent({
        id: "cad-low",
        title: "Building Permits",
        country: "CAD",
        impact: "Low",
        date: "2026-03-29T09:00:00-04:00",
      }),
    ]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  ) as typeof fetch;

  const response = await listEconomicCalendarEvents({
    dateFrom: "2026-03-25",
    dateTo: "2026-03-28",
    currencies: ["USD", "EUR"],
    impacts: ["high", "medium"],
    instrument: "XAUUSD",
    relevantOnly: true,
  }, fetchStub);

  assert.equal(response.items.length, 1);
  assert.equal(response.items[0].currency, "USD");
  assert.equal(response.items[0].relevance?.relevant, true);
  assert.equal(response.range.startDate, "2026-03-25");
  assert.equal(response.range.endDate, "2026-03-28");
});

test("service exposes stale cached data when provider fails after a successful fetch", async () => {
  resetEconomicCalendarCache();
  const originalDateNow = Date.now;

  const successFetch: typeof fetch = async () => (
    new Response(JSON.stringify([createRawEvent({ id: "seed-1" })]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  ) as typeof fetch;

  const failureFetch: typeof fetch = async () => {
    throw new Error("provider down");
  };

  try {
    await listEconomicCalendarEvents({}, successFetch);
    Date.now = () => originalDateNow() + 10 * 60_000;
    const staleResponse = await listEconomicCalendarEvents({}, failureFetch);

    assert.equal(staleResponse.providerStatus, "stale");
    assert.equal(staleResponse.cacheStatus, "stale");
    assert.equal(staleResponse.items.length, 1);
  } finally {
    Date.now = originalDateNow;
  }
});

test("dashboard important events summary returns top events and next important event", async () => {
  resetEconomicCalendarCache();

  const fetchStub: typeof fetch = async () => (
    new Response(JSON.stringify([
      createRawEvent({
        id: "near-high",
        title: "CPI y/y",
        date: new Date(Date.now() + 20 * 60_000).toISOString(),
      }),
      createRawEvent({
        id: "later-medium",
        title: "Consumer Confidence",
        country: "EUR",
        impact: "Medium",
        date: new Date(Date.now() + 2 * 60 * 60_000).toISOString(),
      }),
    ]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  ) as typeof fetch;

  const summary = await getDashboardImportantEvents({
    instrument: "XAUUSD",
    relevantOnly: false,
  }, fetchStub);

  assert.equal(summary.items.length, 2);
  assert.equal(summary.nextImportantEvent?.title, "CPI y/y");
});

test("event detail returns the requested event with navigation and same-time context", async () => {
  resetEconomicCalendarCache();
  const audMonthly = normalizeEconomicCalendarEvent(createRawEvent({
    id: "aud-cpi-monthly",
    title: "CPI m/m",
    country: "AUD",
    date: "2026-03-25T07:30:00.000Z",
  }));
  const audYearly = normalizeEconomicCalendarEvent(createRawEvent({
    id: "aud-cpi-yearly",
    title: "CPI y/y",
    country: "AUD",
    date: "2026-03-25T07:30:00.000Z",
  }));
  const usdPce = normalizeEconomicCalendarEvent(createRawEvent({
    id: "usd-pce",
    title: "Core PCE Price Index",
    date: "2026-03-25T12:30:00.000Z",
  }));

  assert.ok(audMonthly);
  assert.ok(audYearly);
  assert.ok(usdPce);

  const fetchStub: typeof fetch = async () => (
    new Response(JSON.stringify([
      createRawEvent({
        id: "aud-cpi-monthly",
        title: "CPI m/m",
        country: "AUD",
        date: "2026-03-25T07:30:00.000Z",
      }),
      createRawEvent({
        id: "aud-cpi-yearly",
        title: "CPI y/y",
        country: "AUD",
        date: "2026-03-25T07:30:00.000Z",
      }),
      createRawEvent({
        id: "usd-pce",
        title: "Core PCE Price Index",
        date: "2026-03-25T12:30:00.000Z",
      }),
    ]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  ) as typeof fetch;

  const detail = await getEconomicCalendarEventDetail(audYearly.id, { instrument: "AUDUSD" }, fetchStub);

  assert.equal(detail.event.id, audYearly.id);
  assert.equal(detail.sameTimeEvents.length, 1);
  assert.equal(detail.sameTimeEvents[0].id, audMonthly.id);
  assert.equal(detail.navigation.previousEventId, audMonthly.id);
  assert.equal(detail.navigation.nextEventId, usdPce.id);
});

test("live requests refresh high-impact pending releases before the normal cache ttl", async () => {
  resetEconomicCalendarCache();
  const originalDateNow = Date.now;
  const baseNow = new Date("2026-03-25T12:00:00.000Z").getTime();
  let fetchCount = 0;

  const firstFetch: typeof fetch = async () => {
    fetchCount += 1;

    return new Response(JSON.stringify([
      createRawEvent({
        id: "usd-cpi-live",
        title: "CPI y/y",
        date: "2026-03-25T12:01:00.000Z",
        actual: "",
      }),
    ]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }) as Response;
  };

  const secondFetch: typeof fetch = async () => {
    fetchCount += 1;

    return new Response(JSON.stringify([
      createRawEvent({
        id: "usd-cpi-live",
        title: "CPI y/y",
        date: "2026-03-25T12:01:00.000Z",
        actual: "3.3%",
      }),
    ]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }) as Response;
  };

  try {
    Date.now = () => baseNow;
    const initial = await listEconomicCalendarEvents({
      dateFrom: "2026-03-25",
      dateTo: "2026-03-25",
      impacts: ["high"],
      live: true,
    }, firstFetch);

    assert.equal(initial.items[0]?.status, "pending_release");
    assert.equal(fetchCount, 1);

    Date.now = () => baseNow + 30_000;
    const refreshed = await listEconomicCalendarEvents({
      dateFrom: "2026-03-25",
      dateTo: "2026-03-25",
      impacts: ["high"],
      live: true,
    }, secondFetch);

    assert.equal(fetchCount, 2);
    assert.equal(refreshed.items[0]?.actualValue, "3.3%");
    assert.equal(refreshed.items[0]?.status, "released");
  } finally {
    Date.now = originalDateNow;
  }
});

test("concurrent live refresh requests share a single provider fetch", async () => {
  resetEconomicCalendarCache();
  const originalDateNow = Date.now;
  const baseNow = new Date("2026-03-25T12:00:00.000Z").getTime();
  let refreshFetchCount = 0;

  const seedFetch: typeof fetch = async () => (
    new Response(JSON.stringify([
      createRawEvent({
        id: "usd-nfp-live",
        title: "Non-Farm Payrolls",
        date: "2026-03-25T12:01:00.000Z",
      }),
    ]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  ) as typeof fetch;

  try {
    Date.now = () => baseNow;
    const seed = await listEconomicCalendarEvents({
      dateFrom: "2026-03-25",
      dateTo: "2026-03-25",
      impacts: ["high"],
      live: true,
    }, seedFetch);
    const eventId = seed.items[0]?.id;

    assert.ok(eventId);

    Date.now = () => baseNow + 20_000;

    const refreshFetch: typeof fetch = async () => {
      refreshFetchCount += 1;

      await new Promise((resolve) => setTimeout(resolve, 15));

      return new Response(JSON.stringify([
        createRawEvent({
          id: "usd-nfp-live",
          title: "Non-Farm Payrolls",
          date: "2026-03-25T12:01:00.000Z",
          actual: "215K",
        }),
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }) as Response;
    };

    const [listResponse, detailResponse] = await Promise.all([
      listEconomicCalendarEvents({
        dateFrom: "2026-03-25",
        dateTo: "2026-03-25",
        impacts: ["high"],
        live: true,
      }, refreshFetch),
      getEconomicCalendarEventDetail(eventId!, { live: true }, refreshFetch),
    ]);

    assert.equal(refreshFetchCount, 1);
    assert.equal(listResponse.items[0]?.actualValue, "215K");
    assert.equal(detailResponse.event.actualValue, "215K");
  } finally {
    Date.now = originalDateNow;
  }
});

test("status moves to revised when provider later publishes a revision", () => {
  const revised = normalizeEconomicCalendarEvent(createRawEvent({
    id: "provider-revised",
    actual: "3.1%",
    revised: "3.0%",
  }), new Date("2026-03-25T12:35:00.000Z"));

  assert.ok(revised);
  assert.equal(revised.status, "revised");
  assert.equal(revised.revisedValue, "3.0%");
});
