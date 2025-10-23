export interface Transaction {
  transaction_date: Date;
  post_date?: Date;
  description: string;
  category?: string;
  transaction_type?: string;
  amount: number;
  created_at?: Date;
}

export interface ParsedTransaction extends Transaction {
  isDuplicate?: boolean;
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
}

export interface BankParser {
  parseCsv(): Transaction[];
  getExpectedHeaders(): string[];
  getBankName(): string;
}

export type BankType = 'chase' | 'capital_one';
