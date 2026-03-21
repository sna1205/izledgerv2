import { Activity, BookOpenText, Landmark, ShieldCheck, Users } from "lucide-react";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { PageErrorState } from "@/components/PageErrorState";
import { PageHeader, PageShell, SectionCard, SectionHeader } from "@/components/PageShell";
import { StatCard } from "@/components/StatCard";
import { useFounderHealth, useFounderRecent, useFounderStats } from "@/hooks/use-founder-dashboard";

function FounderRecentList({
  items,
  emptyLabel,
}: {
  items: Array<{ key: string; label: string }>;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.key} className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-sm text-foreground">
          {item.label}
        </div>
      ))}
    </div>
  );
}

function FounderHealthRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export default function FounderDashboard() {
  const statsQuery = useFounderStats();
  const recentQuery = useFounderRecent();
  const healthQuery = useFounderHealth();

  if (statsQuery.isLoading && recentQuery.isLoading && healthQuery.isLoading) {
    return <DashboardSkeleton />;
  }

  if (statsQuery.isError && !statsQuery.data) {
    return (
      <PageErrorState
        title="Founder dashboard unavailable"
        description="The internal founder dashboard could not be loaded right now."
        onRetry={() => {
          void Promise.all([
            statsQuery.refetch(),
            recentQuery.refetch(),
            healthQuery.refetch(),
          ]);
        }}
        isRetrying={statsQuery.isFetching || recentQuery.isFetching || healthQuery.isFetching}
      />
    );
  }

  const stats = statsQuery.data?.stats ?? {
    totalUsers: 0,
    totalTrades: 0,
    totalReviews: 0,
    totalAccounts: 0,
  };

  const recent = recentQuery.data ?? {
    users: [],
    trades: [],
    reviews: [],
  };

  const health = healthQuery.data ?? {
    apiStatus: "ok" as const,
    dbConnection: "ok" as const,
    sessionValid: true,
    usersWithZeroTrades: 0,
    checkedAt: new Date().toISOString(),
  };

  return (
    <PageShell size="wide">
      <PageHeader title="Founder Dashboard" description="Internal overview" />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Users" value={String(stats.totalUsers)} icon={Users} />
        <StatCard label="Total Trades" value={String(stats.totalTrades)} icon={Activity} />
        <StatCard label="Total Reviews" value={String(stats.totalReviews)} icon={BookOpenText} />
        <StatCard label="Total Accounts" value={String(stats.totalAccounts)} icon={Landmark} />
      </div>

      <SectionCard>
        <SectionHeader title="Recent Activity" />
        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <div className="space-y-3">
            <p className="text-label">Latest users</p>
            <FounderRecentList
              items={recent.users.map((user) => ({
                key: user.id,
                label: `${user.username} • ${new Date(user.createdAt).toLocaleDateString()}`,
              }))}
              emptyLabel="No users yet."
            />
          </div>
          <div className="space-y-3">
            <p className="text-label">Latest trades</p>
            <FounderRecentList
              items={recent.trades.map((trade) => ({
                key: trade.id,
                label: `${trade.username} • ${trade.pair} • ${trade.result}`,
              }))}
              emptyLabel="No trades yet."
            />
          </div>
          <div className="space-y-3">
            <p className="text-label">Latest reviews</p>
            <FounderRecentList
              items={recent.reviews.map((review) => ({
                key: review.id,
                label: `${review.username} • ${review.type}`,
              }))}
              emptyLabel="No reviews yet."
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeader title="Health Check" />
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <FounderHealthRow label="API status" value={health.apiStatus} />
          <FounderHealthRow label="DB connection" value={health.dbConnection} />
          <FounderHealthRow label="Session valid" value={health.sessionValid ? "yes" : "no"} />
          <FounderHealthRow label="Users with 0 trades" value={String(health.usersWithZeroTrades)} />
          <FounderHealthRow
            label="Last checked"
            value={new Date(health.checkedAt).toLocaleString()}
          />
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
            <span className="text-sm text-muted-foreground">Founder access</span>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              active
            </span>
          </div>
        </div>
      </SectionCard>
    </PageShell>
  );
}
