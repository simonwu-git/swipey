'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Transaction } from './types';

function SkeletonBar({ width, className }: { width: string; className?: string }) {
  return (
    <div
      className={cn("h-4 bg-muted animate-pulse rounded", className)}
      style={{ width }}
    />
  );
}

function SkeletonRow({ widths }: { widths: number[] }) {
  return (
    <TableRow>
      <TableCell>
        <SkeletonBar width={`${widths[0]}%`} />
      </TableCell>
      <TableCell>
        <SkeletonBar width={`${widths[1]}%`} />
      </TableCell>
      <TableCell>
        <SkeletonBar width={`${widths[2]}%`} />
      </TableCell>
      <TableCell>
        <SkeletonBar width={`${widths[3]}%`} />
      </TableCell>
      <TableCell className="text-right">
        <SkeletonBar width={`${widths[4]}%`} className="ml-auto" />
      </TableCell>
    </TableRow>
  );
}

const skeletonWidths = [
  [70, 80, 90, 60, 50],
  [50, 60, 70, 50, 40],
  [80, 70, 85, 70, 60],
  [60, 90, 60, 40, 55],
  [75, 50, 80, 65, 45],
  [55, 75, 95, 55, 50],
  [65, 85, 75, 45, 60],
  [80, 65, 65, 75, 40],
];

interface TransactionTableSectionProps {
  transactions: Transaction[];
  sortedTransactions: Transaction[];
  isLoading: boolean;
  amountSort: 'none' | 'asc' | 'desc';
  onCycleSort: () => void;
  formatDate: (date: string) => string;
  formatCurrency: (value: number) => string;
  highlightedTransactionIds?: Set<string>;
}

export function TransactionTableSection({
  transactions,
  sortedTransactions,
  isLoading,
  amountSort,
  onCycleSort,
  formatDate,
  formatCurrency,
  highlightedTransactionIds,
}: TransactionTableSectionProps) {
  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {skeletonWidths.map((widths, index) => (
            <SkeletonRow key={index} widths={widths} />
          ))}
        </TableBody>
      </Table>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No transactions found for this period
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Account</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Category</TableHead>
          <TableHead
            className="text-right cursor-pointer select-none hover:text-foreground"
            onClick={onCycleSort}
          >
            Amount{amountSort === 'asc' ? ' ▲' : amountSort === 'desc' ? ' ▼' : ''}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedTransactions.map((transaction) => (
          <TableRow
            key={transaction.id}
            className={cn(highlightedTransactionIds?.has(transaction.id) && 'bg-primary/10')}
          >
            <TableCell className="whitespace-nowrap">
              {formatDate(transaction.date)}
            </TableCell>
            <TableCell>{transaction.accountName}</TableCell>
            <TableCell className="max-w-xs truncate">
              {transaction.description}
            </TableCell>
            <TableCell>
              {transaction.category || <span className="text-muted-foreground">—</span>}
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(transaction.amount)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
