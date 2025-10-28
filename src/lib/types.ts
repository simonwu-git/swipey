export interface Transaction {
  transaction_date: Date;
  post_date?: Date;
  description: string;
  category?: string;
  transaction_type?: string;
  amount: number;
  created_at?: Date;
}

export interface Account {
  id: string;
  name: string;
  tableKey: string;
  bankType: string;
  createdAt: Date;
}

export interface ImportResult {
  processed: number;
  inserted: number;
  skipped: number;
  earliestDate?: Date;
  latestDate?: Date;
  processingTime?: number;
  fileName?: string;
}

export interface ImportLog {
  id: string;
  accountId: string;
  fileName: string;
  totalRecords: number;
  imported: number;
  skipped: number;
  earliestDate: Date;
  latestDate: Date;
  processingTime: number;
  importedAt: Date;
}

export interface ParseResult {
  transactions: Transaction[];
  fileName: string;
}

export interface BankParser {
  parseCsv(): Transaction[];
  getExpectedHeaders(): string[];
  getBankName(): string;
}

export type BankType = 'chase' | 'capital_one';
