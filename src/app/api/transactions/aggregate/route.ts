import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface Transaction {
  transactionDate: Date;
  amount: any;
  account: {
    id: string;
    name: string;
  };
}

interface MonthlyAccountData {
  month: string;
  [accountName: string]: string | number;
}

export async function GET() {
  try {
    // Fetch all transactions from all accounts, excluding 'Payment' and 'Credit' types
    const transactions = await prisma.transaction.findMany({
      where: {
        transactionType: {
          notIn: ['Payment', 'Credit'],
        },
      },
      select: {
        transactionDate: true,
        amount: true,
        account: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        transactionDate: 'asc',
      },
    });

    if (transactions.length === 0) {
      return NextResponse.json({ data: [], accounts: [] });
    }

    // Get unique accounts
    const accountsMap = new Map<string, string>();
    transactions.forEach((t: Transaction) => {
      accountsMap.set(t.account.id, t.account.name);
    });
    const accounts = Array.from(accountsMap.values());

    // Group transactions by month and account
    const monthlyDataMap = new Map<string, Record<string, number>>();

    transactions.forEach((transaction: Transaction) => {
      const month = transaction.transactionDate.toISOString().slice(0, 7); // YYYY-MM format
      const accountName = transaction.account.name;

      if (!monthlyDataMap.has(month)) {
        monthlyDataMap.set(month, {});
      }

      const monthData = monthlyDataMap.get(month)!;
      if (!monthData[accountName]) {
        monthData[accountName] = 0;
      }

      monthData[accountName] += Math.abs(Number(transaction.amount));
    });

    // Convert to array format and fill missing account data with 0
    const result: MonthlyAccountData[] = Array.from(monthlyDataMap.entries())
      .map(([month, accountData]) => {
        const monthEntry: MonthlyAccountData = { month };
        // Ensure all accounts have a value for this month (0 if no data)
        accounts.forEach(accountName => {
          monthEntry[accountName] = accountData[accountName] || 0;
        });
        return monthEntry;
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    return NextResponse.json({ data: result, accounts });
  } catch (error) {
    console.error('Error fetching aggregate transaction data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch aggregate data' },
      { status: 500 }
    );
  }
}
