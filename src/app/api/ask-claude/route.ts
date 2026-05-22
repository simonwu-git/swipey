import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getProvider } from '@/lib/aiProvider'
import { buildNdjsonStream } from '@/lib/ndjson'
import { buildInsightsPrompt, type PromptTransaction } from './lib'

const SYSTEM_PROMPT =
  'You are a financial-analysis assistant. Output exclusively the format shown in the <output> tags. Use the four section labels verbatim. No preamble, no extra text.'

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

function getPreviousMonth(year: number, monthNum: number) {
  const date = new Date(year, monthNum - 2)
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

interface PreparedRequest {
  month: string
  totalAmount: number
  prompt: string
}

type PrepareResult =
  | { ok: true; prepared: PreparedRequest }
  | { ok: false; status: number; error: string }

async function prepareRequest(month: string): Promise<PrepareResult> {
  const [year, monthNum] = month.split('-').map(Number)
  const startDate = new Date(year, monthNum - 1, 1)
  const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999)

  const whereClause: Prisma.TransactionWhereInput = {
    transactionDate: { gte: startDate, lte: endDate },
    transactionType: { notIn: ['Payment', 'Credit'] },
  }

  const prev = getPreviousMonth(year, monthNum)
  const prevStartDate = new Date(prev.year, prev.month - 1, 1)
  const prevEndDate = new Date(prev.year, prev.month, 0, 23, 59, 59, 999)

  const prevWhereClause: Prisma.TransactionWhereInput = {
    transactionDate: { gte: prevStartDate, lte: prevEndDate },
    transactionType: { notIn: ['Payment', 'Credit'] },
  }

  const [transactions, prevResult] = await Promise.all([
    prisma.transaction.findMany({
      where: whereClause,
      include: { account: { select: { name: true } } },
      orderBy: { transactionDate: 'asc' },
    }),
    prisma.transaction.aggregate({
      where: prevWhereClause,
      _sum: { amount: true },
    }),
  ])

  if (transactions.length === 0) {
    return { ok: false, status: 404, error: `No transactions found for ${month}` }
  }

  const previousMonthTotal = prevResult._sum.amount
    ? Math.abs(Number(prevResult._sum.amount))
    : null

  const promptTransactions: PromptTransaction[] = transactions.map((t) => ({
    transactionDate: t.transactionDate,
    description: t.description,
    amount: Number(t.amount),
    category: t.category,
    accountName: t.account.name,
  }))

  const { prompt, totalAmount } = buildInsightsPrompt(month, promptTransactions, previousMonthTotal)

  return { ok: true, prepared: { month, totalAmount, prompt } }
}

// Build an NDJSON streaming response. Emits typed events:
//   {type:"meta", month, totalAmount, cached}
//   {type:"delta", text}
//   {type:"done"}
//   {type:"error", message}
function buildStreamResponse(opts: {
  month: string
  totalAmount: number
  cachedAnswer: string | null
  prompt: string | null
}): Response {
  const { month, totalAmount, cachedAnswer, prompt } = opts
  return buildNdjsonStream(async (enqueue, ac) => {
    enqueue({ type: 'meta', month, totalAmount, cached: cachedAnswer !== null })

    if (cachedAnswer !== null) {
      // Cache hit — replay the full answer as a single delta.
      enqueue({ type: 'delta', text: cachedAnswer })
      enqueue({ type: 'done' })
    } else if (prompt) {
      // Cache miss — stream live from the configured AI provider.
      const claudeStart = Date.now()
      console.log(`[ask-claude] Streaming ${process.env.WORKERS_AI_MODEL} for ${month}...`)

      let fullText = ''
      try {
        for await (const text of getProvider().streamTextDeltas({ prompt, system: SYSTEM_PROMPT, signal: ac.signal })) {
          fullText += text
          enqueue({ type: 'delta', text })
        }

        if (fullText) {
          try {
            await prisma.monthlyInsight.upsert({
              where: { month },
              update: { answer: fullText, totalAmount },
              create: { month, answer: fullText, totalAmount },
            })
          } catch (err) {
            console.error('[ask-claude] cache upsert failed:', err)
          }
        }

        const elapsed = ((Date.now() - claudeStart) / 1000).toFixed(2)
        console.log(`[ask-claude] Streaming done for ${month} in ${elapsed}s`)
        enqueue({ type: 'done' })
      } catch (err) {
        if (!ac.signal.aborted) {
          console.error('[ask-claude] stream error:', err)
          enqueue({
            type: 'error',
            message: err instanceof Error ? err.message : 'Unknown error',
          })
        }
      }
    }
  })
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get('month')

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

    const refresh = searchParams.get('refresh') === 'true'

    console.log(`[ask-claude] Request for month=${month}${refresh ? ' (refresh)' : ''}`)
    const startTime = Date.now()

    if (!refresh) {
      const cached = await prisma.monthlyInsight.findUnique({ where: { month } })
      // Row may exist with only `groupings` populated (from /api/ask-claude/groupings).
      // Treat it as a cache miss for insights and fall through to the live model call.
      if (cached?.answer != null) {
        console.log(`[ask-claude] Cache hit for ${month}`)
        return buildStreamResponse({
          month: cached.month,
          totalAmount: Number(cached.totalAmount),
          cachedAnswer: cached.answer,
          prompt: null,
        })
      }
    }

    const prep = await prepareRequest(month)
    if (!prep.ok) {
      return NextResponse.json({ error: prep.error }, { status: prep.status })
    }

    console.log(`[ask-claude] Prepared prompt in ${((Date.now() - startTime) / 1000).toFixed(2)}s`)

    return buildStreamResponse({
      month,
      totalAmount: prep.prepared.totalAmount,
      cachedAnswer: null,
      prompt: prep.prepared.prompt,
    })
  } catch (error) {
    console.error('[ask-claude]', error)
    return NextResponse.json(
      { error: 'Failed to call Claude', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 },
    )
  }
}
