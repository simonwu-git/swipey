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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAccountColor } from '@/lib/accountColors';
import { cn } from '@/lib/utils';

interface SpendingLineChartProps {
  data: Array<{
    month: string;
    [accountName: string]: string | number;
  }>;
  accounts: string[];
  title?: string;
  onMonthClick?: (month: string) => void;
}

// Format currency for display
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Custom tooltip content showing total and per-account breakdown
function CustomTooltipContent({ active, payload, label, accounts }: any) {
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

export function SpendingLineChart({ data, accounts, title = 'Monthly Spending', onMonthClick }: SpendingLineChartProps) {
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // Extract unique years from data
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    data.forEach(item => {
      if (item.month) {
        const year = item.month.split('-')[0];
        years.add(year);
      }
    });
    return Array.from(years).sort().reverse();
  }, [data]);

  // Filter and transform data based on selected year
  const filteredData = useMemo(() => {
    if (selectedYear === 'all') {
      return data;
    }

    // Create a template with all 12 months for the selected year
    const monthTemplate: Array<{ month: string; [key: string]: string | number }> = [];
    for (let m = 1; m <= 12; m++) {
      const monthStr = `${selectedYear}-${String(m).padStart(2, '0')}`;
      const entry: { month: string; [key: string]: string | number } = { month: monthStr };
      // Initialize all accounts to 0
      accounts.forEach(acc => {
        entry[acc] = 0;
      });
      monthTemplate.push(entry);
    }

    // Fill in actual data
    data.forEach(item => {
      if (item.month && item.month.startsWith(selectedYear)) {
        const idx = monthTemplate.findIndex(t => t.month === item.month);
        if (idx !== -1) {
          // Copy all values from the actual data
          Object.keys(item).forEach(key => {
            monthTemplate[idx][key] = item[key];
          });
        }
      }
    });

    return monthTemplate;
  }, [data, selectedYear, accounts]);

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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {availableYears.map(year => (
              <SelectItem key={year} value={year}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
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
    </div>
  );
}
