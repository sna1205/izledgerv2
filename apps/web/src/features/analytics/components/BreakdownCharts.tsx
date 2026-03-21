import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo, useState } from "react";
import type { TooltipProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import {
  formatCompactCurrencyDisplay,
  formatCurrencyDisplay,
  formatNumberDisplay,
  formatPercentageDisplay,
} from "@/utils/analytics-rendering";
import { EmptyChartState } from "@/features/analytics/components/EmptyChartState";

type BreakdownChartRow = {
  key: string;
  label: string;
  shortLabel: string;
  trades: number;
  winRate: number;
  profit: number;
};

type BreakdownColorVariant = "surface" | "solid" | "stroke" | "barStart" | "barEnd";
type BreakdownCategoryType = "pair" | "session" | "setup" | "emotion";

const GRID_STROKE = "hsl(var(--border) / 0.35)";
const AXIS_TEXT = "hsl(var(--muted-foreground))";
const REFERENCE_LINE = "hsl(var(--border) / 0.8)";
const CURSOR_FILL = "hsl(var(--accent) / 0.32)";
const NEUTRAL_FILL = "hsl(var(--muted-foreground) / 0.48)";
const DONUT_SHADOW = "hsl(var(--foreground) / 0.14)";
const RADAR_STROKE = "hsl(var(--primary))";
const PAIR_COLOR_PALETTE = [
  "#2F80ED",
  "#16A085",
  "#7C4DFF",
  "#F2994A",
  "#EB5757",
  "#00A3A3",
  "#5C7CFA",
  "#C26D1A",
  "#B83280",
  "#0F9D8A",
  "#4C6FFF",
  "#B7791F",
] as const;
const SESSION_COLOR_PALETTE = [
  "#2563EB",
  "#0F766E",
  "#7C3AED",
  "#EA580C",
  "#BE185D",
  "#0891B2",
  "#4F46E5",
  "#A16207",
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function hexToRgb(color: string) {
  const normalized = color.replace("#", "");

  if (normalized.length !== 6) {
    return null;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  if ([red, green, blue].some((channel) => Number.isNaN(channel))) {
    return null;
  }

  return { red, green, blue };
}

function rgba(color: string, alpha: number) {
  const rgb = hexToRgb(color);

  if (!rgb) {
    return color;
  }

  return `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, ${alpha})`;
}

function getReadableTextColor(color: string) {
  const rgb = hexToRgb(color);

  if (!rgb) {
    return "hsl(var(--foreground))";
  }

  const luminance = ((rgb.red * 299) + (rgb.green * 587) + (rgb.blue * 114)) / 1000;
  return luminance < 154 ? "#FFFFFF" : "hsl(var(--foreground))";
}

function getMutedReadableTextColor(color: string) {
  const text = getReadableTextColor(color);
  return text === "#FFFFFF" ? "rgba(255,255,255,0.78)" : "hsl(var(--muted-foreground))";
}

function getCategoryPalette(type: BreakdownCategoryType) {
  if (type === "pair") {
    return PAIR_COLOR_PALETTE;
  }

  if (type === "session") {
    return SESSION_COLOR_PALETTE;
  }

  return PAIR_COLOR_PALETTE;
}

export function getCategoryColor(name: string, type: BreakdownCategoryType) {
  const palette = getCategoryPalette(type);
  return palette[hashString(`${type}:${name.trim().toLowerCase()}`) % palette.length];
}

function getOutcomeFamily(value: number) {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

function getFamilyMaxima(rows: Array<{ profit: number }>) {
  return rows.reduce(
    (accumulator, row) => ({
      positive: row.profit > 0 ? Math.max(accumulator.positive, row.profit) : accumulator.positive,
      negative: row.profit < 0 ? Math.max(accumulator.negative, Math.abs(row.profit)) : accumulator.negative,
    }),
    { positive: 0, negative: 0 },
  );
}

function getColorIntensity(value: number, rows: Array<{ profit: number }>) {
  const family = getOutcomeFamily(value);
  const maxima = getFamilyMaxima(rows);

  if (family === "neutral") {
    return 0;
  }

  const max = family === "positive" ? maxima.positive : maxima.negative;

  if (max <= 0) {
    return 1;
  }

  return clamp(Math.abs(value) / max, 0.18, 1);
}

export function getBreakdownColor(
  value: number,
  rows: Array<{ profit: number }>,
  variant: BreakdownColorVariant = "solid",
) {
  const family = getOutcomeFamily(value);
  const intensity = getColorIntensity(value, rows);

  if (family === "neutral") {
    switch (variant) {
      case "surface":
        return "hsl(var(--muted-foreground) / 0.22)";
      case "stroke":
        return "hsl(var(--muted-foreground) / 0.38)";
      case "barStart":
        return "hsl(var(--muted-foreground) / 0.20)";
      case "barEnd":
        return "hsl(var(--muted-foreground) / 0.44)";
      default:
        return "hsl(var(--muted-foreground) / 0.58)";
    }
  }

  const base = family === "positive" ? "--success" : "--danger";

  switch (variant) {
    case "surface":
      return `hsl(var(${base}) / ${0.26 + (intensity * 0.52)})`;
    case "stroke":
      return `hsl(var(${base}) / ${0.34 + (intensity * 0.28)})`;
    case "barStart":
      return `hsl(var(${base}) / ${0.28 + (intensity * 0.24)})`;
    case "barEnd":
      return `hsl(var(${base}) / ${0.58 + (intensity * 0.28)})`;
    default:
      return `hsl(var(${base}) / ${0.48 + (intensity * 0.38)})`;
  }
}

export function getBreakdownCategoryAccent({
  kind,
  label,
  profit,
  rows,
}: {
  kind: BreakdownCategoryType;
  label: string;
  profit: number;
  rows: Array<{ profit: number }>;
}) {
  if (kind === "pair" || kind === "session") {
    return getCategoryColor(label, kind);
  }

  return getBreakdownColor(profit, rows, "solid");
}

function getTreemapTextColor(value: number, rows: Array<{ profit: number }>) {
  const family = getOutcomeFamily(value);

  if (family === "neutral") {
    return "hsl(var(--foreground))";
  }

  return getColorIntensity(value, rows) >= 0.6 ? "#ffffff" : "hsl(var(--foreground))";
}

function getTreemapMutedTextColor(value: number, rows: Array<{ profit: number }>) {
  const family = getOutcomeFamily(value);

  if (family === "neutral") {
    return "hsl(var(--muted-foreground))";
  }

  return getColorIntensity(value, rows) >= 0.6 ? "rgba(255,255,255,0.78)" : "hsl(var(--muted-foreground))";
}

function formatContribution(share: number) {
  return `${formatNumberDisplay(share, { maximumFractionDigits: 1 })}%`;
}

function truncateLabel(label: string, maxLength = 18) {
  return label.length > maxLength ? `${label.slice(0, maxLength - 1)}…` : label;
}

function buildTreemapRows(rows: BreakdownChartRow[]) {
  const maxMagnitude = Math.max(...rows.map((row) => Math.abs(row.profit)), 0);
  const totalMagnitude = rows.reduce((sum, row) => sum + Math.abs(row.profit), 0);

  return rows.map((row) => ({
    ...row,
    name: row.label,
    size: maxMagnitude === 0 ? 1 : Math.max(Math.abs(row.profit), maxMagnitude * 0.035),
    contribution: totalMagnitude > 0 ? (Math.abs(row.profit) / totalMagnitude) * 100 : 0,
    fill: getCategoryColor(row.label, "pair"),
    stroke: rgba(getCategoryColor(row.label, "pair"), 0.36),
    textColor: getReadableTextColor(getCategoryColor(row.label, "pair")),
    mutedTextColor: getMutedReadableTextColor(getCategoryColor(row.label, "pair")),
  }));
}

function buildContributionRows(rows: BreakdownChartRow[]) {
  const totalMagnitude = rows.reduce((sum, row) => sum + Math.abs(row.profit), 0);

  return rows.map((row) => ({
    ...row,
    value: totalMagnitude === 0 ? 1 : Math.abs(row.profit),
    percentage: totalMagnitude > 0 ? (Math.abs(row.profit) / totalMagnitude) * 100 : rows.length > 0 ? 100 / rows.length : 0,
    fill: getCategoryColor(row.label, "session"),
    stroke: rgba(getCategoryColor(row.label, "session"), 0.28),
  }));
}

function buildEmotionMetric(rows: BreakdownChartRow[]) {
  const canUseWinRate = rows.some((row) => row.winRate > 0);

  if (canUseWinRate) {
    return {
      key: "winRate" as const,
      label: "Win rate",
      rows: rows.map((row) => ({
        ...row,
        metricValue: Math.max(0, Math.min(100, row.winRate)),
      })),
    };
  }

  const canUseTrades = rows.some((row) => row.trades > 0);

  if (canUseTrades) {
    const maxTrades = Math.max(...rows.map((row) => row.trades), 1);

    return {
      key: "trades" as const,
      label: "Trade count",
      rows: rows.map((row) => ({
        ...row,
        metricValue: (row.trades / maxTrades) * 100,
      })),
    };
  }

  const maxMagnitude = Math.max(...rows.map((row) => Math.abs(row.profit)), 0);

  return {
    key: "profit" as const,
    label: "Abs PnL",
    rows: rows.map((row) => ({
      ...row,
      metricValue: maxMagnitude > 0 ? (Math.abs(row.profit) / maxMagnitude) * 100 : 0,
    })),
  };
}

function PerformanceTooltip({
  active,
  payload,
}: TooltipProps<ValueType, NameType>) {
  if (!active || !payload?.length) {
    return null;
  }

  const datum = payload[0]?.payload as BreakdownChartRow | undefined;

  if (!datum) {
    return null;
  }

  return (
    <div className="min-w-[176px] rounded-2xl border border-border/70 bg-popover/96 px-4 py-3 text-xs text-popover-foreground shadow-[0_20px_50px_-24px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:shadow-[0_20px_50px_-24px_rgba(1,8,24,0.88)]">
      <p className="font-medium text-foreground">{datum.label}</p>
      <div className="mt-3 grid gap-1.5">
        <p>Trades: {formatNumberDisplay(datum.trades)}</p>
        <p>Win rate: {formatPercentageDisplay(datum.winRate)}</p>
        <p>Net PnL: {formatCurrencyDisplay(datum.profit)}</p>
      </div>
    </div>
  );
}

function SessionsTooltip({
  active,
  payload,
}: TooltipProps<ValueType, NameType>) {
  if (!active || !payload?.length) {
    return null;
  }

  const datum = payload[0]?.payload as BreakdownChartRow & { percentage?: number } | undefined;

  if (!datum) {
    return null;
  }

  return (
    <div className="min-w-[176px] rounded-2xl border border-border/70 bg-popover/96 px-4 py-3 text-xs text-popover-foreground shadow-[0_20px_50px_-24px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:shadow-[0_20px_50px_-24px_rgba(1,8,24,0.88)]">
      <p className="font-medium text-foreground">{datum.label}</p>
      <div className="mt-3 grid gap-1.5">
        <p>Contribution: {formatPercentageDisplay(datum.percentage ?? 0)}</p>
        <p>Trades: {formatNumberDisplay(datum.trades)}</p>
        <p>Win rate: {formatPercentageDisplay(datum.winRate)}</p>
        <p>Net PnL: {formatCurrencyDisplay(datum.profit)}</p>
      </div>
    </div>
  );
}

function PairsTreemapNode(props: Record<string, unknown>) {
  const {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    depth = 0,
    label,
    name,
    profit = 0,
    fill,
    stroke,
    textColor,
    mutedTextColor,
    contribution = 0,
    hovered = false,
    onHover,
    onLeave,
  } = props as {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    depth?: number;
    label?: string;
    name?: string;
    profit?: number;
    fill?: string;
    stroke?: string;
    textColor?: string;
    mutedTextColor?: string;
    contribution?: number;
    hovered?: boolean;
    onHover?: () => void;
    onLeave?: () => void;
  };

  if (depth === 0) {
    return null;
  }

  const displayLabel = label || name;

  if (!displayLabel || width < 12 || height < 12) {
    return null;
  }

  const compact = width < 92 || height < 42;
  const truncatedLabel = truncateLabel(displayLabel, compact ? 8 : 14);

  return (
    <g
      style={{ cursor: "pointer" }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      filter={hovered ? "url(#pairs-treemap-hover)" : "url(#pairs-treemap-base)"}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={16}
        ry={16}
        fill={fill ?? NEUTRAL_FILL}
        stroke={hovered ? "hsl(var(--foreground) / 0.18)" : (stroke ?? "hsl(var(--background) / 0.78)")}
        strokeWidth={hovered ? 2.5 : 2}
      />
      <foreignObject x={x + 8} y={y + 8} width={Math.max(width - 16, 0)} height={Math.max(height - 16, 0)}>
        <div className="flex h-full flex-col justify-between overflow-hidden" style={{ color: textColor }}>
          <p className="truncate text-[11px] font-medium">{truncatedLabel}</p>
          <div className="space-y-1">
            {!compact ? (
              <p className="truncate text-[11px]" style={{ color: mutedTextColor }}>
                {formatCompactCurrencyDisplay(profit)}
              </p>
            ) : null}
            {!compact ? (
              <p className="truncate text-[10px]" style={{ color: mutedTextColor }}>
                {formatContribution(contribution)}
              </p>
            ) : null}
          </div>
        </div>
      </foreignObject>
    </g>
  );
}

function PairsTreemapContent({
  hoveredKey,
  setHoveredKey,
  ...nodeProps
}: Record<string, unknown> & {
  hoveredKey: string | null;
  setHoveredKey: (key: string | null) => void;
}) {
  const key = String((nodeProps as { key?: string }).key ?? "");

  return (
    <PairsTreemapNode
      {...nodeProps}
      hovered={hoveredKey === key}
      onHover={() => setHoveredKey(key)}
      onLeave={() => setHoveredKey(null)}
    />
  );
}

export function SetupsChart({
  rows,
  onInspect,
}: {
  rows: BreakdownChartRow[];
  onInspect: (row: BreakdownChartRow) => void;
}) {
  if (rows.length === 0) {
    return <EmptyChartState message="No setup data" />;
  }

  const chartRows = rows.slice(0, 10);
  const totalMagnitude = rows.reduce((sum, row) => sum + Math.abs(row.profit), 0);
  const bestKey = rows.reduce<string | null>((best, row) => (
    best === null || row.profit > (rows.find((item) => item.key === best)?.profit ?? Number.NEGATIVE_INFINITY)
      ? row.key
      : best
  ), null);

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartRows} layout="vertical" margin={{ top: 4, right: 18, left: 12, bottom: 4 }}>
          <defs>
            {chartRows.map((row) => (
              <linearGradient key={row.key} id={`setup-bar-${row.key}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={getBreakdownColor(row.profit, rows, "barStart")} />
                <stop offset="100%" stopColor={getBreakdownColor(row.profit, rows, "barEnd")} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
          <XAxis
            type="number"
            tick={{ fill: AXIS_TEXT, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => formatCompactCurrencyDisplay(Number(value))}
          />
          <YAxis
            type="category"
            dataKey="shortLabel"
            tick={{ fill: AXIS_TEXT, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={100}
          />
          <ReferenceLine x={0} stroke={REFERENCE_LINE} />
          <Tooltip content={<PerformanceTooltip />} cursor={{ fill: CURSOR_FILL }} />
          <Bar
            dataKey="profit"
            radius={[0, 12, 12, 0]}
            onClick={(data) => onInspect(data as BreakdownChartRow)}
            label={({ x = 0, y = 0, width = 0, height = 0, value = 0, index = 0 }) => {
              const row = chartRows[index];

              if (!row) {
                return null;
              }

              const barWidth = Math.abs(Number(width));
              if (barWidth < 56) {
                return null;
              }

              const share = totalMagnitude > 0 ? (Math.abs(row.profit) / totalMagnitude) * 100 : 0;
              const positive = Number(value) >= 0;
              const labelX = positive ? Number(x) + Number(width) - 8 : Number(x) + 8;
              const labelText = barWidth >= 132
                ? `${formatCompactCurrencyDisplay(row.profit)} · ${formatContribution(share)}`
                : formatCompactCurrencyDisplay(row.profit);

              return (
                <text
                  x={labelX}
                  y={Number(y) + (Number(height) / 2) + 4}
                  textAnchor={positive ? "end" : "start"}
                  fill="#ffffff"
                  fontSize={11}
                  fontWeight={row.key === bestKey ? 700 : 500}
                >
                  {labelText}
                </text>
              );
            }}
          >
            {chartRows.map((row) => (
              <Cell
                key={row.key}
                fill={`url(#setup-bar-${row.key})`}
                stroke={row.key === bestKey ? getBreakdownColor(row.profit, rows, "stroke") : "transparent"}
                strokeWidth={row.key === bestKey ? 1.5 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PairsChart({
  rows,
  onInspect,
}: {
  rows: BreakdownChartRow[];
  onInspect: (row: BreakdownChartRow) => void;
}) {
  const chartRows = useMemo(() => buildTreemapRows(rows.slice(0, 12)), [rows]);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  if (rows.length === 0) {
    return <EmptyChartState message="No pair data" />;
  }

  return (
    <div className="h-[320px] overflow-hidden rounded-[1.75rem] border border-border/50 bg-background/40 p-2 dark:bg-white/[0.02]">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={chartRows}
          dataKey="size"
          nameKey="label"
          aspectRatio={4 / 3}
          stroke="transparent"
          content={<PairsTreemapContent hoveredKey={hoveredKey} setHoveredKey={setHoveredKey} />}
          onClick={(node) => {
            const payload = ((node as { payload?: BreakdownChartRow } | undefined)?.payload
              ?? node) as unknown as BreakdownChartRow | undefined;

            if (payload?.key) {
              onInspect(payload);
            }
          }}
        >
          <defs>
            <filter id="pairs-treemap-base" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(15,23,42,0.10)" />
            </filter>
            <filter id="pairs-treemap-hover" x="-14%" y="-14%" width="128%" height="128%">
              <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="rgba(15,23,42,0.18)" />
            </filter>
          </defs>
          <Tooltip content={<PerformanceTooltip />} />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}

export function SessionsChart({
  rows,
  onInspect,
}: {
  rows: BreakdownChartRow[];
  onInspect: (row: BreakdownChartRow) => void;
}) {
  const chartRows = buildContributionRows(rows);
  const totalProfit = rows.reduce((sum, row) => sum + row.profit, 0);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  if (rows.length === 0) {
    return <EmptyChartState message="No session data" variant="donut" />;
  }

  return (
    <div className="h-[320px] rounded-[1.75rem] border border-border/50 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.08),transparent_42%),linear-gradient(180deg,hsl(var(--background)/0.7),hsl(var(--background)/0.46))] p-4 dark:bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.12),transparent_42%),linear-gradient(180deg,hsl(var(--card)/0.88),hsl(var(--card)/0.7))]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<SessionsTooltip />} />
          <Pie
            data={chartRows}
            dataKey="value"
            cx="50%"
            cy="52%"
            innerRadius={72}
            outerRadius={112}
            stroke="transparent"
            isAnimationActive={false}
          >
            {chartRows.map((row) => (
              <Cell key={`${row.key}-shadow`} fill={DONUT_SHADOW} opacity={hoveredKey && hoveredKey !== row.key ? 0.45 : 1} />
            ))}
          </Pie>
          <Pie
            data={chartRows}
            dataKey="value"
            cx="50%"
            cy="48%"
            innerRadius={58}
            outerRadius={112}
            paddingAngle={chartRows.length > 1 ? 2 : 0}
            stroke="hsl(var(--background) / 0.7)"
            strokeWidth={2}
            onClick={(data) => onInspect(data as BreakdownChartRow)}
            onMouseEnter={(_, index) => {
              const row = chartRows[index];
              setHoveredKey(row?.key ?? null);
            }}
            onMouseLeave={() => setHoveredKey(null)}
          >
            {chartRows.map((row) => (
              <Cell
                key={row.key}
                fill={row.fill}
                stroke={row.stroke}
                opacity={hoveredKey && hoveredKey !== row.key ? 0.4 : 1}
                strokeWidth={hoveredKey === row.key ? 3 : 2}
              />
            ))}
          </Pie>
          <text x="50%" y="44%" textAnchor="middle" dominantBaseline="central" fill="hsl(var(--foreground))" fontSize="22" fontWeight={700}>
            {formatCompactCurrencyDisplay(totalProfit)}
          </text>
          <text x="50%" y="54%" textAnchor="middle" dominantBaseline="central" fill="hsl(var(--muted-foreground))" fontSize="11">
            Total PnL
          </text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EmotionsChart({
  rows,
  onInspect,
}: {
  rows: BreakdownChartRow[];
  onInspect: (row: BreakdownChartRow) => void;
}) {
  if (rows.length === 0) {
    return <EmptyChartState message="No emotion data" variant="donut" />;
  }

  if (rows.length > 6) {
    const chartRows = rows.slice(0, 8);

    return (
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartRows} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} />
            <XAxis dataKey="shortLabel" tick={{ fill: AXIS_TEXT, fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: AXIS_TEXT, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => formatCompactCurrencyDisplay(Number(value))} />
            <ReferenceLine y={0} stroke={REFERENCE_LINE} />
            <Tooltip content={<PerformanceTooltip />} cursor={{ fill: CURSOR_FILL }} />
            <Bar dataKey="profit" radius={[12, 12, 0, 0]} onClick={(data) => onInspect(data as BreakdownChartRow)}>
              {chartRows.map((row) => (
                <Cell key={row.key} fill={getBreakdownColor(row.profit, chartRows, "solid")} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const metric = buildEmotionMetric(rows);
  const strongest = metric.rows.reduce<(typeof metric.rows)[number] | null>(
    (best, row) => (best === null || row.metricValue > best.metricValue ? row : best),
    null,
  );

  return (
    <div className="relative h-[360px] rounded-[1.75rem] border border-border/50 bg-background/35 px-2 py-3 dark:bg-white/[0.02]">
      {strongest ? (
        <div className="absolute right-4 top-4 rounded-full border border-border/60 bg-background/75 px-3 py-1.5 text-xs text-muted-foreground dark:bg-white/[0.04]">
          Strongest: <span className="font-medium text-foreground">{strongest.label}</span>
        </div>
      ) : null}
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={metric.rows} outerRadius="68%">
          <defs>
            <linearGradient id="emotion-radar-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary) / 0.36)" />
              <stop offset="100%" stopColor="hsl(var(--primary) / 0.08)" />
            </linearGradient>
          </defs>
          <PolarGrid stroke={GRID_STROKE} />
          <PolarAngleAxis dataKey="shortLabel" tick={{ fill: AXIS_TEXT, fontSize: 12 }} />
          <Tooltip content={<PerformanceTooltip />} />
          <Radar
            name={metric.label}
            dataKey="metricValue"
            stroke={RADAR_STROKE}
            fill="url(#emotion-radar-fill)"
            fillOpacity={1}
            strokeWidth={2.5}
            dot={{ r: 4, fill: RADAR_STROKE, strokeWidth: 0 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export const SetupsBreakdownChart = SetupsChart;
export const PairsBreakdownChart = PairsChart;
export const SessionsBreakdownChart = SessionsChart;
export const EmotionsBreakdownChart = EmotionsChart;
