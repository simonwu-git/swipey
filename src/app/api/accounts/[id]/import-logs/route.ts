import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accountId } = await params;

    // Verify account exists
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Fetch import logs for this account, ordered by most recent first
    const importLogs = await prisma.importLog.findMany({
      where: { accountId },
      orderBy: { importedAt: 'desc' },
    });

    return NextResponse.json(importLogs);
  } catch (error) {
    console.error('Error fetching import logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch import logs' },
      { status: 500 }
    );
  }
}
