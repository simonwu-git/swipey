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

  // Filter data based on selected time range
  const filteredData = useMemo(() => {
    if (timeRange === 'ALL') {
      return data;
    }

    const now = new Date();
    const monthsBack = timeRange === '3M' ? 3 : timeRange === '6M' ? 6 : 12;
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1);
    const cutoffMonth = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}`;

    return data.filter(item => item.month >= cutoffMonth);
  }, [data, timeRange]);

  // Add Total to chart data
  const chartData = useMemo(() => {
    return filteredData.map(item => ({
      ...item,
      Total: accounts.reduce((sum, acc) => sum + (Number(item[acc]) || 0), 0)
    }));
  }, [filteredData, accounts]);

  // Handle click on chart - receives the data point directly
  const handleClick = (clickData: any) => {
    // When clicking on a data point, clickData will have the month property
    if (clickData && clickData.month && onMonthClick) {
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
    total: { label: 'Total Spend', color: '#3b82f6' }
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
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
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
            dot={{ r: 2.5, fill: 'var(--color-total)', strokeWidth: 0 }}
            activeDot={{
              r: 5,
              fill: 'var(--color-total)',
              stroke: 'var(--background)',
              strokeWidth: 2,
              cursor: 'pointer',
              onClick: (_e: any, payload: any) => handleClick(payload.payload)
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
