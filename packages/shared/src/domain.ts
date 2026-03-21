export type Direction = "Buy" | "Sell";
export type Result = "Win" | "Loss" | "Breakeven";
export type TradeSession = "Asia" | "London" | "New York";
export type TradeEmotion = "Calm" | "Focused" | "Confident" | "Anxious" | "Frustrated";
export type AccountType = "Personal" | "Funded" | "Challenge" | "Demo" | "Crypto";
export type ReviewType = "daily" | "weekly" | "trade";
export type ReviewRuleStatus = "Yes" | "Partially" | "No";
export type ReviewRiskStatus = "Yes" | "Partially" | "No";
export type ReviewEmotion = "Calm" | "Confident" | "Hesitant" | "FOMO" | "Revenge" | "Frustrated";

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface SetupDefinition {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
}

export interface ReviewTradeSnapshot {
  id: string;
  date: string;
  pair: string;
  direction: Direction;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  profit: number;
  result: Result;
  setup: string;
  setupColor?: string | null;
  session: TradeSession | null;
  emotion: TradeEmotion | null;
  notes: string;
  screenshots: string[];
}

export interface Review {
  id: string;
  type: ReviewType;
  reviewScope: ReviewType;
  tradeId: string | null;
  tradeSnapshot: ReviewTradeSnapshot | null;
  reviewDate: string | null;
  weekStart: string | null;
  weekEnd: string | null;
  wentWell: string | null;
  mistakes: string | null;
  followedRules: ReviewRuleStatus | null;
  emotion: ReviewEmotion | null;
  lessonLearned: string | null;
  improvementPlan: string | null;
  disciplineScore: number | null;
  weeklySummary: string | null;
  biggestWin: string | null;
  biggestMistake: string | null;
  riskManagement: ReviewRiskStatus | null;
  nextGoal: string | null;
  weeklyRating: number | null;
  executionRating: number | null;
  emotionRating: number | null;
  whatWentWell: string | null;
  whatWentWrong: string | null;
  mistakesMade: string | null;
  improvementForNextTrade: string | null;
  wouldTakeAgain: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  name: string;
  broker: string;
  type: AccountType;
  balance: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
}

export interface TradeScreenshotAsset {
  id: string;
  storageKey: string;
  sortOrder: number;
  createdAt: string;
  url: string;
}

export interface Trade {
  id: string;
  date: string;
  pair: string;
  accountId: string;
  direction: Direction;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  profit: number;
  result: Result;
  setupId: string | null;
  setup: string;
  setupColor?: string | null;
  session: TradeSession | null;
  emotion: TradeEmotion | null;
  notes: string;
  screenshots: string[];
  createdAt: string;
  updatedAt: string;
  screenshotAssets?: TradeScreenshotAsset[];
  account?: {
    id: string;
    name: string;
    broker: string;
    type: AccountType;
    currency: string;
    isDefault: boolean;
  };
}

export interface AuthUser {
  id: string;
  username: string;
}

export interface AuthenticatedUser extends AuthUser {
  createdAt: string;
  updatedAt: string;
}

export interface DashboardRecentTrade {
  id: string;
  date: string;
  pair: string;
  direction: Direction;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  profit: number;
  result: Result;
  session: TradeSession | null;
  emotion: TradeEmotion | null;
  setup: string;
  setupColor?: string | null;
  accountId: string;
  accountName: string;
  createdAt: string;
}

export interface DashboardEquityPoint {
  tradeNumber: number;
  date: string;
  pair: string;
  profit: number;
  equity: number;
}

export interface DashboardSummaryResponse {
  summary: {
    todayTrades: number;
    totalTrades: number;
    winRate: number;
    totalProfit: number;
  };
  recentTrades: DashboardRecentTrade[];
  equityCurve: DashboardEquityPoint[];
}

export interface AnalyticsBreakdownRow {
  key: string;
  label: string;
  trades: number;
  wins: number;
  winRate: number;
  profit: number;
  averageProfit: number;
}

export interface AnalyticsBreakdownsResponse {
  summary: {
    totalTrades: number;
    wins: number;
    losses: number;
    totalProfit: number;
    totalGross: number;
    totalLoss: number;
    winRate: number;
    avgRR: number;
  };
  winLoss: Array<{
    key: string;
    name: string;
    value: number;
    percentage: number;
  }>;
  setupPerformance: AnalyticsBreakdownRow[];
  sessionPerformance: AnalyticsBreakdownRow[];
  emotionPerformance: AnalyticsBreakdownRow[];
  pairPerformance: AnalyticsBreakdownRow[];
  accountPerformance: Array<AnalyticsBreakdownRow & { accountId: string }>;
}

export interface AnalyticsCalendarDay {
  date: string;
  inCurrentMonth: boolean;
  totalProfit: number;
  tradeCount: number;
  wins: number;
  winRate: number;
  grossProfit: number;
  grossLoss: number;
}

export interface AnalyticsCalendarWeek {
  weekNumber: number;
  days: AnalyticsCalendarDay[];
  summary: {
    tradeCount: number;
    totalProfit: number;
    winRate: number;
  };
}

export interface AnalyticsCalendarResponse {
  month: string;
  summary: {
    totalTrades: number;
    totalProfit: number;
    winRate: number;
  };
  days: AnalyticsCalendarDay[];
  weeks: AnalyticsCalendarWeek[];
}

export const SESSIONS: TradeSession[] = ["Asia", "London", "New York"];
export const EMOTIONS: TradeEmotion[] = ["Calm", "Focused", "Confident", "Anxious", "Frustrated"];
export const ACCOUNT_TYPES: AccountType[] = ["Personal", "Funded", "Challenge", "Demo", "Crypto"];
export const ACCOUNT_BROKERS = ["FTMO", "IC Markets", "Binance", "Bybit", "Manual"] as const;
export const REVIEW_RULE_STATUSES: ReviewRuleStatus[] = ["Yes", "Partially", "No"];
export const REVIEW_RISK_STATUSES: ReviewRiskStatus[] = ["Yes", "Partially", "No"];
export const REVIEW_EMOTIONS: ReviewEmotion[] = ["Calm", "Confident", "Hesitant", "FOMO", "Revenge", "Frustrated"];
