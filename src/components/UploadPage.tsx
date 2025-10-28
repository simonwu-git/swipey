'use client'

import { useState } from 'react'
import { CSVDropzone } from './CSVDropzone'
import { AccountSelector } from './AccountSelector'
import { TransactionPreview } from './TransactionPreview'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ImportResult } from '@/lib/types'

export function UploadPage() {
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [transactions, setTransactions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  const handleFileUpload = async (file: File) => {
    setCsvFile(file)
    setError(null)
    setIsLoading(true)
    setImportResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('accountId', selectedAccount)

      const response = await fetch('/api/parse-csv', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to parse CSV')
      }

      const data = await response.json()
      setTransactions(data.transactions)
      setFileName(data.fileName)
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
          fileName,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to import transactions')
      }

      const result: ImportResult = await response.json()
      setImportResult(result)

      // Reset form after showing result
      setCsvFile(null)
      setTransactions([])
      setFileName('')
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

      {importResult && (
        <Alert>
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-semibold text-lg">Import Completed Successfully!</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium">File:</span> {importResult.fileName}
                </div>
                <div>
                  <span className="font-medium">Total Records:</span> {importResult.processed}
                </div>
                <div>
                  <span className="font-medium text-green-600">Imported:</span>{' '}
                  {importResult.inserted}
                </div>
                <div>
                  <span className="font-medium text-orange-600">Skipped:</span>{' '}
                  {importResult.skipped}
                </div>
                {importResult.earliestDate && importResult.latestDate && (
                  <>
                    <div>
                      <span className="font-medium">Date Range:</span>{' '}
                      {new Date(importResult.earliestDate).toLocaleDateString()} -{' '}
                      {new Date(importResult.latestDate).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Processing Time:</span>{' '}
                      {importResult.processingTime}ms
                    </div>
                  </>
                )}
              </div>
            </div>
          </AlertDescription>
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
