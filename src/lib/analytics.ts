import { Trade } from './types';

export function computeStats(trades: Trade[]) {
  const total = trades.length;
  const wins = trades.filter(t => t.result === 'Win').length;
  const losses = total - wins;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);
  const totalGross = trades.filter(t => t.profit > 0).reduce((s, t) => s + t.profit, 0);
  const totalLoss = trades.filter(t => t.profit < 0).reduce((s, t) => s + t.profit, 0);

  // Average RR
  const rrs = trades.filter(t => t.stopLoss && t.entry).map(t => {
    const risk = Math.abs(t.entry - t.stopLoss);
    const reward = Math.abs(t.takeProfit - t.entry);
    return risk > 0 ? reward / risk : 0;
  });
  const avgRR = rrs.length > 0 ? rrs.reduce((a, b) => a + b, 0) / rrs.length : 0;

  // Setup breakdown
  const setupMap = new Map<string, { wins: number; total: number; profit: number }>();
  trades.forEach(t => {
    if (!t.setup) return;
    const existing = setupMap.get(t.setup) || { wins: 0, total: 0, profit: 0 };
    existing.total++;
    if (t.result === 'Win') existing.wins++;
    existing.profit += t.profit;
    setupMap.set(t.setup, existing);
  });
  const setupStats = Array.from(setupMap.entries()).map(([setup, s]) => ({
    setup,
    ...s,
    winRate: s.total > 0 ? (s.wins / s.total) * 100 : 0,
  }));

  return { total, wins, losses, winRate, totalProfit, totalGross, totalLoss, avgRR, setupStats };
}

export function getTodayTrades(trades: Trade[]): Trade[] {
  const today = new Date().toISOString().split('T')[0];
  return trades.filter(t => t.date === today);
}
