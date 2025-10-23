'use client'

import { useState } from 'react'

interface Transaction {
  transaction_date: string
  post_date?: string
  description: string
  category?: string
  transaction_type?: string
  amount: number
  isDuplicate?: boolean
}

interface TransactionPreviewProps {
  transactions: Transaction[]
}

export function TransactionPreview({ transactions }: TransactionPreviewProps) {
  const [showDuplicates, setShowDuplicates] = useState(true)
  const [filterDuplicates, setFilterDuplicates] = useState(false)

  const duplicateCount = transactions.filter(t => t.isDuplicate).length
  const filteredTransactions = filterDuplicates 
    ? transactions.filter(t => !t.isDuplicate)
    : transactions

  const displayTransactions = showDuplicates 
    ? filteredTransactions 
    : filteredTransactions.filter(t => !t.isDuplicate)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showDuplicates}
              onChange={(e) => setShowDuplicates(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Show duplicates</span>
          </label>
          
          {duplicateCount > 0 && (
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filterDuplicates}
                onChange={(e) => setFilterDuplicates(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Hide duplicates</span>
            </label>
          )}
        </div>

        <div className="text-sm text-gray-600">
          {duplicateCount > 0 && (
            <span className="text-orange-600 font-medium">
              {duplicateCount} duplicates found
            </span>
          )}
          <span className="ml-2">
            Showing {displayTransactions.length} of {transactions.length} transactions
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayTransactions.map((transaction, index) => (
              <tr
                key={index}
                className={transaction.isDuplicate ? 'bg-red-50' : ''}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(transaction.transaction_date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {transaction.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {transaction.category || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {transaction.transaction_type || '-'}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                  transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${transaction.amount.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
