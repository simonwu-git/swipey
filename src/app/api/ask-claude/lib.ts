// Pure logic for the prose-insights endpoint.
// No I/O, no Prisma types — testable in isolation.

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export interface PromptTransaction {
  transactionDate: Date
  description: string
  amount: number  // raw (caller does not need to abs — this function does)
  category: string | null
  accountName: string
}

export function buildInsightsPrompt(
  month: string,
  transactions: PromptTransaction[],
  previousMonthTotal: number | null,
): { prompt: string; totalAmount: number } {
  const [year, monthNum] = month.split('-').map(Number)
  const monthLabel = `${MONTH_NAMES[monthNum - 1]} ${year}`

  const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)

  const rows = transactions.map((t) => {
    const date = new Date(t.transactionDate).toISOString().slice(0, 10)
    const desc = t.description.slice(0, 30)
    const cat = (t.category ?? 'Uncategorized').slice(0, 20)
    const amt = `$${Math.abs(Number(t.amount)).toFixed(2)}`
    return `${date} | ${t.accountName} | ${desc} | ${cat} | ${amt}`
  })

  const prevContext = previousMonthTotal != null
    ? `Previous month total: $${previousMonthTotal.toFixed(2)}`
    : `Previous month total: no data`

  const prompt = [
    `<transactions month="${month}" total="${totalAmount.toFixed(2)}" count="${transactions.length}">`,
    ...rows,
    `</transactions>`,
    ``,
    `<context>`,
    prevContext,
    `</context>`,
    ``,
    `<task>`,
    `Analyze the spending for ${monthLabel}. Be specific: cite dollar amounts, counts, and percentages of total where they add insight. Write:`,
    `- One sentence overall takeaway including the total spend.`,
    `- 2–3 bullet points of notable patterns or unusual spending, each with a dollar amount or count.`,
    `- 1–2 sentences comparing to the previous month with specific figures.`,
    `- 2–3 actionable suggestions tied to the patterns you identified.`,
    `</task>`,
    ``,
    `<output>`,
    `[SUMMARY]`,
    `One sentence overall takeaway for the month.`,
    ``,
    `[PATTERNS]`,
    `- First pattern`,
    `- Second pattern`,
    ``,
    `[COMPARISON]`,
    `One or two sentences comparing to previous month.`,
    ``,
    `[SUGGESTIONS]`,
    `- First suggestion`,
    `- Second suggestion`,
    `</output>`,
    ``,
    `Respond with ONLY the four sections shown above. Use real figures from the transactions. No preamble, no closing remarks.`,
  ].join('\n')

  return { prompt, totalAmount }
}
