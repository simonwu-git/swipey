'use client'

import { useState } from 'react'
import { CSVDropzone } from './CSVDropzone'
import { AccountSelector } from './AccountSelector'
import { TransactionPreview } from './TransactionPreview'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

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
      <Card>
        <CardHeader>
          <CardTitle>Select Account</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountSelector
            value={selectedAccount}
            onChange={setSelectedAccount}
            disabled={isLoading}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
        </CardHeader>
        <CardContent>
          <CSVDropzone
            onFileUpload={handleFileUpload}
            disabled={!selectedAccount || isLoading}
          />
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionPreview transactions={transactions} />

            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleImport}
                disabled={!selectedAccount || isLoading}
              >
                {isLoading ? 'Importing...' : 'Confirm Import'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
