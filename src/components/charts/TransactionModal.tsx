'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { CategorySankeyChart } from './CategorySankeyChart';

interface Transaction {
  id: string;
  date: string;
  accountId: string;
  accountName: string;
  description: string;
  category: string | null;
  amount: number;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  month: string | null;
  accounts: Array<{ id: string; name: string }>;
}

export function TransactionModal({
  isOpen,
  onClose,
  month,
  accounts,
}: TransactionModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredAccountId, setFilteredAccountId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [amountSort, setAmountSort] = useState<'none' | 'asc' | 'desc'>('none');
  const [summary, setSummary] = useState({
    totalTransactions: 0,
    totalAmount: 0,
    month: '',
  });

  useEffect(() => {
    if (isOpen && month) {
      setAmountSort('none');
      fetchTransactions();
    }
  }, [isOpen, month, filteredAccountId]);

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

  const cycleAmountSort = () => {
    setAmountSort((prev) =>
      prev === 'none' ? 'asc' : prev === 'asc' ? 'desc' : 'none'
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
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
        <DialogHeader>
          <DialogTitle>
            {month ? `Transactions - ${formatMonth(month)}` : 'Transactions'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground">Total Transactions</div>
                <div className="text-xl font-bold">{summary.totalTransactions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground">Total Spending</div>
                <div className="text-xl font-bold">
                  {formatCurrency(summary.totalAmount)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Account Filter */}
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

          {/* Main content area - side by side on large screens */}
          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-4">
            {/* Left: Sankey Chart */}
            {!isLoading && transactions.length > 0 && (
              <div className="lg:w-[55%] min-h-[300px]">
                <CategorySankeyChart transactions={transactions} height="100%" />
              </div>
            )}

            {/* Right: Transaction Table */}
            <div className="flex-1 overflow-auto border rounded-lg min-h-[300px]">
              {isLoading ? (
                <div className="p-8 text-center text-gray-500">
                  Loading transactions...
                </div>
              ) : transactions.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No transactions found for this period
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead
                        className="text-right cursor-pointer select-none hover:text-foreground"
                        onClick={cycleAmountSort}
                      >
                        Amount{amountSort === 'asc' ? ' ▲' : amountSort === 'desc' ? ' ▼' : ''}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(transaction.date)}
                        </TableCell>
                        <TableCell>{transaction.accountName}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {transaction.description}
                        </TableCell>
                        <TableCell>
                          {transaction.category || <span className="text-gray-400">—</span>}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
