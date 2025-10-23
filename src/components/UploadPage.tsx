'use client'

import { useState } from 'react'
import { CSVDropzone } from './CSVDropzone'
import { AccountSelector } from './AccountSelector'
import { TransactionPreview } from './TransactionPreview'

export function UploadPage() {
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileUpload = async (file: File) => {
    setCsvFile(file)
    setError(null)
    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/parse-csv', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to parse CSV')
      }

      const data = await response.json()
      setTransactions(data.transactions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImport = async () => {
    if (!selectedAccount || transactions.length === 0) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: selectedAccount,
          transactions,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to import transactions')
      }

      const result = await response.json()
      alert(`Import completed! Inserted: ${result.inserted}, Skipped: ${result.skipped}`)
      
      // Reset form
      setCsvFile(null)
      setTransactions([])
      setSelectedAccount('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Select Account
        </h2>
        <AccountSelector
          value={selectedAccount}
          onChange={setSelectedAccount}
          disabled={isLoading}
        />
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Upload CSV File
        </h2>
        <CSVDropzone
          onFileUpload={handleFileUpload}
          disabled={!selectedAccount || isLoading}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Transaction Preview
          </h2>
          <TransactionPreview transactions={transactions} />
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleImport}
              disabled={!selectedAccount || isLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Importing...' : 'Confirm Import'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
