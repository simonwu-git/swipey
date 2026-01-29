import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const getPreviousMonth = (year: number, monthNum: number) => {
  const date = new Date(year, monthNum - 2); // -1 for 0-index, -1 for previous
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month'); // YYYY-MM format
    const accountId = searchParams.get('accountId'); // optional

    if (!month) {
      return NextResponse.json(
        { error: 'Month parameter is required' },
        { status: 400 }
      );
    }

    // Parse month to get start and end dates
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

    // Build query filters
    const whereClause: any = {
      transactionDate: {
        gte: startDate,
        lte: endDate,
      },
      transactionType: {
        notIn: ['Payment', 'Credit'],
      },
    };

    // Add account filter if provided
    if (accountId) {
      whereClause.accountId = accountId;
    }

    // Calculate previous month dates
    const prev = getPreviousMonth(year, monthNum);
    const prevStartDate = new Date(prev.year, prev.month - 1, 1);
    const prevEndDate = new Date(prev.year, prev.month, 0, 23, 59, 59, 999);

    // Build previous month query (same filters, different dates)
    const prevWhereClause: any = {
      transactionDate: {
        gte: prevStartDate,
        lte: prevEndDate,
      },
      transactionType: {
        notIn: ['Payment', 'Credit'],
      },
    };

    if (accountId) {
      prevWhereClause.accountId = accountId;
    }

    // Fetch transactions and previous month total in parallel
    const [transactions, prevResult] = await Promise.all([
      prisma.transaction.findMany({
        where: whereClause,
        include: {
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
      }),
      prisma.transaction.aggregate({
        where: prevWhereClause,
        _sum: { amount: true },
      }),
    ]);

    const previousMonthTotal = prevResult._sum.amount
      ? Math.abs(Number(prevResult._sum.amount))
      : null;

    // Calculate totals
    const totalAmount = transactions.reduce(
      (sum, t) => sum + Math.abs(Number(t.amount)),
      0
    );

    return NextResponse.json({
      transactions: transactions.map(t => ({
        id: t.id,
        date: t.transactionDate,
        accountId: t.account.id,
        accountName: t.account.name,
        description: t.description,
        category: t.category,
        amount: Math.abs(Number(t.amount)),
      })),
      summary: {
        totalTransactions: transactions.length,
        totalAmount,
        previousMonthTotal,
        month,
      },
    });
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction details' },
      { status: 500 }
    );
  }
}
