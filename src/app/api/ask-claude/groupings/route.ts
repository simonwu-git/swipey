// AI-backed transaction-grouping endpoint.
//
// GET /api/ask-claude/groupings?month=YYYY-MM[&refresh=true]
//
// Streams Claude's groupings incrementally as NDJSON so the first card
// appears within ~5–10s instead of waiting for the full ~30s response.
// Cached by month on `MonthlyInsight.groupings`; cache hits replay instantly
// through the same event protocol so the client code stays uniform.
//
// Event protocol (one JSON object per line):
//   {type:"meta", month, cached:boolean}
//   {type:"grouping", data: Grouping}
//   {type:"done"}
//   {type:"error", message}
//
// Pre-stream errors (bad month, no transactions) return plain JSON:
//   400 bad month / 404 no transactions

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getProvider } from '@/lib/aiProvider'
import { buildNdjsonStream } from '@/lib/ndjson'
import {
  CachedGroupingsArraySchema,
  MAX_GROUPINGS,
  buildGroupingsPrompt,
  enrichOne,
  hashGroupingId,
  parseGroupingStream,
  type CachedGrouping,
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

  // Cache hit path — replay stored groupings through the same event protocol.
  if (!refresh) {
    const cached = await prisma.monthlyInsight.findUnique({ where: { month } })
    if (cached?.groupings) {
      try {
        const parsed = CachedGroupingsArraySchema.parse(JSON.parse(cached.groupings))
        console.log(`[groupings] Cache hit for ${month} (${parsed.length} groups)`)
        return buildNdjsonStream(async (enqueue) => {
          enqueue({ type: 'meta', month, cached: true })
          let emitted = 0
          for (const g of parsed) {
            if (emitted >= MAX_GROUPINGS) break
            const enriched = enrichOne(g, knownIds, amountsById)
            if (!enriched) continue
            enqueue({ type: 'grouping', data: enriched })
            emitted++
          }
          enqueue({ type: 'done' })
        })
      } catch (err) {
        console.warn(`[groupings] Cached payload for ${month} failed validation, regenerating:`, err)
        // fall through to live path
      }
    }
  }

  // Live streaming path — stream Claude deltas, parse JSONL lines as they arrive.
  const claudeStart = Date.now()
  console.log(`[groupings] Streaming ${process.env.WORKERS_AI_MODEL} for ${month}...`)

  return buildNdjsonStream(async (enqueue, ac) => {
    enqueue({ type: 'meta', month, cached: false })

    const cleanArray: CachedGrouping[] = []

    try {
      for await (const { grouping, cached } of parseGroupingStream(
        getProvider().streamTextDeltas({
          prompt,
          system: 'You are a JSON-only assistant. Output exclusively the format shown in <output> tags. No explanations, no extra text.',
          signal: ac.signal,
        }), orderedIds, knownIds, amountsById,
      )) {
        cleanArray.push(cached)
        enqueue({ type: 'grouping', data: grouping })
      }

      const elapsed = ((Date.now() - claudeStart) / 1000).toFixed(2)
      console.log(`[groupings] Stream done for ${month} in ${elapsed}s — ${cleanArray.length} groups`)

      // Persist to cache.
      if (cleanArray.length > 0) {
        try {
          await prisma.monthlyInsight.upsert({
            where: { month },
            update: { groupings: JSON.stringify(cleanArray), totalAmount },
            create: { month, groupings: JSON.stringify(cleanArray), totalAmount },
          })
        } catch (err) {
          console.error('[groupings] cache upsert failed:', err)
        }
      }

      enqueue({ type: 'done' })
    } catch (err) {
      if (!ac.signal.aborted) {
        console.error('[groupings] stream error:', err)
        enqueue({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
      }
    }
  })
}

// PATCH /api/ask-claude/groupings
// Body: { month: "YYYY-MM", groupingId: string, transactionIds: string[] }
// Updates the membership of a single grouping (user correction of AI result).
export async function PATCH(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { month, groupingId, transactionIds } = body as Record<string, unknown>

  if (typeof month !== 'string' || !MONTH_RE.test(month)) {
    return NextResponse.json({ error: 'month must be in YYYY-MM format' }, { status: 400 })
  }
  if (typeof groupingId !== 'string' || !groupingId) {
    return NextResponse.json({ error: 'groupingId is required' }, { status: 400 })
  }
  if (!Array.isArray(transactionIds) || transactionIds.some((id) => typeof id !== 'string')) {
    return NextResponse.json({ error: 'transactionIds must be an array of strings' }, { status: 400 })
  }
  const dedupedIds = [...new Set(transactionIds as string[])]
  if (dedupedIds.length < 2) {
    return NextResponse.json({ error: 'A group must have at least 2 transactions' }, { status: 400 })
  }

  // Load and find the target grouping.
  const row = await prisma.monthlyInsight.findUnique({ where: { month } })
  if (!row?.groupings) {
    return NextResponse.json({ error: 'No groupings found for this month' }, { status: 404 })
  }

  let cached: CachedGrouping[]
  try {
    cached = CachedGroupingsArraySchema.parse(JSON.parse(row.groupings))
  } catch {
    return NextResponse.json({ error: 'Stored groupings are malformed' }, { status: 500 })
  }

  const targetIndex = cached.findIndex((g) => hashGroupingId(g) === groupingId)
  if (targetIndex === -1) {
    return NextResponse.json(
      { error: 'Grouping not found — it may have changed, please refresh' },
      { status: 404 },
    )
  }

  // Validate submitted ids belong to this month's transactions.
  const monthTransactions = await loadMonthTransactions(month)
  const knownIds = new Set(monthTransactions.map((t) => t.id))
  const amountsById = new Map(monthTransactions.map((t) => [t.id, t.amount]))
  const unknown = dedupedIds.filter((id) => !knownIds.has(id))
  if (unknown.length > 0) {
    return NextResponse.json(
      { error: `Unknown transaction ids: ${unknown.join(', ')}` },
      { status: 400 },
    )
  }

  // storedEntry is what goes in the DB (CachedGrouping — no derived id/total).
  // enriched is what the client gets back (Grouping — adds computed id + total).
  // This mirrors the GET path: store bare shape, compute derived fields on read.
  const storedEntry: CachedGrouping = { ...cached[targetIndex], transactionIds: dedupedIds }
  const enriched = enrichOne(storedEntry, knownIds, amountsById)
  if (!enriched) {
    return NextResponse.json({ error: 'A group must have at least 2 valid transactions' }, { status: 400 })
  }

  const updatedArray = [...cached]
  updatedArray[targetIndex] = storedEntry
  await prisma.monthlyInsight.update({
    where: { month },
    data: { groupings: JSON.stringify(updatedArray) },
  })

  return NextResponse.json({ grouping: enriched })
}
