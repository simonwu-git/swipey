import { NextRequest, NextResponse } from 'next/server'
import { spawn, type ChildProcess } from 'child_process'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { extractTextDelta } from '@/lib/claudeStream'

const CLAUDE_PATH = '/Users/simonwu/.local/bin/claude'

// Using spawn with stdin:'ignore' is required - exec() leaves stdin pipe open
// which causes the CLI to hang even in headless mode (-p flag)
function runClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(CLAUDE_PATH, ['-p', prompt, '--output-format', 'json'], {
      env: { ...process.env, HOME: '/Users/simonwu' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (data) => { stdout += data })
    child.stderr.on('data', (data) => { stderr += data })
    child.on('error', reject)
    child.on('close', (code) => {
      code === 0 ? resolve(stdout) : reject(new Error(`Exit ${code}: ${stderr}`))
    })
  })
}

function spawnClaudeStream(prompt: string): ChildProcess {
  return spawn(
    CLAUDE_PATH,
    [
      '-p', prompt,
      '--output-format', 'stream-json',
      '--include-partial-messages',
      '--verbose',
    ],
    {
      env: { ...process.env, HOME: '/Users/simonwu' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
}

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
  const encoder = new TextEncoder()
  let child: ChildProcess | null = null

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false
      const emit = (event: unknown) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
        } catch {
          // controller already closed
        }
      }
      const close = () => {
        if (closed) return
        closed = true
        try { controller.close() } catch {}
      }

      emit({
        type: 'meta',
        month,
        totalAmount,
        cached: cachedAnswer !== null,
      })

      // Cache hit: emit the full answer as a single delta and we're done.
      if (cachedAnswer !== null) {
        emit({ type: 'delta', text: cachedAnswer })
        emit({ type: 'done' })
        close()
        return
      }

      // Cache miss: spawn Claude and forward text deltas.
      if (!prompt) {
        emit({ type: 'error', message: 'Internal error: missing prompt' })
        close()
        return
      }

      const claudeStart = Date.now()
      console.log(`[ask-claude] Streaming Claude CLI for ${month}...`)

      child = spawnClaudeStream(prompt)

      let stdoutBuf = ''
      let stderrBuf = ''
      let fullText = ''

      child.stdout!.on('data', (chunk: Buffer) => {
        stdoutBuf += chunk.toString()
        const lines = stdoutBuf.split('\n')
        stdoutBuf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          let evt: unknown
          try {
            evt = JSON.parse(line)
          } catch {
            continue
          }
          const text = extractTextDelta(evt)
          if (text !== null) {
            fullText += text
            emit({ type: 'delta', text })
          }
        }
      })

      child.stderr!.on('data', (chunk: Buffer) => {
        stderrBuf += chunk.toString()
      })

      child.on('error', (err) => {
        console.error('[ask-claude] spawn error:', err)
        emit({ type: 'error', message: err.message })
        close()
      })

      child.on('close', async (code) => {
        const elapsed = ((Date.now() - claudeStart) / 1000).toFixed(2)
        if (code === 0 && fullText) {
          try {
            await prisma.monthlyInsight.upsert({
              where: { month },
              update: { answer: fullText, totalAmount },
              create: { month, answer: fullText, totalAmount },
            })
          } catch (err) {
            console.error('[ask-claude] cache upsert failed:', err)
          }
          console.log(`[ask-claude] Streaming done for ${month} in ${elapsed}s`)
          emit({ type: 'done' })
        } else {
          console.error(`[ask-claude] Claude exited ${code}: ${stderrBuf}`)
          emit({
            type: 'error',
            message: `Claude exited ${code}${stderrBuf ? `: ${stderrBuf.slice(0, 200)}` : ''}`,
          })
        }
        close()
      })
    },
    cancel() {
      // Client aborted the stream — kill the CLI so we don't waste work.
      if (child && !child.killed) {
        child.kill()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      'X-Accel-Buffering': 'no',
    },
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
    const wantsStream = searchParams.get('stream') === 'true'

    console.log(`[ask-claude] Request for month=${month}${refresh ? ' (refresh)' : ''}${wantsStream ? ' (stream)' : ''}`)
    const startTime = Date.now()

    // Cache check (shared by streaming and non-streaming paths)
    if (!refresh) {
      const cached = await prisma.monthlyInsight.findUnique({ where: { month } })
      if (cached) {
        console.log(`[ask-claude] Cache hit for ${month}`)
        const totalAmount = Number(cached.totalAmount)
        if (wantsStream) {
          return buildStreamResponse({
            month: cached.month,
            totalAmount,
            cachedAnswer: cached.answer,
            prompt: null,
          })
        }
        return NextResponse.json({
          answer: cached.answer,
          month: cached.month,
          totalAmount,
          cached: true,
        })
      }
    }

    const prep = await prepareRequest(month)
    if (!prep.ok) {
      return NextResponse.json({ error: prep.error }, { status: prep.status })
    }
    const { totalAmount, prompt } = prep.prepared

    console.log(`[ask-claude] Prepared prompt in ${((Date.now() - startTime) / 1000).toFixed(2)}s`)

    if (wantsStream) {
      return buildStreamResponse({
        month,
        totalAmount,
        cachedAnswer: null,
        prompt,
      })
    }

    console.log(`[ask-claude] Calling Claude CLI for ${month}...`)
    const claudeStart = Date.now()
    const stdout = await runClaude(prompt)
    console.log(`[ask-claude] Claude responded in ${((Date.now() - claudeStart) / 1000).toFixed(2)}s`)

    const result = JSON.parse(stdout)
    console.log(`[ask-claude] Done for ${month} — total ${((Date.now() - startTime) / 1000).toFixed(2)}s`)

    await prisma.monthlyInsight.upsert({
      where: { month },
      update: { answer: result.result, totalAmount },
      create: { month, answer: result.result, totalAmount },
    })

    return NextResponse.json({ answer: result.result, month, totalAmount })
  } catch (error) {
    console.error('[ask-claude]', error)
    return NextResponse.json(
      { error: 'Failed to call Claude', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 },
    )
  }
}
