export type Direction = 'Buy' | 'Sell';
export type Result = 'Win' | 'Loss';
export type TradeSession = 'Asia' | 'London' | 'New York';
export type TradeEmotion = 'Calm' | 'Focused' | 'Confident' | 'Anxious' | 'Frustrated';
export type AccountType = 'Personal' | 'Funded' | 'Challenge' | 'Demo' | 'Crypto';

export interface SetupDefinition {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
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
  screenshots: string[]; // base64 data URLs
  createdAt: string;
}

export const PAIRS = [
  'XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'GBPJPY',
  'AUDUSD', 'NZDUSD', 'USDCAD', 'USDCHF', 'EURJPY',
  'EURGBP', 'BTCUSD', 'ETHUSD', 'NAS100', 'US30',
  'SPX500',
];

export const SESSIONS: TradeSession[] = [
  'Asia',
  'London',
  'New York',
];

export const EMOTIONS: TradeEmotion[] = [
  'Calm',
  'Focused',
  'Confident',
  'Anxious',
  'Frustrated',
];

export const ACCOUNT_TYPES: AccountType[] = [
  'Personal',
  'Funded',
  'Challenge',
  'Demo',
  'Crypto',
];

export const ACCOUNT_BROKERS = [
  'FTMO',
  'IC Markets',
  'Binance',
  'Bybit',
  'Manual',
];
