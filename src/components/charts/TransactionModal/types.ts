export interface Transaction {
  id: string;
  date: string;
  accountId: string;
  accountName: string;
  description: string;
  category: string | null;
  amount: number;
}

// Returned by GET /api/ask-claude/groupings — AI-detected transaction groupings
// for a month. `id` is a stable hash of name + sorted(transactionIds) so the
// active selection survives re-renders. `total` is the absolute sum of the
// member transactions, computed server-side from current data (not cached).
export interface Grouping {
  id: string;
  name: string;
  why: string;
  transactionIds: string[];
  total: number;
}
