export const accountTypes = ["Personal", "Funded", "Challenge", "Demo", "Crypto"] as const;
export const tradeDirections = ["Buy", "Sell"] as const;
export const tradeResults = ["Win", "Loss", "Breakeven"] as const;
export const tradeSessions = ["Asia", "London", "New York"] as const;
export const tradeEmotions = ["Calm", "Focused", "Confident", "Anxious", "Frustrated"] as const;
export const reviewTypes = ["daily", "weekly", "trade"] as const;
export const reviewRuleStatuses = ["Yes", "Partially", "No"] as const;
export const reviewRiskStatuses = ["Yes", "Partially", "No"] as const;
export const reviewEmotions = ["Calm", "Confident", "Hesitant", "FOMO", "Revenge", "Frustrated"] as const;

export type AccountTypeValue = (typeof accountTypes)[number];
export type TradeDirectionValue = (typeof tradeDirections)[number];
export type TradeResultValue = (typeof tradeResults)[number];
export type TradeSessionValue = (typeof tradeSessions)[number];
export type TradeEmotionValue = (typeof tradeEmotions)[number];
export type ReviewTypeValue = (typeof reviewTypes)[number];
