export type Direction = "Buy" | "Sell";
export type Result = "Win" | "Loss" | "Breakeven";
export type TradeSession = "Asia" | "London" | "New York";
export type TradeEmotion = "Calm" | "Focused" | "Confident" | "Anxious" | "Frustrated";
export type AccountType = "Personal" | "Funded" | "Challenge" | "Demo" | "Crypto";
export type ReviewType = "daily" | "weekly" | "trade";
export type ReviewRuleStatus = "Yes" | "Partially" | "No";
export type ReviewRiskStatus = "Yes" | "Partially" | "No";
export type ReviewEmotion = "Calm" | "Confident" | "Hesitant" | "FOMO" | "Revenge" | "Frustrated";
export type ChecklistEnforcementMode = "soft" | "strict";
export type ChecklistRuleScopeType = "global" | "account" | "setup" | "account_setup";
export type EconomicEventImpact = "holiday" | "low" | "medium" | "high";
export type EconomicEventStatus = "upcoming" | "pending_release" | "released" | "revised" | "passed" | "holiday";
export type EconomicEventCategory =
  | "inflation"
  | "labor"
  | "growth"
  | "central-bank"
  | "activity"
  | "housing"
  | "energy"
  | "sentiment"
  | "holiday"
  | "other";

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
  entryLogic?: string | null;
  confirmationLogic?: string | null;
  invalidationLogic?: string | null;
  notes?: string | null;
  preTradeChecklist?: ChecklistRule[];
  color: string;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
}

export interface ChecklistRule {
  id: string;
  title: string;
  description: string | null;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
  scopeType: ChecklistRuleScopeType;
  setupId: string | null;
  accountId: string | null;
  createdAt: string;
  updatedAt: string;
  setup?: {
    id: string;
    name: string;
  } | null;
  account?: {
    id: string;
    name: string;
  } | null;
}

export interface TradeChecklistResponse {
  id: string;
  tradeId: string;
  checklistRuleId: string | null;
  ruleTitleSnapshot: string;
  ruleDescriptionSnapshot: string | null;
  isRequiredSnapshot: boolean;
  checked: boolean;
  note: string | null;
  sortOrderSnapshot: number;
  createdAt: string;
  updatedAt: string;
}

export interface CurrencyProfitTotal {
  currency: string;
  totalProfit: number;
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
  isArchived: boolean;
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
  clientRequestId?: string | null;
  accountCurrency?: string | null;
  direction: Direction;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  quantity?: number | null;
  lotSize?: number | null;
  exitPrice?: number | null;
  fees?: number | null;
  riskAmount?: number | null;
  riskPercent?: number | null;
  grossPnl?: number | null;
  netPnl?: number | null;
  pnlCurrency?: string | null;
  fxRateSnapshot?: number | null;
  fxRateSource?: string | null;
  fxRateTimestamp?: string | null;
  plannedRR?: number | null;
  realizedR?: number | null;
  profit: number;
  result: Result;
  setupId: string | null;
  setup: string;
  setupColor?: string | null;
  session: TradeSession | null;
  emotion: TradeEmotion | null;
  notes: string;
  openedAt?: string | null;
  closedAt?: string | null;
  screenshots: string[];
  createdAt: string;
  updatedAt: string;
  screenshotAssets?: TradeScreenshotAsset[];
  checklistResponses?: TradeChecklistResponse[];
  account?: {
    id: string;
    name: string;
    broker: string;
    type: AccountType;
    currency: string;
    isDefault: boolean;
    isArchived: boolean;
  };
}

export interface AuthUser {
  id: string;
  username: string;
  checklistEnforcementMode: ChecklistEnforcementMode;
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
  accountCurrency?: string | null;
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
    totalProfit: number | null;
    displayCurrency: string | null;
    isMixedCurrency: boolean;
    currencyTotals: CurrencyProfitTotal[];
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
    breakevens: number;
    totalProfit: number | null;
    totalGross: number | null;
    totalLoss: number | null;
    winRate: number;
    avgRR: number;
    avgPlannedRR: number;
    avgRealizedR: number | null;
    displayCurrency: string | null;
    isMixedCurrency: boolean;
    currencyTotals: CurrencyProfitTotal[];
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
  accountPerformance: Array<AnalyticsBreakdownRow & { accountId: string; currency: string | null }>;
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
    totalProfit: number | null;
    winRate: number;
    displayCurrency: string | null;
    isMixedCurrency: boolean;
    currencyTotals: CurrencyProfitTotal[];
  };
  days: AnalyticsCalendarDay[];
  weeks: AnalyticsCalendarWeek[];
}

export interface EconomicCalendarEvent {
  id: string;
  providerEventId: string;
  title: string;
  country: string;
  currency: string;
  impactLevel: EconomicEventImpact;
  eventTimeUtc: string;
  previousValue: string | null;
  forecastValue: string | null;
  actualValue: string | null;
  revisedValue: string | null;
  status: EconomicEventStatus;
  category: EconomicEventCategory;
  sourceProvider: string;
  lastUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
  relevance?: {
    relevant: boolean;
    reason: string | null;
  } | null;
}

export interface EconomicCalendarListResponse {
  fetchedAtUtc: string;
  providerStatus: "live" | "stale";
  cacheStatus: "miss" | "hit" | "stale";
  range: {
    startDate: string;
    endDate: string;
  };
  filters: {
    range: "today" | "week" | "custom";
    currencies: string[];
    impacts: EconomicEventImpact[];
    instrument: string | null;
    relevantOnly: boolean;
  };
  items: EconomicCalendarEvent[];
}

export interface DashboardImportantEventsResponse {
  fetchedAtUtc: string;
  providerStatus: "live" | "stale";
  cacheStatus: "miss" | "hit" | "stale";
  nextImportantEvent: EconomicCalendarEvent | null;
  items: EconomicCalendarEvent[];
}

export interface EconomicCalendarEventDetailResponse {
  fetchedAtUtc: string;
  providerStatus: "live" | "stale";
  cacheStatus: "miss" | "hit" | "stale";
  event: EconomicCalendarEvent;
  navigation: {
    previousEventId: string | null;
    nextEventId: string | null;
  };
  sameTimeEvents: EconomicCalendarEvent[];
  sameSessionEvents: EconomicCalendarEvent[];
}

export const SESSIONS: TradeSession[] = ["Asia", "London", "New York"];
export const EMOTIONS: TradeEmotion[] = ["Calm", "Focused", "Confident", "Anxious", "Frustrated"];
export const ACCOUNT_TYPES: AccountType[] = ["Personal", "Funded", "Challenge", "Demo", "Crypto"];
export const ACCOUNT_BROKERS = ["FTMO", "IC Markets", "Binance", "Bybit", "Manual"] as const;
export const REVIEW_RULE_STATUSES: ReviewRuleStatus[] = ["Yes", "Partially", "No"];
export const REVIEW_RISK_STATUSES: ReviewRiskStatus[] = ["Yes", "Partially", "No"];
export const REVIEW_EMOTIONS: ReviewEmotion[] = ["Calm", "Confident", "Hesitant", "FOMO", "Revenge", "Frustrated"];
