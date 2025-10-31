import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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

    // Fetch transactions
    const transactions = await prisma.transaction.findMany({
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
        transactionDate: 'desc',
      },
    });

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
