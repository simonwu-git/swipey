// Shared public type for an AI-detected transaction grouping.
// Imported by both the API layer (src/app/api/ask-claude/groupings/lib.ts)
// and the component layer (src/components/TransactionModal/types.ts).
export interface Grouping {
  id: string;            // stable hash of name + sorted(transactionIds)
  name: string;
  why: string;
  transactionIds: string[];
  total: number;         // absolute sum of member transactions
}
