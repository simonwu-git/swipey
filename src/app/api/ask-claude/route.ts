import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { prisma } from '@/lib/db'

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

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function getPreviousMonth(year: number, monthNum: number) {
  const date = new Date(year, monthNum - 2)
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get('month')

    if (!month) {
      return NextResponse.json(
        { error: 'month query parameter is required (YYYY-MM)' },
        { status: 400 }
      )
    }

    if (!MONTH_RE.test(month)) {
      return NextResponse.json(
        { error: 'month must be in YYYY-MM format' },
        { status: 400 }
      )
    }

    console.log(`[ask-claude] Request for month=${month}`)
    const startTime = Date.now()

    const [year, monthNum] = month.split('-').map(Number)
    const startDate = new Date(year, monthNum - 1, 1)
    const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999)

    const whereClause: any = {
      transactionDate: { gte: startDate, lte: endDate },
      transactionType: { notIn: ['Payment', 'Credit'] },
    }

    const prev = getPreviousMonth(year, monthNum)
    const prevStartDate = new Date(prev.year, prev.month - 1, 1)
    const prevEndDate = new Date(prev.year, prev.month, 0, 23, 59, 59, 999)

    const prevWhereClause: any = {
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

    console.log(`[ask-claude] Fetched ${transactions.length} transactions in ${((Date.now() - startTime) / 1000).toFixed(2)}s`)

    if (transactions.length === 0) {
      return NextResponse.json(
        { error: `No transactions found for ${month}` },
        { status: 404 }
      )
    }

    const totalAmount = transactions.reduce(
      (sum, t) => sum + Math.abs(Number(t.amount)),
      0
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

    console.log(`[ask-claude] Calling Claude CLI for ${month}...`)
    const claudeStart = Date.now()
    const stdout = await runClaude(prompt)
    console.log(`[ask-claude] Claude responded in ${((Date.now() - claudeStart) / 1000).toFixed(2)}s`)

    const result = JSON.parse(stdout)
    console.log(`[ask-claude] Done for ${month} — total ${((Date.now() - startTime) / 1000).toFixed(2)}s`)
    return NextResponse.json({ answer: result.result, month, totalAmount })
  } catch (error) {
    console.error('[ask-claude]', error)
    return NextResponse.json(
      { error: 'Failed to call Claude', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
