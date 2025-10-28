'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface Transaction {
  transaction_date: string
  post_date?: string
  description: string
  category?: string
  transaction_type?: string
  amount: number
}

interface TransactionPreviewProps {
  transactions: Transaction[]
}

export function TransactionPreview({ transactions }: TransactionPreviewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {transactions.length} transactions
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction, index) => (
              <TableRow key={index}>
                <TableCell className="whitespace-nowrap">
                  {new Date(transaction.transaction_date).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {transaction.description}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {transaction.category || '-'}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {transaction.transaction_type || '-'}
                </TableCell>
                <TableCell className={cn(
                  'whitespace-nowrap font-medium',
                  transaction.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                )}>
                  ${transaction.amount.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
