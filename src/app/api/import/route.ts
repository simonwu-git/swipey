import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Transaction } from '@/lib/types'

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const {
      accountId,
      transactions,
      fileName
    }: {
      accountId: string
      transactions: Transaction[]
      fileName?: string
    } = body

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

    // Calculate date range
    const dates = transactions.map(t => new Date(t.transaction_date))
    const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())))
    const latestDate = new Date(Math.max(...dates.map(d => d.getTime())))

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

    // Insert all transactions
    const result = await prisma.transaction.createMany({
      data: preparedTransactions
    })

    // Get counts
    const totalProcessed = transactions.length
    const inserted = result.count
    const skipped = totalProcessed - inserted
    const processingTime = Date.now() - startTime

    // Create import log
    await prisma.importLog.create({
      data: {
        accountId,
        fileName: fileName || 'unknown.csv',
        totalRecords: totalProcessed,
        imported: inserted,
        skipped,
        earliestDate,
        latestDate,
        processingTime
      }
    })

    return NextResponse.json({
      processed: totalProcessed,
      inserted,
      skipped,
      earliestDate,
      latestDate,
      processingTime,
      fileName: fileName || 'unknown.csv'
    })
  } catch (error) {
    console.error('Error importing transactions:', error)
    return NextResponse.json(
      { error: 'Failed to import transactions' },
      { status: 500 }
    )
  }
}
