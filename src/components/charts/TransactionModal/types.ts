export interface Transaction {
  id: string;
  date: string;
  accountId: string;
  accountName: string;
  description: string;
  category: string | null;
  amount: number;
}
