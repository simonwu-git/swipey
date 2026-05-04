// AI-backed transaction-grouping endpoint.
//
// GET /api/ask-claude/groupings?month=YYYY-MM[&refresh=true]
//
// Calls Claude (via runClaudeOnce, buffering the stream) to detect up to 3
// interesting groupings of the month's transactions and returns them as
// structured JSON. Cached by month on `MonthlyInsight.groupings` so re-opening
// the Groups tab doesn't pay the model cost again.
//
// All pure logic — schemas, prompt format, parsing, enrichment — lives in
// ./lib.ts. This file owns HTTP plumbing, the Prisma transaction load, the
// Claude invocation, and cache I/O.
//
// Response: 200 { groupings: Grouping[], cached: boolean }
//           400 bad month
//           404 no transactions for month
//           502 model returned unparseable output
//           500 unexpected

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { runClaudeOnce } from '@/lib/claudeStream'
import {
  CachedGroupingsArraySchema,
  buildGroupingsPrompt,
  enrichForResponse,
  modelToCached,
  parseModelOutput,
  type PromptTransaction,
} from './lib'

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

async function loadMonthTransactions(month: string): Promise<PromptTransaction[]> {
  const [year, monthNum] = month.split('-').map(Number)
  const startDate = new Date(year, monthNum - 1, 1)
  const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999)

  const where: Prisma.TransactionWhereInput = {
    transactionDate: { gte: startDate, lte: endDate },
    transactionType: { notIn: ['Payment', 'Credit'] },
  }

  const rows = await prisma.transaction.findMany({
    where,
    include: { account: { select: { name: true } } },
    // Tiebreaker on id makes the index→ID mapping fully deterministic across calls.
    orderBy: [{ transactionDate: 'asc' }, { id: 'asc' }],
  })

  return rows.map((r) => ({
    id: r.id,
    date: r.transactionDate,
    amount: Math.abs(Number(r.amount)),
    description: r.description,
    accountName: r.account.name,
  }))
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const month = sp.get('month')

    if (!month) {
      return NextResponse.json(
        { error: 'month query parameter is required (YYYY-MM)' },
        { status: 400 },
      )
    }
    if (!MONTH_RE.test(month)) {
      return NextResponse.json(
        { error: 'month must be in YYYY-MM format' },
        { status: 400 },
      )
    }

    const refresh = sp.get('refresh') === 'true'
    console.log(`[groupings] Request for month=${month}${refresh ? ' (refresh)' : ''}`)

    const transactions = await loadMonthTransactions(month)
    if (transactions.length === 0) {
      return NextResponse.json(
        { error: `No transactions found for ${month}` },
        { status: 404 },
      )
    }

    const { prompt, orderedIds, totalAmount, amountsById } = buildGroupingsPrompt(month, transactions)
    const knownIds = new Set(orderedIds)

    // Cache hit path: cache stores resolved transaction IDs (not indices), so
    // it stays valid even if the underlying transaction order changes.
    if (!refresh) {
      const cached = await prisma.monthlyInsight.findUnique({ where: { month } })
      if (cached?.groupings) {
        try {
          const parsed = CachedGroupingsArraySchema.parse(JSON.parse(cached.groupings))
          const { enriched } = enrichForResponse(parsed, knownIds, amountsById)
          console.log(`[groupings] Cache hit for ${month} (${enriched.length} groups)`)
          return NextResponse.json({ groupings: enriched, cached: true })
        } catch (err) {
          console.warn(`[groupings] Cached payload for ${month} failed validation, regenerating:`, err)
          // fall through to live path
        }
      }
    }

    // Live path
    const claudeStart = Date.now()
    console.log(`[groupings] Calling Claude for ${month}...`)
    const fullText = await runClaudeOnce(prompt)
    const elapsed = ((Date.now() - claudeStart) / 1000).toFixed(2)
    console.log(`[groupings] Claude returned ${fullText.length} chars in ${elapsed}s`)

    let modelOutput
    try {
      modelOutput = parseModelOutput(fullText)
    } catch (err) {
      console.error(`[groupings] Failed to parse model output for ${month}:`, err)
      const message = err instanceof Error ? err.message : 'Unknown parse error'
      return NextResponse.json(
        {
          error: 'Model returned unparseable groupings',
          details: message,
          ...(process.env.NODE_ENV !== 'production' ? { raw: fullText } : {}),
        },
        { status: 502 },
      )
    }

    const cachedShape = modelToCached(modelOutput, orderedIds)
    const { clean, enriched } = enrichForResponse(cachedShape, knownIds, amountsById)
    console.log(`[groupings] ${modelOutput.length} model groupings → ${enriched.length} after sanitize`)

    try {
      await prisma.monthlyInsight.upsert({
        where: { month },
        update: { groupings: JSON.stringify(clean), totalAmount },
        create: { month, groupings: JSON.stringify(clean), totalAmount },
      })
    } catch (err) {
      console.error('[groupings] cache upsert failed:', err)
    }

    return NextResponse.json({ groupings: enriched, cached: false })
  } catch (error) {
    console.error('[groupings]', error)
    return NextResponse.json(
      {
        error: 'Failed to compute groupings',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 },
    )
  }
}
