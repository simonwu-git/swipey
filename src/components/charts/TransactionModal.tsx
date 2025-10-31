'use client';

import { useEffect, useState } from 'react';
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
  const [summary, setSummary] = useState({
    totalTransactions: 0,
    totalAmount: 0,
    month: '',
  });

  useEffect(() => {
    if (isOpen && month) {
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
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {month ? `Transactions - ${formatMonth(month)}` : 'Transactions'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-500">Total Transactions</div>
                <div className="text-2xl font-bold">{summary.totalTransactions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-500">Total Spending</div>
                <div className="text-2xl font-bold">
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

          {/* Transaction Table */}
          <div className="flex-1 overflow-auto border rounded-lg">
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
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
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
      </DialogContent>
    </Dialog>
  );
}
