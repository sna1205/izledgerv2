export type Direction = 'Buy' | 'Sell';
export type Result = 'Win' | 'Loss';

export interface Trade {
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

export const SETUPS = [
  'FVG', 'Order Block', 'Breakout', 'Liquidity Sweep',
  'BOS', 'CHoCH', 'Supply & Demand', 'Trendline',
  'Support/Resistance', 'ICT', 'SMC',
];
