import { useMemo } from "react";
import { getTrades } from "@/lib/trades";
import { computeStats } from "@/lib/analytics";
import { StatCard } from "@/components/StatCard";
import { ProfitDisplay } from "@/components/ProfitDisplay";
import { motion } from "framer-motion";

export default function Analytics() {
  const trades = useMemo(() => getTrades(), []);
  const stats = useMemo(() => computeStats(trades), [trades]);

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-lg font-semibold text-foreground mb-6">Analytics</h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Trades" value={String(stats.total)} />
        <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} />
        <StatCard label="Avg RR" value={`1:${stats.avgRR.toFixed(2)}`} />
        <StatCard
          label="Net PnL"
          value={`${stats.totalProfit >= 0 ? '+' : '-'}$${Math.abs(stats.totalProfit).toFixed(2)}`}
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Wins" value={String(stats.wins)} />
        <StatCard label="Losses" value={String(stats.losses)} />
        <StatCard
          label="Total Gross"
          value={`+$${stats.totalGross.toFixed(2)}`}
        />
      </div>

      {stats.setupStats.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-foreground mb-3">Setup Performance</h2>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-xs font-medium uppercase tracking-wider text-muted-foreground py-2 px-4">Setup</th>
                  <th className="text-xs font-medium uppercase tracking-wider text-muted-foreground py-2 px-4">Trades</th>
                  <th className="text-xs font-medium uppercase tracking-wider text-muted-foreground py-2 px-4">Win Rate</th>
                  <th className="text-xs font-medium uppercase tracking-wider text-muted-foreground py-2 px-4 text-right">Profit</th>
                </tr>
              </thead>
              <tbody>
                {stats.setupStats
                  .sort((a, b) => b.total - a.total)
                  .map((s, i) => (
                    <motion.tr
                      key={s.setup}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1], delay: i * 0.05 }}
                      className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-2 px-4 text-sm font-medium">{s.setup}</td>
                      <td className="py-2 px-4 text-sm tabular">{s.total}</td>
                      <td className="py-2 px-4 text-sm tabular">{s.winRate.toFixed(1)}%</td>
                      <td className="py-2 px-4 text-right"><ProfitDisplay value={s.profit} /></td>
                    </motion.tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {stats.total === 0 && (
        <div className="border rounded-lg p-12 text-center">
          <p className="text-sm text-muted-foreground">Log some trades to see your analytics.</p>
        </div>
      )}
    </div>
  );
}
