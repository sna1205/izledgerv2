export type Direction = "Buy" | "Sell";
export type Result = "Win" | "Loss";
export type TradeSession = "Asia" | "London" | "New York";
export type TradeEmotion = "Calm" | "Focused" | "Confident" | "Anxious" | "Frustrated";
export type AccountType = "Personal" | "Funded" | "Challenge" | "Demo" | "Crypto";
export type ReviewType = "daily" | "weekly" | "trade";
export type ReviewRuleStatus = "Yes" | "Partially" | "No";
export type ReviewRiskStatus = "Yes" | "Partially" | "No";
export type ReviewEmotion = "Calm" | "Confident" | "Hesitant" | "FOMO" | "Revenge" | "Frustrated";

export interface SetupDefinition {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
}

export interface Review {
  id: string;
  type: ReviewType;
  reviewScope?: ReviewType;
  tradeId?: string;
  reviewDate?: string;
  weekStart?: string;
  weekEnd?: string;
  wentWell?: string;
  mistakes?: string;
  followedRules?: ReviewRuleStatus;
  emotion?: ReviewEmotion;
  lessonLearned?: string;
  improvementPlan?: string;
  disciplineScore?: number;
  weeklySummary?: string;
  biggestWin?: string;
  biggestMistake?: string;
  riskManagement?: ReviewRiskStatus;
  nextGoal?: string;
  weeklyRating?: number;
  executionRating?: number;
  emotionRating?: number;
  whatWentWell?: string;
  whatWentWrong?: string;
  mistakesMade?: string;
  improvementForNextTrade?: string;
  wouldTakeAgain?: boolean;
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
}

export interface Trade {
  id: string;
  date: string;
  pair: string;
  accountId?: string;
  direction: Direction;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  profit: number;
  result: Result;
  setup: string;
  session?: TradeSession;
  emotion?: TradeEmotion;
  notes: string;
  screenshots: string[];
  createdAt: string;
}

export const PAIRS = [
  "XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "GBPJPY",
  "AUDUSD", "NZDUSD", "USDCAD", "USDCHF", "EURJPY",
  "EURGBP", "BTCUSD", "ETHUSD", "NAS100", "US30",
  "SPX500",
] as const;

export const SESSIONS: TradeSession[] = ["Asia", "London", "New York"];
export const EMOTIONS: TradeEmotion[] = ["Calm", "Focused", "Confident", "Anxious", "Frustrated"];
export const ACCOUNT_TYPES: AccountType[] = ["Personal", "Funded", "Challenge", "Demo", "Crypto"];
export const ACCOUNT_BROKERS = ["FTMO", "IC Markets", "Binance", "Bybit", "Manual"] as const;
export const REVIEW_RULE_STATUSES: ReviewRuleStatus[] = ["Yes", "Partially", "No"];
export const REVIEW_RISK_STATUSES: ReviewRiskStatus[] = ["Yes", "Partially", "No"];
export const REVIEW_EMOTIONS: ReviewEmotion[] = ["Calm", "Confident", "Hesitant", "FOMO", "Revenge", "Frustrated"];
