'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
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

// Custom tooltip content with adjustable spacing
function CustomTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) {
    return null;
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

  return (
    <div className={cn(
      "border-border/50 bg-background rounded-lg border px-3 py-2 text-xs shadow-xl"
    )}>
      <div className="font-medium mb-2">{label}</div>
      <div className="grid gap-2">
        {payload.map((item: any) => {
          const accountName = item.name || item.dataKey;
          const color = item.color || item.stroke;

          return (
            <div key={accountName} className="flex items-center gap-3">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <div className="flex flex-1 justify-between items-center gap-4">
                <span className="text-muted-foreground">{accountName}</span>
                <span className="text-foreground font-mono font-medium tabular-nums">
                  {formatCurrency(item.value)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SpendingLineChart({ data, accounts, title = 'Monthly Spending', onMonthClick }: SpendingLineChartProps) {
  // Handle click on chart - receives the data point directly
  const handleClick = (clickData: any) => {
    // When clicking on a data point, clickData will have the month property
    if (clickData && clickData.month && onMonthClick) {
      onMonthClick(clickData.month);
    }
  };

  // Format currency for Y-axis and tooltip
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format month for X-axis (e.g., "2024-01" -> "Jan 2024")
  const formatMonth = (month: string) => {
    if (!month) return '';
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Build chart config dynamically based on accounts
  // Use both original and sanitized keys so legend can find the labels
  const chartConfig: ChartConfig = accounts.reduce((config, accountName, index) => {
    const sanitizedKey = accountName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const color = getAccountColor(accountName, index);

    config[sanitizedKey] = {
      label: accountName,
      color: color,
    };
    // Also add the original account name as a key for legend lookup
    config[accountName] = {
      label: accountName,
      color: color,
    };
    return config;
  }, {} as ChartConfig);

  // Map account names to sanitized keys for CSS variables
  const getColorKey = (accountName: string) => {
    return accountName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ChartContainer config={chartConfig} className="h-[400px]">
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="month"
            tickFormatter={formatMonth}
            tickLine={false}
            axisLine={false}
            style={{ fontSize: '12px' }}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tickLine={false}
            axisLine={false}
            style={{ fontSize: '12px' }}
          />
          <ChartTooltip
            content={({ active, payload, label }) => (
              <CustomTooltipContent
                active={active}
                payload={payload}
                label={formatMonth(label as string)}
              />
            )}
          />
          <ChartLegend content={<ChartLegendContent />} />
          {accounts.map((accountName) => {
            const colorKey = getColorKey(accountName);
            return (
              <Line
                key={accountName}
                type="monotone"
                dataKey={accountName}
                stroke={`var(--color-${colorKey})`}
                strokeWidth={2}
                dot={{
                  fill: `var(--color-${colorKey})`,
                  r: 4,
                  cursor: 'pointer',
                  strokeWidth: 0,
                }}
                activeDot={{
                  r: 6,
                  cursor: 'pointer',
                  onClick: (_e: any, payload: any) => handleClick(payload.payload)
                }}
                onClick={handleClick}
              />
            );
          })}
        </LineChart>
      </ChartContainer>
    </div>
  );
}
