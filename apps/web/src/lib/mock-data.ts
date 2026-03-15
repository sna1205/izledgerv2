import { setStoredAccountFilter } from "@/lib/account-filter";
import { saveAccounts } from "@/lib/accounts";
import { saveReviews } from "@/lib/reviews";
import { saveSetups } from "@/lib/setups";
import { saveTrades } from "@/lib/trades";
import type { Account, Review, SetupDefinition, Trade } from "@/lib/types";

function createScreenshot(pair: string, date: string, accent: string, subtitle: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="55%" stop-color="#111827" />
          <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>
        <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.15" />
          <stop offset="100%" stop-color="${accent}" stop-opacity="0.02" />
        </linearGradient>
      </defs>
      <rect width="1600" height="1000" fill="url(#bg)" />
      <rect x="54" y="54" width="1492" height="892" rx="28" fill="rgba(15,23,42,0.55)" stroke="rgba(148,163,184,0.18)" />
      <rect x="54" y="54" width="1492" height="120" rx="28" fill="url(#accent)" />
      <text x="110" y="125" fill="#f8fafc" font-size="42" font-family="Arial, sans-serif" font-weight="700">${pair}</text>
      <text x="110" y="160" fill="#94a3b8" font-size="22" font-family="Arial, sans-serif">${date} • ${subtitle}</text>
      <g stroke="rgba(148,163,184,0.12)" stroke-width="1">
        <line x1="110" y1="250" x2="1490" y2="250" />
        <line x1="110" y1="360" x2="1490" y2="360" />
        <line x1="110" y1="470" x2="1490" y2="470" />
        <line x1="110" y1="580" x2="1490" y2="580" />
        <line x1="110" y1="690" x2="1490" y2="690" />
        <line x1="110" y1="800" x2="1490" y2="800" />
      </g>
      <path d="M120 735 C240 720, 300 540, 410 548 S585 658, 690 520 S835 340, 960 378 S1130 605, 1245 500 S1390 280, 1490 320" fill="none" stroke="${accent}" stroke-width="8" stroke-linecap="round" />
      <g fill="${accent}">
        <circle cx="410" cy="548" r="9" />
        <circle cx="690" cy="520" r="9" />
        <circle cx="960" cy="378" r="9" />
        <circle cx="1245" cy="500" r="9" />
      </g>
      <rect x="1130" y="128" width="300" height="64" rx="20" fill="rgba(15,23,42,0.65)" stroke="rgba(148,163,184,0.18)" />
      <text x="1160" y="168" fill="#e2e8f0" font-size="24" font-family="Arial, sans-serif">Execution Snapshot</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function seedMockData() {
  const now = "2026-03-15T10:30:00.000Z";

  const accounts: Account[] = [
    {
      id: "mock-account-ftmo",
      name: "FTMO 100K",
      broker: "FTMO",
      type: "Funded",
      balance: 100000,
      currency: "USD",
      createdAt: "2026-01-02T08:00:00.000Z",
    },
    {
      id: "mock-account-personal",
      name: "Personal Swing",
      broker: "IC Markets",
      type: "Personal",
      balance: 12500,
      currency: "USD",
      createdAt: "2026-01-05T08:00:00.000Z",
    },
    {
      id: "mock-account-binance",
      name: "Binance Futures",
      broker: "Binance",
      type: "Crypto",
      balance: 18000,
      currency: "USD",
      createdAt: "2026-01-09T08:00:00.000Z",
    },
  ];

  const setups: SetupDefinition[] = [
    {
      id: "mock-setup-sr",
      name: "Support/Resistance",
      description: "Reaction off a major level with confirmation and clear invalidation.",
      color: "#2563eb",
      createdAt: now,
    },
    {
      id: "mock-setup-breakout",
      name: "Breakout",
      description: "Momentum expansion after compression with strong participation.",
      color: "#10b981",
      createdAt: now,
    },
    {
      id: "mock-setup-pullback",
      name: "Pullback",
      description: "Trend continuation after a measured retracement into structure.",
      color: "#8b5cf6",
      createdAt: now,
    },
    {
      id: "mock-setup-liquidity",
      name: "Liquidity Sweep",
      description: "Sweep of external liquidity followed by fast displacement.",
      color: "#f59e0b",
      createdAt: now,
    },
    {
      id: "mock-setup-opening",
      name: "Opening Range",
      description: "Break and retest of the session opening range.",
      color: "#ef4444",
      createdAt: now,
    },
  ];

  const trades: Trade[] = [
    {
      id: "mock-trade-1",
      date: "2026-03-15",
      pair: "XAUUSD",
      accountId: "mock-account-ftmo",
      direction: "Buy",
      entry: 2198.4,
      stopLoss: 2191.8,
      takeProfit: 2216.2,
      profit: 689,
      result: "Win",
      setup: "Liquidity Sweep",
      session: "London",
      emotion: "Confident",
      notes: "Patience paid off after the liquidity grab under Asia low. Execution was clean and sizing stayed within plan.",
      screenshots: [
        createScreenshot("XAUUSD", "Mar 15, 2026", "#10b981", "London session sweep"),
        createScreenshot("XAUUSD", "Mar 15, 2026", "#3b82f6", "Post-trade markup"),
      ],
      createdAt: "2026-03-15T08:20:00.000Z",
    },
    {
      id: "mock-trade-2",
      date: "2026-03-15",
      pair: "EURUSD",
      accountId: "mock-account-personal",
      direction: "Buy",
      entry: 1.0942,
      stopLoss: 1.0928,
      takeProfit: 1.0989,
      profit: 245,
      result: "Win",
      setup: "Pullback",
      session: "London",
      emotion: "Calm",
      notes: "Took the second touch of the EMA pullback instead of chasing the first candle.",
      screenshots: [createScreenshot("EURUSD", "Mar 15, 2026", "#60a5fa", "London continuation")],
      createdAt: "2026-03-15T09:10:00.000Z",
    },
    {
      id: "mock-trade-3",
      date: "2026-03-15",
      pair: "BTCUSD",
      accountId: "mock-account-binance",
      direction: "Sell",
      entry: 66240,
      stopLoss: 66720,
      takeProfit: 64880,
      profit: -184,
      result: "Loss",
      setup: "Breakout",
      session: "New York",
      emotion: "Anxious",
      notes: "Shorted a breakdown that failed almost immediately. Felt late but still clicked in.",
      screenshots: [createScreenshot("BTCUSD", "Mar 15, 2026", "#f97316", "NY breakdown attempt")],
      createdAt: "2026-03-15T14:40:00.000Z",
    },
    {
      id: "mock-trade-4",
      date: "2026-03-14",
      pair: "NAS100",
      accountId: "mock-account-ftmo",
      direction: "Buy",
      entry: 21488,
      stopLoss: 21420,
      takeProfit: 21640,
      profit: 540,
      result: "Win",
      setup: "Opening Range",
      session: "New York",
      emotion: "Focused",
      notes: "Waited for the range retest instead of buying the initial break.",
      screenshots: [createScreenshot("NAS100", "Mar 14, 2026", "#22c55e", "Opening range expansion")],
      createdAt: "2026-03-14T14:10:00.000Z",
    },
    {
      id: "mock-trade-5",
      date: "2026-03-13",
      pair: "XAUUSD",
      accountId: "mock-account-ftmo",
      direction: "Sell",
      entry: 2210.2,
      stopLoss: 2216.1,
      takeProfit: 2195.7,
      profit: -104,
      result: "Loss",
      setup: "Support/Resistance",
      session: "New York",
      emotion: "Focused",
      notes: "Short idea was fine, but I ignored momentum shift after the first bounce.",
      screenshots: [createScreenshot("XAUUSD", "Mar 13, 2026", "#ef4444", "Resistance rejection attempt")],
      createdAt: "2026-03-13T15:05:00.000Z",
    },
    {
      id: "mock-trade-6",
      date: "2026-03-12",
      pair: "GBPUSD",
      accountId: "mock-account-personal",
      direction: "Buy",
      entry: 1.2811,
      stopLoss: 1.2785,
      takeProfit: 1.2874,
      profit: 318,
      result: "Win",
      setup: "Support/Resistance",
      session: "London",
      emotion: "Calm",
      notes: "Good reaction from daily level. Stuck to the plan and avoided over-management.",
      screenshots: [createScreenshot("GBPUSD", "Mar 12, 2026", "#38bdf8", "Daily level reaction")],
      createdAt: "2026-03-12T08:55:00.000Z",
    },
    {
      id: "mock-trade-7",
      date: "2026-03-11",
      pair: "US30",
      accountId: "mock-account-ftmo",
      direction: "Sell",
      entry: 39210,
      stopLoss: 39305,
      takeProfit: 38980,
      profit: 412,
      result: "Win",
      setup: "Breakout",
      session: "New York",
      emotion: "Focused",
      notes: "Best trade of the day. Clean momentum break and quick follow-through.",
      screenshots: [createScreenshot("US30", "Mar 11, 2026", "#14b8a6", "Momentum breakdown")],
      createdAt: "2026-03-11T14:18:00.000Z",
    },
    {
      id: "mock-trade-8",
      date: "2026-03-10",
      pair: "ETHUSD",
      accountId: "mock-account-binance",
      direction: "Buy",
      entry: 3422,
      stopLoss: 3388,
      takeProfit: 3518,
      profit: 196,
      result: "Win",
      setup: "Pullback",
      session: "Asia",
      emotion: "Confident",
      notes: "Asia continuation worked nicely after reclaiming VWAP.",
      screenshots: [createScreenshot("ETHUSD", "Mar 10, 2026", "#a855f7", "Asia reclaim")],
      createdAt: "2026-03-10T02:35:00.000Z",
    },
    {
      id: "mock-trade-9",
      date: "2026-03-09",
      pair: "USDJPY",
      accountId: "mock-account-personal",
      direction: "Sell",
      entry: 149.82,
      stopLoss: 150.07,
      takeProfit: 149.05,
      profit: -76,
      result: "Loss",
      setup: "Breakout",
      session: "Asia",
      emotion: "Frustrated",
      notes: "Forced a short after missing the cleaner earlier move. Bad emotional state.",
      screenshots: [],
      createdAt: "2026-03-09T01:48:00.000Z",
    },
    {
      id: "mock-trade-10",
      date: "2026-03-08",
      pair: "XAUUSD",
      accountId: "mock-account-ftmo",
      direction: "Buy",
      entry: 2189.6,
      stopLoss: 2182.1,
      takeProfit: 2208.3,
      profit: 355,
      result: "Win",
      setup: "Support/Resistance",
      session: "London",
      emotion: "Calm",
      notes: "A textbook bounce from prior week low and an easy hold into session high.",
      screenshots: [createScreenshot("XAUUSD", "Mar 8, 2026", "#10b981", "Weekly low bounce")],
      createdAt: "2026-03-08T09:00:00.000Z",
    },
    {
      id: "mock-trade-11",
      date: "2026-03-07",
      pair: "EURUSD",
      accountId: "mock-account-personal",
      direction: "Sell",
      entry: 1.1025,
      stopLoss: 1.1043,
      takeProfit: 1.0978,
      profit: 222,
      result: "Win",
      setup: "Liquidity Sweep",
      session: "London",
      emotion: "Focused",
      notes: "Sweep above prior high gave a clean fade opportunity.",
      screenshots: [createScreenshot("EURUSD", "Mar 7, 2026", "#0ea5e9", "High sweep fade")],
      createdAt: "2026-03-07T08:42:00.000Z",
    },
    {
      id: "mock-trade-12",
      date: "2026-03-06",
      pair: "BTCUSD",
      accountId: "mock-account-binance",
      direction: "Buy",
      entry: 64850,
      stopLoss: 64240,
      takeProfit: 66180,
      profit: 474,
      result: "Win",
      setup: "Opening Range",
      session: "New York",
      emotion: "Focused",
      notes: "Strong reclaim and aggressive follow-through after the session open.",
      screenshots: [createScreenshot("BTCUSD", "Mar 6, 2026", "#22c55e", "Opening reclaim")],
      createdAt: "2026-03-06T14:05:00.000Z",
    },
  ];

  const reviews: Review[] = [
    {
      id: "mock-review-trade-1",
      type: "trade",
      reviewScope: "trade",
      tradeId: "mock-trade-1",
      reviewDate: "2026-03-15",
      executionRating: 5,
      disciplineScore: 5,
      emotionRating: 4,
      whatWentWell: "Waited for the sweep confirmation and entered only after displacement.",
      whatWentWrong: "Could have scaled slightly better on the retest.",
      mistakesMade: "None that materially hurt the trade.",
      lessonLearned: "My best gold trades still come from patience around obvious liquidity.",
      improvementForNextTrade: "Mark the higher-timeframe liquidity pool earlier in the pre-session prep.",
      wouldTakeAgain: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "mock-review-trade-3",
      type: "trade",
      reviewScope: "trade",
      tradeId: "mock-trade-3",
      reviewDate: "2026-03-15",
      executionRating: 2,
      disciplineScore: 2,
      emotionRating: 2,
      whatWentWell: "Risk stayed capped.",
      whatWentWrong: "Entered late on a move that already felt extended.",
      mistakesMade: "Let anxiety drive the click instead of waiting for a cleaner retest.",
      lessonLearned: "If I feel late, I probably am late.",
      improvementForNextTrade: "Skip breakdowns that have already expanded more than one impulsive leg.",
      wouldTakeAgain: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "mock-review-trade-5",
      type: "trade",
      reviewScope: "trade",
      tradeId: "mock-trade-5",
      reviewDate: "2026-03-13",
      executionRating: 3,
      disciplineScore: 3,
      emotionRating: 4,
      whatWentWell: "The level was valid and the risk was defined.",
      whatWentWrong: "Stayed in after the orderflow clearly shifted.",
      mistakesMade: "Ignored the recovery candle and held out for the original target.",
      lessonLearned: "Good idea, poor adaptation.",
      improvementForNextTrade: "Use the first failed follow-through candle as information, not noise.",
      wouldTakeAgain: true,
      createdAt: "2026-03-13T16:30:00.000Z",
      updatedAt: "2026-03-13T16:30:00.000Z",
    },
    {
      id: "mock-review-daily-1",
      type: "daily",
      reviewScope: "daily",
      reviewDate: "2026-03-15",
      wentWell: "Respected account sizing and avoided revenge trading after the BTC loss.",
      mistakes: "Still took one crypto trade that felt emotionally rushed.",
      followedRules: "Partially",
      emotion: "Calm",
      lessonLearned: "My A+ session was London. New York crypto still needs more patience.",
      improvementPlan: "Cut New York crypto attempts to only one planned setup.",
      disciplineScore: 4,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "mock-review-daily-2",
      type: "daily",
      reviewScope: "daily",
      reviewDate: "2026-03-13",
      wentWell: "Journaled immediately after the loss and didn’t force a second setup.",
      mistakes: "Did not react fast enough to the invalidation signal.",
      followedRules: "Yes",
      emotion: "Frustrated",
      lessonLearned: "A planned stop is different from a mentally updated stop.",
      improvementPlan: "Respect the first sign of failure when trading reversals.",
      disciplineScore: 3,
      createdAt: "2026-03-13T17:00:00.000Z",
      updatedAt: "2026-03-13T17:00:00.000Z",
    },
    {
      id: "mock-review-weekly-1",
      type: "weekly",
      reviewScope: "weekly",
      weekStart: "2026-03-09",
      weekEnd: "2026-03-15",
      weeklySummary: "Strong week overall with the best executions clustered in London and opening-range equity trades.",
      biggestWin: "Gold liquidity sweep on March 15 and NAS100 opening range on March 14.",
      biggestMistake: "Shorting BTC late and taking the trade from a place of urgency.",
      riskManagement: "Yes",
      nextGoal: "Keep the same patience in London and reduce impulsive New York crypto trades.",
      weeklyRating: 8,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "mock-review-weekly-2",
      type: "weekly",
      reviewScope: "weekly",
      weekStart: "2026-03-02",
      weekEnd: "2026-03-08",
      weeklySummary: "The week improved once I simplified to fewer setups and stopped chasing.",
      biggestWin: "The XAUUSD bounce from weekly low.",
      biggestMistake: "The USDJPY short taken from frustration rather than clarity.",
      riskManagement: "Partially",
      nextGoal: "Only trade the first valid setup per session and review emotional state before clicking.",
      weeklyRating: 7,
      createdAt: "2026-03-08T18:00:00.000Z",
      updatedAt: "2026-03-08T18:00:00.000Z",
    },
  ];

  saveAccounts(accounts);
  saveSetups(setups);
  saveTrades(trades);
  saveReviews(reviews);
  setStoredAccountFilter("all");
}
