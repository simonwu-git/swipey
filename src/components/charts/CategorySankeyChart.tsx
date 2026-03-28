'use client';

import { useMemo } from 'react';
import { Sankey, ResponsiveContainer, Rectangle } from 'recharts';
import { usePrivacy } from '@/lib/privacy';

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
  height?: number | string;
}

interface SankeyNode {
  name: string;
  value?: number; // Total amount for this node
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
// Expects containerProps to have accountCount for distinguishing left (accounts) from right (categories)
const createCustomNode = (accountCount: number, totalAmount: number, isPrivacyMode: boolean) => {
  const formatCurrency = (value: number) => {
    if (isPrivacyMode) return '$•••••';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number, total: number) => {
    if (isPrivacyMode) return '••%';
    const percentage = (value / total) * 100;
    return percentage.toFixed(1) + '%';
  };

  return (props: any) => {
    const { x, y, width, height, index, payload, onMouseEnter, onMouseLeave, onClick } = props;
    const isAccount = index < accountCount;
    const color = COLORS[index % COLORS.length];

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
          style={{ cursor: 'pointer' }}
        />
        <text
          textAnchor={isAccount ? 'end' : 'start'}
          x={isAccount ? x - 10 : x + width + 10}
          y={y + height / 2 - 6}
          fontSize="12"
          fill="currentColor"
          dominantBaseline="middle"
          pointerEvents="none"
          fontWeight="500"
        >
          {payload.name}
        </text>
        {payload.value && (
          <text
            textAnchor={isAccount ? 'end' : 'start'}
            x={isAccount ? x - 10 : x + width + 10}
            y={y + height / 2 + 8}
            fontSize="12"
            fill="currentColor"
            opacity={0.7}
            dominantBaseline="middle"
            pointerEvents="none"
          >
            {formatCurrency(payload.value)} ({formatPercentage(payload.value, totalAmount)})
          </text>
        )}
      </g>
    );
  };
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

export function CategorySankeyChart({
  transactions,
  title = 'Account to Category Flow',
  height = 400,
}: CategorySankeyChartProps) {
  const { isPrivacyMode } = usePrivacy();
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  const { sankeyData, accountCount } = useMemo((): { sankeyData: SankeyData; accountCount: number } => {
    // Aggregate by (account, category) pairs
    const flowMap = new Map<string, number>();
    const accountTotals = new Map<string, number>();
    const categoryTotals = new Map<string, number>();

    transactions.forEach((transaction) => {
      const account = transaction.accountName;
      const category = transaction.category || 'Uncategorized';
      const flowKey = `${account}→${category}`;

      // Update flow
      flowMap.set(flowKey, (flowMap.get(flowKey) || 0) + transaction.amount);

      // Update account totals
      accountTotals.set(account, (accountTotals.get(account) || 0) + transaction.amount);

      // Update category totals
      categoryTotals.set(category, (categoryTotals.get(category) || 0) + transaction.amount);
    });

    // Sort accounts and categories by total amount (descending)
    const sortedAccounts = Array.from(accountTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([account]) => account);

    const sortedCategories = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category]) => category);

    // Build nodes: accounts (left) + categories (right) with their total values
    const nodes: SankeyNode[] = [
      ...sortedAccounts.map(account => ({
        name: account,
        value: accountTotals.get(account) || 0
      })),
      ...sortedCategories.map(category => ({
        name: category,
        value: categoryTotals.get(category) || 0
      }))
    ];

    // Create index maps for quick lookup
    const accountIndexMap = new Map(sortedAccounts.map((acc, i) => [acc, i]));
    const categoryIndexMap = new Map(sortedCategories.map((cat, i) => [cat, i + sortedAccounts.length]));

    // Build links from accounts to categories
    const links: SankeyLink[] = [];
    flowMap.forEach((amount, flowKey) => {
      const [account, category] = flowKey.split('→');
      const sourceIndex = accountIndexMap.get(account);
      const targetIndex = categoryIndexMap.get(category);

      if (sourceIndex !== undefined && targetIndex !== undefined) {
        links.push({
          source: sourceIndex,
          target: targetIndex,
          value: amount
        });
      }
    });

    return {
      sankeyData: { nodes, links },
      accountCount: sortedAccounts.length
    };
  }, [transactions, totalAmount]);

  // Only render if we have data
  if (transactions.length === 0) {
    return null;
  }

  const categoryCount = sankeyData.nodes.length - accountCount;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium">{title}</h4>
        <span className="text-xs text-muted-foreground">
          {accountCount} {accountCount === 1 ? 'account' : 'accounts'} → {categoryCount} {categoryCount === 1 ? 'category' : 'categories'}
        </span>
      </div>
      <div className="border rounded-lg bg-card p-4 flex-1 overflow-x-auto">
        <div className="min-w-[600px] h-full">
        <ResponsiveContainer width="100%" height={height}>
          <Sankey
            data={sankeyData}
            nodeWidth={10}
            nodePadding={30}
            linkCurvature={0.5}
            iterations={32}
            node={createCustomNode(accountCount, totalAmount, isPrivacyMode)}
            link={renderCustomLink}
            margin={{ top: 10, right: 200, bottom: 10, left: 150 }}
          />
        </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
