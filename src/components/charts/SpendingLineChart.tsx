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
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';

interface SpendingLineChartProps {
  data: Array<{
    month: string;
    [accountName: string]: string | number;
  }>;
  accounts: string[];
  title?: string;
  onMonthClick?: (month: string) => void;
}

// Predefined color palette for accounts
const COLORS = [
  '#2563eb', // blue
  '#dc2626', // red
  '#16a34a', // green
  '#9333ea', // purple
  '#ea580c', // orange
  '#0891b2', // cyan
  '#ca8a04', // yellow
  '#db2777', // pink
];

// Custom colors for specific accounts
const ACCOUNT_COLORS: Record<string, string> = {
  'Savor': '#ea580c', // orange
  'Venture X': '#1e3a8a', // dark blue
  'Freedom': '#6b7280', // grey
  'Preferred': '#60a5fa', // light blue
};

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
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Build chart config dynamically based on accounts
  // Use both original and sanitized keys so legend can find the labels
  const chartConfig: ChartConfig = accounts.reduce((config, accountName, index) => {
    const sanitizedKey = accountName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    // Check if account has a custom color, otherwise use default palette
    const color = ACCOUNT_COLORS[accountName] || COLORS[index % COLORS.length];

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
            content={
              <ChartTooltipContent
                labelFormatter={(value) => formatMonth(value as string)}
                formatter={(value, name) => (
                  <>
                    <span className="font-medium">{name}: </span>
                    <span className="font-mono">{formatCurrency(value as number)}</span>
                  </>
                )}
              />
            }
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
