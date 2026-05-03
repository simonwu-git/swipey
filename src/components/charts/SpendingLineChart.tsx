'use client';

import { useMemo, useState } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '@/components/ui/chart';
import { getAccountColor } from '@/lib/accountColors';
import { cn } from '@/lib/utils';
import { usePrivacy } from '@/lib/privacy';

interface SpendingLineChartProps {
  data: Array<{
    month: string;
    [accountName: string]: string | number;
  }>;
  accounts: string[];
  title?: string;
  onMonthClick?: (month: string) => void;
}

// Custom tooltip content showing total and per-account breakdown
function CustomTooltipContent({ active, payload, label, accounts, formatCurrency }: any) {
  if (!active || !payload?.length) {
    return null;
  }

  const dataPoint = payload[0]?.payload;

  if (dataPoint?.isNoData) {
    return (
      <div className={cn(
        "border-border/50 bg-background rounded-lg border px-3 py-2 text-xs shadow-xl"
      )}>
        <div className="font-medium mb-1">{label}</div>
        <div className="text-muted-foreground">No data</div>
      </div>
    );
  }

  const total = dataPoint?.Total || 0;

  return (
    <div className={cn(
      "border-border/50 bg-background rounded-lg border px-3 py-2 text-xs shadow-xl"
    )}>
      <div className="font-medium mb-2">{label}</div>
      <div className="font-semibold mb-2">
        Total: {formatCurrency(total)}
      </div>
      <div className="grid gap-1.5 border-t pt-2">
        {accounts.map((account: string, idx: number) => (
          <div key={account} className="flex items-center gap-3">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: getAccountColor(account, idx) }}
            />
            <div className="flex flex-1 justify-between items-center gap-4">
              <span className="text-muted-foreground">{account}</span>
              <span className="text-foreground font-mono font-medium tabular-nums">
                {formatCurrency(dataPoint[account] || 0)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type TimeRange = '3M' | '6M' | '1Y' | 'ALL';

export function SpendingLineChart({ data, accounts, title = 'Monthly Spending', onMonthClick }: SpendingLineChartProps) {
  const { formatCurrency } = usePrivacy();
  const [timeRange, setTimeRange] = useState<TimeRange>('1Y');

  const chartData = useMemo(() => {
    if (data.length === 0) return [];

    const dataByMonth = new Map(data.map(d => [d.month, d]));
    const latestDataMonth = data[data.length - 1].month;

    let monthsToShow: string[];
    if (timeRange === 'ALL') {
      monthsToShow = data.map(d => d.month);
    } else {
      const monthsBack = timeRange === '3M' ? 3 : timeRange === '6M' ? 6 : 12;
      const now = new Date();
      monthsToShow = [];
      for (let i = monthsBack - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthsToShow.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
    }

    return monthsToShow.map(month => {
      const existing = dataByMonth.get(month);
      if (existing) {
        return {
          ...existing,
          Total: accounts.reduce((sum, acc) => sum + (Number(existing[acc]) || 0), 0),
          isNoData: false,
        };
      }
      const isNoData = month > latestDataMonth;
      const filled: Record<string, any> = { month, Total: 0, isNoData };
      accounts.forEach(acc => { filled[acc] = 0; });
      return filled;
    });
  }, [data, accounts, timeRange]);

  // Handle click on chart - receives the data point directly
  const handleClick = (clickData: any) => {
    if (clickData && clickData.month && !clickData.isNoData && onMonthClick) {
      onMonthClick(clickData.month);
    }
  };

  // Format month for X-axis (e.g., "2024-01" -> "Jan 2024")
  const formatMonth = (month: string) => {
    if (!month) return '';
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Simple chart config for single Total line
  const chartConfig: ChartConfig = {
    total: { label: 'Total Spend', color: 'var(--primary)' }
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ChartContainer config={chartConfig} className="h-[400px]">
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <defs>
            <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            horizontal={true}
            vertical={false}
            strokeDasharray="0"
            stroke="currentColor"
            strokeOpacity={0.08}
          />
          <XAxis
            dataKey="month"
            tickFormatter={formatMonth}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'currentColor', opacity: 0.5, fontSize: 11 }}
            dy={10}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'currentColor', opacity: 0.5, fontSize: 11 }}
            dx={-5}
            width={70}
          />
          <ChartTooltip
            content={({ active, payload, label }) => (
              <CustomTooltipContent
                active={active}
                payload={payload}
                label={formatMonth(label as string)}
                accounts={accounts}
                formatCurrency={formatCurrency}
              />
            )}
          />
          <Area
            type="monotone"
            dataKey="Total"
            stroke="none"
            fill="url(#totalGradient)"
          />
          <Line
            type="monotone"
            dataKey="Total"
            stroke="var(--color-total)"
            strokeWidth={1.5}
            // Months past the latest synced data render a faded hollow ring so
            // they're visually distinct from real $0-spend months sitting at y=0.
            dot={(props: any) => {
              const { cx, cy, payload, index } = props;
              if (payload?.isNoData) {
                return (
                  <circle
                    key={`dot-${index}`}
                    cx={cx}
                    cy={cy}
                    r={2.5}
                    fill="var(--background)"
                    stroke="var(--muted-foreground)"
                    strokeWidth={1}
                    opacity={0.5}
                  />
                );
              }
              return (
                <circle
                  key={`dot-${index}`}
                  cx={cx}
                  cy={cy}
                  r={2.5}
                  fill="var(--color-total)"
                />
              );
            }}
            // Suppress the hover dot for no-data months — otherwise clicking
            // would open an empty transaction modal.
            activeDot={(props: any) => {
              const { cx, cy, payload, index } = props;
              if (payload?.isNoData) {
                return <g key={`active-${index}`} />;
              }
              return (
                <circle
                  key={`active-${index}`}
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill="var(--color-total)"
                  stroke="var(--background)"
                  strokeWidth={2}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleClick(payload)}
                />
              );
            }}
          />
        </ComposedChart>
      </ChartContainer>
      <div className="flex justify-center gap-1 mt-4">
        {(['3M', '6M', '1Y', 'ALL'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={cn(
              "px-3 py-1 text-sm rounded-md transition-colors",
              timeRange === range
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {range}
          </button>
        ))}
      </div>
    </div>
  );
}
