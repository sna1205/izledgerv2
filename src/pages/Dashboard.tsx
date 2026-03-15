import { useMemo } from "react";
import { Link } from "react-router-dom";
import { getTrades } from "@/lib/trades";
import { computeStats, getTodayTrades } from "@/lib/analytics";
import { StatCard } from "@/components/StatCard";
import { ResultBadge } from "@/components/ResultBadge";
import { ProfitDisplay } from "@/components/ProfitDisplay";
import { SetupTag } from "@/components/SetupTag";
import { motion } from "framer-motion";

const rowVariants = {
  hidden: { opacity: 0, y: 5 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number], delay: i * 0.05 },
  }),
};

export default function Dashboard() {
  const trades = useMemo(() => getTrades(), []);
  const todayTrades = useMemo(() => getTodayTrades(trades), [trades]);
  const stats = useMemo(() => computeStats(trades), [trades]);
  const recentTrades = trades.slice(0, 8);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-foreground">Session Summary</h1>
        <p className="text-xs text-muted-foreground">{today}</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Today's Trades" value={String(todayTrades.length)} />
        <StatCard label="Total Trades" value={String(stats.total)} />
        <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} />
        <StatCard
          label="Total PnL"
          value={`${stats.totalProfit >= 0 ? '+' : '-'}$${Math.abs(stats.totalProfit).toFixed(2)}`}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-foreground">Recent Trades</h2>
          <Link to="/trades" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            View all →
          </Link>
        </div>

        {recentTrades.length === 0 ? (
          <div className="border rounded-lg p-12 text-center">
            <p className="text-sm text-muted-foreground">No trades logged yet.</p>
            <Link to="/trades" className="text-sm text-foreground underline mt-2 inline-block">
              Log your first trade →
            </Link>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-xs font-medium uppercase tracking-wider text-muted-foreground py-2 px-4">Date</th>
                  <th className="text-xs font-medium uppercase tracking-wider text-muted-foreground py-2 px-4">Pair</th>
                  <th className="text-xs font-medium uppercase tracking-wider text-muted-foreground py-2 px-4">Direction</th>
                  <th className="text-xs font-medium uppercase tracking-wider text-muted-foreground py-2 px-4">Setup</th>
                  <th className="text-xs font-medium uppercase tracking-wider text-muted-foreground py-2 px-4">Result</th>
                  <th className="text-xs font-medium uppercase tracking-wider text-muted-foreground py-2 px-4 text-right">Profit</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.map((trade, i) => (
                  <motion.tr
                    key={trade.id}
                    custom={i}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    className="border-b last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="py-2 px-4 text-sm tabular">{trade.date}</td>
                    <td className="py-2 px-4 text-sm font-medium">{trade.pair}</td>
                    <td className="py-2 px-4 text-sm text-muted-foreground">{trade.direction}</td>
                    <td className="py-2 px-4">{trade.setup && <SetupTag label={trade.setup} />}</td>
                    <td className="py-2 px-4"><ResultBadge result={trade.result} /></td>
                    <td className="py-2 px-4 text-right"><ProfitDisplay value={trade.profit} /></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
