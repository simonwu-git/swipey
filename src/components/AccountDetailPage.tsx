'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Account, ImportLog, ImportResult } from '@/lib/types';
import { ArrowLeft, FileText, Calendar, Clock, CheckCircle, XCircle, Upload } from 'lucide-react';
import { CSVDropzone } from './CSVDropzone';
import { TransactionPreview } from './TransactionPreview';
import { BankLogo } from './BankLogo';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AccountDetailPageProps {
  accountId: string;
}

export default function AccountDetailPage({ accountId }: AccountDetailPageProps) {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // CSV Upload state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    fetchAccountData();
  }, [accountId]);

  const fetchAccountData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch account details
      const accountResponse = await fetch(`/api/accounts`);
      if (!accountResponse.ok) {
        throw new Error('Failed to fetch account');
      }
      const accounts: Account[] = await accountResponse.json();
      const foundAccount = accounts.find((a) => a.id === accountId);

      if (!foundAccount) {
        throw new Error('Account not found');
      }
      setAccount(foundAccount);

      // Fetch import logs
      const logsResponse = await fetch(`/api/accounts/${accountId}/import-logs`);
      if (!logsResponse.ok) {
        throw new Error('Failed to fetch import logs');
      }
      const logs: ImportLog[] = await logsResponse.json();
      setImportLogs(logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setCsvFile(file);
    setUploadError(null);
    setIsUploading(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('accountId', accountId);

      const response = await fetch('/api/parse-csv', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to parse CSV');
      }

      const data = await response.json();
      setTransactions(data.transactions);
      setFileName(data.fileName);
      setShowPreviewModal(true);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImport = async () => {
    if (transactions.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId,
          transactions,
          fileName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to import transactions');
      }

      const result: ImportResult = await response.json();
      setImportResult(result);

      // Reset form and close modal
      setCsvFile(null);
      setTransactions([]);
      setFileName('');
      setShowPreviewModal(false);

      // Refresh import logs to show the new import
      const logsResponse = await fetch(`/api/accounts/${accountId}/import-logs`);
      if (logsResponse.ok) {
        const logs: ImportLog[] = await logsResponse.json();
        setImportLogs(logs);
      }

      // Auto-dismiss success message after 5 seconds
      setTimeout(() => {
        setImportResult(null);
      }, 5000);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelPreview = () => {
    setShowPreviewModal(false);
    setCsvFile(null);
    setTransactions([]);
    setFileName('');
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateRange = (earliest: string | Date, latest: string | Date) => {
    const start = new Date(earliest).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const end = new Date(latest).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${start} - ${end}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading account details...</p>
        </div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || 'Account not found'}</p>
          <button
            onClick={() => router.push('/accounts')}
            className="text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Back to Accounts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/accounts')}
            className="flex items-center text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Accounts
          </button>

          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <div className="flex items-center">
              <BankLogo bankType={account.bankType} size={56} />
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-foreground">{account.name}</h1>
                <p className="text-muted-foreground">
                  {account.bankType.replace('_', ' ').toUpperCase()} • {account.tableKey}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Transactions Section */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
          <div className="flex items-center mb-4">
            <Upload className="h-5 w-5 text-muted-foreground mr-2" />
            <h2 className="text-lg font-semibold text-foreground">Upload Transactions</h2>
          </div>
          <CSVDropzone
            onFileUpload={handleFileUpload}
            disabled={isUploading}
          />
        </div>

        {/* Success/Error Alerts */}
        {uploadError && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        )}

        {importResult && (
          <Alert className="mb-6 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
            <AlertDescription className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-500" />
                <span className="font-medium text-green-900 dark:text-green-200">
                  Successfully imported {importResult.inserted} transaction{importResult.inserted !== 1 ? 's' : ''} from {importResult.fileName}
                  {importResult.skipped > 0 && (
                    <span className="text-orange-600 dark:text-orange-400 ml-1">
                      ({importResult.skipped} skipped)
                    </span>
                  )}
                </span>
              </div>
              <button
                onClick={() => setImportResult(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* Transaction Preview Modal */}
        <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
          <DialogContent className="!max-w-[50vw] sm:!max-w-[80vw] w-full max-h-[90vh] overflow-hidden flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle>Transaction Preview</DialogTitle>
              <DialogDescription>
                Review the transactions below before importing. File: {fileName}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-auto px-6 py-4">
              <TransactionPreview transactions={transactions} />
            </div>

            <DialogFooter className="px-6 pb-6 pt-2">
              <Button
                variant="outline"
                onClick={handleCancelPreview}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={isUploading}
              >
                {isUploading ? 'Importing...' : 'Confirm Import'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Logs Section */}
        <div className="bg-card rounded-lg shadow-sm border border-border">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Import History
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {importLogs.length} {importLogs.length === 1 ? 'import' : 'imports'} recorded
            </p>
          </div>

          {importLogs.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <FileText className="h-12 w-12 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No imports yet</h3>
              <p className="text-muted-foreground">
                Import logs will appear here when you upload transactions for this account.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {importLogs.map((log) => (
                <div key={log.id} className="px-6 py-4 hover:bg-muted transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <FileText className="h-5 w-5 text-muted-foreground mr-2" />
                        <h3 className="font-medium text-foreground">{log.fileName}</h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                        {/* Import Stats */}
                        <div>
                          <p className="text-xs text-muted-foreground/70 mb-1">Records</p>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-500 mr-1" />
                              <span className="text-sm font-medium text-green-600 dark:text-green-500">
                                {log.imported} imported
                              </span>
                            </div>
                            {log.skipped > 0 && (
                              <div className="flex items-center">
                                <XCircle className="h-4 w-4 text-orange-600 dark:text-orange-500 mr-1" />
                                <span className="text-sm font-medium text-orange-600 dark:text-orange-500">
                                  {log.skipped} skipped
                                </span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            Total: {log.totalRecords}
                          </p>
                        </div>

                        {/* Date Range */}
                        <div>
                          <p className="text-xs text-muted-foreground/70 mb-1">Transaction Period</p>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 text-muted-foreground mr-1" />
                            <span className="text-sm text-foreground">
                              {formatDateRange(log.earliestDate, log.latestDate)}
                            </span>
                          </div>
                        </div>

                        {/* Import Time */}
                        <div>
                          <p className="text-xs text-muted-foreground/70 mb-1">Imported At</p>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-muted-foreground mr-1" />
                            <span className="text-sm text-foreground">
                              {formatDate(log.importedAt)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            Processed in {log.processingTime}ms
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
