'use client';

import { useMemo } from 'react';
import { Sankey, Tooltip, ResponsiveContainer, Rectangle } from 'recharts';

interface Transaction {
  id: string;
  date: string;
  accountId: string;
  accountName: string;
  description: string;
  category: string | null;
  amount: number;
}

interface CategorySankeyChartProps {
  transactions: Transaction[];
  title?: string;
}

interface SankeyNode {
  name: string;
}

interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

const COLORS = [
  '#8b5cf6', // purple
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
  '#84cc16', // lime
];

// Custom node renderer with labels - function form to preserve event handlers
const renderCustomNode = (props: any) => {
  const { x, y, width, height, index, payload, onMouseEnter, onMouseLeave, onClick } = props;
  const isRoot = index === 0;
  const color = isRoot ? '#6366f1' : COLORS[index % COLORS.length];

  return (
    <g>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        fillOpacity={0.8}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      />
      <text
        textAnchor={isRoot ? 'end' : 'start'}
        x={isRoot ? x - 10 : x + width + 10}
        y={y + height / 2}
        fontSize="12"
        fill="currentColor"
        dominantBaseline="middle"
        pointerEvents="none"
      >
        {payload.name}
      </text>
    </g>
  );
};

// Custom link renderer - function form to preserve event handlers
const renderCustomLink = (props: any) => {
  const {
    sourceX,
    targetX,
    sourceY,
    targetY,
    sourceControlX,
    targetControlX,
    linkWidth,
    index,
    onMouseEnter,
    onMouseLeave,
    onClick
  } = props;

  return (
    <path
      d={`
        M${sourceX},${sourceY}
        C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
      `}
      stroke={COLORS[index % COLORS.length]}
      strokeWidth={linkWidth}
      strokeOpacity={0.3}
      fill="none"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    />
  );
};

// Custom tooltip for Sankey - needs total spending passed in
const createCustomTooltip = (totalSpending: number) => {
  return function CustomTooltip({ active, payload }: any) {
    if (!active || !payload?.length) {
      return null;
    }

    const data = payload[0].payload;

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    };

    const formatPercentage = (value: number, total: number) => {
      const percentage = (value / total) * 100;
      return percentage.toFixed(1) + '%';
    };

    // Check if this is a link or node
    if (data.source !== undefined && data.target !== undefined) {
      // This is a link
      return (
        <div className="border-border/50 bg-background rounded-lg border px-3 py-2 text-xs shadow-xl">
          <div className="font-medium mb-1">
            {data.source.name} → {data.target.name}
          </div>
          <div className="text-foreground font-mono">
            {formatCurrency(data.value)}
          </div>
          <div className="text-muted-foreground text-[10px] mt-1">
            {formatPercentage(data.value, totalSpending)} of total
          </div>
        </div>
      );
    }

    // This is a node
    const isRootNode = data.name === 'Total Spending';

    return (
      <div className="border-border/50 bg-background rounded-lg border px-3 py-2 text-xs shadow-xl">
        <div className="font-medium mb-1">{data.name}</div>
        {data.value && (
          <>
            <div className="text-foreground font-mono text-sm">
              {formatCurrency(data.value)}
            </div>
            {!isRootNode && (
              <div className="text-muted-foreground text-[10px] mt-1">
                {formatPercentage(data.value, totalSpending)} of total spending
              </div>
            )}
          </>
        )}
      </div>
    );
  };
}

export function CategorySankeyChart({
  transactions,
  title = 'Spending by Category'
}: CategorySankeyChartProps) {
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  const sankeyData: SankeyData = useMemo(() => {
    // Aggregate transactions by category
    const categoryTotals = new Map<string, number>();

    transactions.forEach((transaction) => {
      const category = transaction.category || 'Uncategorized';
      const current = categoryTotals.get(category) || 0;
      categoryTotals.set(category, current + transaction.amount);
    });

    // Sort categories by amount (descending)
    const sortedCategories = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1]);

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    };

    const formatPercentage = (value: number, total: number) => {
      const percentage = (value / total) * 100;
      return percentage.toFixed(1) + '%';
    };

    // Build nodes: root node + category nodes with labels including amount and percentage
    const nodes: SankeyNode[] = [
      { name: 'Total Spending' },
      ...sortedCategories.map(([category, amount]) => ({
        name: `${category} - ${formatCurrency(amount)} (${formatPercentage(amount, totalAmount)})`
      }))
    ];

    // Build links from root to each category
    const links: SankeyLink[] = sortedCategories.map(([_, amount], index) => ({
      source: 0, // Root node
      target: index + 1, // Category node (offset by 1 for root)
      value: amount
    }));

    return { nodes, links };
  }, [transactions, totalAmount]);

  // Only render if we have data
  if (transactions.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium">{title}</h4>
        <span className="text-xs text-muted-foreground">
          {sankeyData.nodes.length - 1} {sankeyData.nodes.length - 1 === 1 ? 'category' : 'categories'}
        </span>
      </div>
      <div className="border rounded-lg bg-card p-4">
        <ResponsiveContainer width="100%" height={300}>
          <Sankey
            data={sankeyData}
            nodeWidth={10}
            nodePadding={20}
            linkCurvature={0.5}
            iterations={32}
            node={renderCustomNode}
            link={renderCustomLink}
            margin={{ top: 10, right: 250, bottom: 10, left: 150 }}
          >
            <Tooltip content={createCustomTooltip(totalAmount)} />
          </Sankey>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
