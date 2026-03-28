'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { usePrivacy } from '@/lib/privacy';
import { Transaction } from './types';
import { SankeySection } from './SankeySection';
import { TransactionTableSection } from './TransactionTableSection';
import { InsightsSection } from './InsightsSection';

function SkeletonBar({ width, className }: { width: string; className?: string }) {
  return (
    <div
      className={cn("h-4 bg-muted animate-pulse rounded", className)}
      style={{ width }}
    />
  );
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  month: string | null;
  accounts: Array<{ id: string; name: string }>;
  onNavigateMonth?: (direction: 'prev' | 'next') => void;
  canNavigatePrev?: boolean;
  canNavigateNext?: boolean;
}

export function TransactionModal({
  isOpen,
  onClose,
  month,
  accounts,
  onNavigateMonth,
  canNavigatePrev = false,
  canNavigateNext = false,
}: TransactionModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredAccountId, setFilteredAccountId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const { isPrivacyMode, formatCurrency } = usePrivacy();
  const [amountSort, setAmountSort] = useState<'none' | 'asc' | 'desc'>('none');
  const [summary, setSummary] = useState({
    totalTransactions: 0,
    totalAmount: 0,
    previousMonthTotal: null as number | null,
    month: '',
  });

  useEffect(() => {
    if (isOpen && month) {
      setAmountSort('none');
      fetchTransactions();
    }
  }, [isOpen, month, filteredAccountId]);

  useEffect(() => {
    if (!isOpen || !onNavigateMonth) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && canNavigatePrev) {
        onNavigateMonth('prev');
      } else if (e.key === 'ArrowRight' && canNavigateNext) {
        onNavigateMonth('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onNavigateMonth, canNavigatePrev, canNavigateNext]);

  const fetchTransactions = async () => {
    if (!month) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({ month });
      if (filteredAccountId !== 'all') {
        params.append('accountId', filteredAccountId);
      }

      const response = await fetch(`/api/transactions/details?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sortedTransactions = useMemo(() => {
    if (amountSort === 'none') return transactions;
    return [...transactions].sort((a, b) =>
      amountSort === 'asc' ? a.amount - b.amount : b.amount - a.amount
    );
  }, [transactions, amountSort]);

  const percentageChange = useMemo(() => {
    if (summary.previousMonthTotal === null || summary.previousMonthTotal === 0) {
      return null;
    }
    return ((summary.totalAmount - summary.previousMonthTotal) / summary.previousMonthTotal) * 100;
  }, [summary.totalAmount, summary.previousMonthTotal]);

  const cycleAmountSort = () => {
    setAmountSort((prev) =>
      prev === 'none' ? 'asc' : prev === 'asc' ? 'desc' : 'none'
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatMonth = (monthStr: string) => {
    const [year, monthNum] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="relative">
          <DialogTitle className="sr-only">Transactions</DialogTitle>
          {month && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex items-center gap-2 pointer-events-auto">
                {onNavigateMonth && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onNavigateMonth('prev')}
                    disabled={!canNavigatePrev}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                <span className="text-sm font-medium">{formatMonth(month)}</span>
                {onNavigateMonth && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onNavigateMonth('next')}
                    disabled={!canNavigateNext}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="visualize">Visualize</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 overflow-hidden flex flex-col">
            {/* Total Spending & Insights */}
            <div className="flex gap-3">
              <Card className="w-[200px] shrink-0">
                <CardContent className="p-3 space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Total Transactions</div>
                    {isLoading ? (
                      <SkeletonBar width="60%" className="h-6 mt-1" />
                    ) : (
                      <div className="text-xl font-bold">{summary.totalTransactions}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Total Spending</div>
                    {isLoading ? (
                      <>
                        <SkeletonBar width="80%" className="h-6 mt-1" />
                        <SkeletonBar width="50%" className="h-3 mt-2" />
                      </>
                    ) : (
                      <>
                        <div className="text-xl font-bold">
                          {formatCurrency(summary.totalAmount)}
                        </div>
                        {percentageChange !== null && !isPrivacyMode && (
                          <div className={cn(
                            "text-xs mt-1",
                            percentageChange > 0 ? "text-red-500" : "text-green-500"
                          )}>
                            {percentageChange > 0 ? '▲' : '▼'} {Math.abs(percentageChange).toFixed(0)}% vs last month
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
              <div className="flex-1 min-w-0">
                <InsightsSection month={month} />
              </div>
            </div>

            {/* Account Filter & Transaction Count */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Account:</label>
              <Select value={filteredAccountId} onValueChange={setFilteredAccountId}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Transaction Table */}
            <div className="flex-1 overflow-auto border rounded-lg min-h-[300px]">
              <TransactionTableSection
                transactions={transactions}
                sortedTransactions={sortedTransactions}
                isLoading={isLoading}
                amountSort={amountSort}
                onCycleSort={cycleAmountSort}
                formatDate={formatDate}
                formatCurrency={formatCurrency}
              />
            </div>
          </TabsContent>

          <TabsContent value="visualize" className="flex-1 overflow-hidden">
            <div className="h-[60vh] relative">
              <SankeySection transactions={transactions} isLoading={isLoading} />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
