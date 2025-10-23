import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Transaction } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountId, transactions }: { accountId: string; transactions: Transaction[] } = body

    if (!accountId || !transactions || transactions.length === 0) {
      return NextResponse.json(
        { error: 'Missing accountId or transactions' },
        { status: 400 }
      )
    }

    // Verify account exists
    const account = await prisma.account.findUnique({
      where: { id: accountId }
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Prepare transactions for database insertion
    const preparedTransactions = transactions.map(transaction => ({
      transactionDate: new Date(transaction.transaction_date),
      postDate: transaction.post_date ? new Date(transaction.post_date) : null,
      description: transaction.description,
      category: transaction.category || null,
      transactionType: transaction.transaction_type || null,
      amount: transaction.amount,
      accountId: accountId
    }))

    // Insert transactions with skipDuplicates
    const result = await prisma.transaction.createMany({
      data: preparedTransactions,
      skipDuplicates: true
    })

    // Get counts
    const totalProcessed = transactions.length
    const inserted = result.count
    const skipped = totalProcessed - inserted

    return NextResponse.json({
      processed: totalProcessed,
      inserted,
      skipped
    })
  } catch (error) {
    console.error('Error importing transactions:', error)
    return NextResponse.json(
      { error: 'Failed to import transactions' },
      { status: 500 }
    )
  }
}
