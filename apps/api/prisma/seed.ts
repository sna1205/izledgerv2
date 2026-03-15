import bcrypt from "bcryptjs";
import { PrismaClient, AccountType, ReviewEmotion, ReviewRiskStatus, ReviewRuleStatus, ReviewType, TradeDirection, TradeEmotion, TradeResult, TradeSession } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.tradeScreenshot.deleteMany();
  await prisma.review.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.setup.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("DemoPass123!", 12);

  const user = await prisma.user.create({
    data: {
      username: "demo",
      passwordHash,
      accounts: {
        create: [
          {
            name: "Main Account",
            broker: "Manual",
            type: AccountType.Personal,
            balance: "5000.00",
            currency: "USD",
            isDefault: true,
          },
          {
            name: "FTMO Challenge",
            broker: "FTMO",
            type: AccountType.Challenge,
            balance: "100000.00",
            currency: "USD",
            isDefault: false,
          },
        ],
      },
      setups: {
        create: [
          {
            name: "Liquidity Sweep",
            description: "Sweep previous session liquidity, wait for displacement, then enter on the retest.",
            color: "#10b981",
          },
          {
            name: "Opening Range Breakout",
            description: "Trade the first confirmed break with volume and clean structure.",
            color: "#3b82f6",
          },
        ],
      },
    },
    include: {
      accounts: true,
      setups: true,
    },
  });

  const mainAccount = user.accounts[0];
  const challengeAccount = user.accounts[1];
  const sweepSetup = user.setups[0];
  const orbSetup = user.setups[1];

  const firstTrade = await prisma.trade.create({
    data: {
      userId: user.id,
      accountId: mainAccount.id,
      setupId: sweepSetup.id,
      setupNameSnapshot: sweepSetup.name,
      tradeDate: new Date("2026-03-06"),
      pair: "XAUUSD",
      direction: TradeDirection.Buy,
      entry: "2918.50",
      stopLoss: "2914.80",
      takeProfit: "2928.10",
      profit: "474.00",
      result: TradeResult.Win,
      session: TradeSession.London,
      emotion: TradeEmotion.Focused,
      notes: "Waited for confirmation after the sweep. Execution stayed inside plan.",
      screenshots: {
        create: [
          {
            storageKey: `users/${user.id}/trades/seed-trade-1/chart-before.png`,
            sortOrder: 0,
          },
          {
            storageKey: `users/${user.id}/trades/seed-trade-1/chart-after.png`,
            sortOrder: 1,
          },
        ],
      },
    },
  });

  const secondTrade = await prisma.trade.create({
    data: {
      userId: user.id,
      accountId: challengeAccount.id,
      setupId: orbSetup.id,
      setupNameSnapshot: orbSetup.name,
      tradeDate: new Date("2026-03-09"),
      pair: "NAS100",
      direction: TradeDirection.Sell,
      entry: "20342.25",
      stopLoss: "20388.75",
      takeProfit: "20240.00",
      profit: "-76.00",
      result: TradeResult.Loss,
      session: TradeSession.New_York,
      emotion: TradeEmotion.Anxious,
      notes: "Entered too early before the clean break confirmed.",
    },
  });

  await prisma.review.createMany({
    data: [
      {
        userId: user.id,
        type: ReviewType.daily,
        reviewDate: new Date("2026-03-06"),
        wentWell: "Patience and confirmation were both strong.",
        mistakes: "Left some size on the table by being too conservative.",
        followedRules: ReviewRuleStatus.Yes,
        emotion: ReviewEmotion.Calm,
        lessonLearned: "Staying selective improved execution quality.",
        improvementPlan: "Size up only after repeated discipline.",
        disciplineScore: 4,
      },
      {
        userId: user.id,
        type: ReviewType.weekly,
        weekStart: new Date("2026-03-02"),
        weekEnd: new Date("2026-03-08"),
        weeklySummary: "Strong week with the best results coming from fewer, cleaner setups.",
        biggestWin: "The XAUUSD liquidity sweep held beautifully.",
        biggestMistake: "A few entries were still early around the New York open.",
        riskManagement: ReviewRiskStatus.Yes,
        nextGoal: "Wait for confirmation instead of anticipating breaks.",
        weeklyRating: 8,
      },
    ],
  });

  await prisma.review.create({
    data: {
      userId: user.id,
      type: ReviewType.trade,
      tradeId: firstTrade.id,
      tradeSnapshot: {
        id: firstTrade.id,
        date: "2026-03-06",
        pair: "XAUUSD",
        direction: "Buy",
        result: "Win",
        profit: 474,
        setup: sweepSetup.name,
      },
      reviewDate: new Date("2026-03-06"),
      executionRating: 4,
      disciplineScore: 4,
      emotionRating: 4,
      whatWentWell: "Stayed patient and entered after displacement.",
      whatWentWrong: "Could have managed the exit more aggressively.",
      mistakesMade: "No major rule break, only minor hesitation on scale-in.",
      lessonLearned: "The best trades are the ones that feel obvious after waiting.",
      improvementForNextTrade: "Trust confirmation and size based on the plan.",
      wouldTakeAgain: true,
    },
  });

  console.log("Seed complete.");
  console.log("Demo login: demo / DemoPass123!");
  console.log(`Created trades: ${firstTrade.id}, ${secondTrade.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
