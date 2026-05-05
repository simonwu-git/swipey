import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { streamClaudeDeltas } from '@/lib/claudeStream'
import { buildNdjsonStream } from '@/lib/ndjson'

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

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
      include: { account: { select: { id: true, name: true } } },
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

  const totalAmount = transactions.reduce(
    (sum, t) => sum + Math.abs(Number(t.amount)),
    0,
  )
  const previousMonthTotal = prevResult._sum.amount
    ? Math.abs(Number(prevResult._sum.amount))
    : null

  const monthLabel = `${MONTH_NAMES[monthNum - 1]} ${year}`
  const prevMonthLabel = `${MONTH_NAMES[prev.month - 1]} ${prev.year}`

  const rows = transactions.map((t) => {
    const date = new Date(t.transactionDate).toISOString().slice(0, 10)
    const acct = t.account.name
    const desc = t.description.slice(0, 30)
    const cat = (t.category ?? 'Uncategorized').slice(0, 20)
    const amt = `$${Math.abs(Number(t.amount)).toFixed(2)}`
    return `${date} | ${acct} | ${desc} | ${cat} | ${amt}`
  })

  const prevLine = previousMonthTotal != null
    ? `Previous month (${prevMonthLabel}): $${previousMonthTotal.toFixed(2)}`
    : `Previous month (${prevMonthLabel}): no data`

  const prompt = [
    `Here are some financial transactions for ${monthLabel}:`,
    '',
    `Total: $${totalAmount.toFixed(2)} across ${transactions.length} transactions`,
    prevLine,
    '',
    'Date       | Account | Description                    | Category             | Amount',
    ...rows,
    '',
    'Analyze the spending for this month. Structure your response using these exact section labels, each on its own line:',
    '',
    '[SUMMARY]',
    'One sentence overall takeaway for the month',
    '',
    '[PATTERNS]',
    'Notable patterns or unusual spending (2-3 bullet points)',
    '',
    '[COMPARISON]',
    'Brief comparison to previous month (1-2 sentences)',
    '',
    '[SUGGESTIONS]',
    'Actionable suggestions (2-3 bullet points)',
    '',
    'Use the section labels exactly as shown. Keep each section concise.',
  ].join('\n')

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
      // Cache miss — stream live from Claude CLI.
      const claudeStart = Date.now()
      console.log(`[ask-claude] Streaming Claude CLI for ${month}...`)

      let fullText = ''
      try {
        for await (const text of streamClaudeDeltas(prompt, ac.signal)) {
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
