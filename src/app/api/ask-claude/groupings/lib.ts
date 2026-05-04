// Pure logic for the AI-backed transaction-grouping endpoint.
// No I/O, no Prisma types — testable in isolation. Route.ts owns the HTTP
// plumbing, Prisma queries, and Claude invocation; this module owns the
// schemas, prompt format, and the index↔ID + sanitize transformations.

import { createHash } from 'crypto'
import { z } from 'zod'

export const MAX_GROUPINGS = 3

// What the model returns: small integers referencing rows in the prompt table.
// Using indices instead of cuid strings keeps the model's output cheap and
// roughly eliminates verbatim-copy hallucinations on long ID lists.
export const ModelGroupingSchema = z.object({
  name: z.string().trim().min(1).max(120),
  why: z.string().trim().min(1).max(500),
  indices: z.array(z.number().int().positive()).min(1),
})
export const ModelGroupingsArraySchema = z.array(ModelGroupingSchema)
export type ModelGrouping = z.infer<typeof ModelGroupingSchema>

// What we persist to MonthlyInsight.groupings (resolved transaction IDs).
// IDs are stable across re-imports/re-orderings; indices are not.
export const CachedGroupingSchema = z.object({
  name: z.string().trim().min(1).max(120),
  why: z.string().trim().min(1).max(500),
  transactionIds: z.array(z.string()).min(1),
})
export const CachedGroupingsArraySchema = z.array(CachedGroupingSchema)
export type CachedGrouping = z.infer<typeof CachedGroupingSchema>

// What the API returns to the client.
export interface Grouping extends CachedGrouping {
  id: string                            // stable hash of name + sorted(transactionIds)
  total: number                         // absolute sum of member transactions
}

// Minimal transaction shape needed for prompt building. Decoupled from Prisma
// so this module is trivial to unit-test.
export interface PromptTransaction {
  id: string
  date: Date
  amount: number                        // absolute value (caller does the abs)
  description: string
  accountName: string
}

export interface PromptResult {
  prompt: string
  orderedIds: string[]                  // index N in the prompt → orderedIds[N-1]
  totalAmount: number
  amountsById: Map<string, number>
}

export function buildGroupingsPrompt(
  month: string,
  transactions: PromptTransaction[],
): PromptResult {
  const orderedIds: string[] = []
  const amountsById = new Map<string, number>()
  let totalAmount = 0
  const rows: string[] = []

  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i]
    orderedIds.push(t.id)
    amountsById.set(t.id, t.amount)
    totalAmount += t.amount
    const date = t.date.toISOString().slice(0, 10)
    const desc = t.description.slice(0, 40)
    rows.push(`[${i + 1}] ${date} | ${t.accountName} | ${desc} | $${t.amount.toFixed(2)}`)
  }

  const prompt = [
    `You are analyzing one month of bank transactions for a personal-finance app.`,
    ``,
    `Month: ${month}`,
    `Total: $${totalAmount.toFixed(2)} across ${transactions.length} transactions`,
    ``,
    `Transactions ([index] date | account | description | amount):`,
    ...rows,
    ``,
    `Surface up to ${MAX_GROUPINGS} of the MOST INTERESTING groupings of these transactions.`,
    `A good grouping has a name a human would naturally use ("Japan trip", "Coffee runs",`,
    `"Home reno", "New pet expenses") and aggregates to a meaningful total. Prefer:`,
    `  - trip / travel clusters (foreign merchants, lodging, transit, in a window)`,
    `  - recurring themes a person would want to see totalled`,
    `Skip groupings of a single merchant unless the total is notable. If fewer than`,
    `${MAX_GROUPINGS} meaningful groupings exist, return fewer (or an empty array).`,
    ``,
    `Respond with ONLY a JSON array. No prose, no code fences, no commentary.`,
    `Each element: {"name": string, "why": short string, "indices": [number, ...]}.`,
    `"indices" must be the integers in [brackets] from the table above (1-based).`,
    `Example: [{"name":"Japan trip","why":"...","indices":[12,13,14,17]}]`,
  ].join('\n')

  return { prompt, orderedIds, totalAmount, amountsById }
}

// Best-effort JSON-array extraction. The prompt asks for a bare array, but
// models sometimes wrap it in code fences or add a sentence of preamble. Try
// strict parse first; on failure, fall back to the first `[...]` slice.
function extractJsonArray(raw: string): unknown {
  const trimmed = raw.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    // fall through
  }
  const start = trimmed.indexOf('[')
  const end = trimmed.lastIndexOf(']')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('no JSON array found in model output')
  }
  return JSON.parse(trimmed.slice(start, end + 1))
}

// Throws on parse failure or schema mismatch — caller should map to HTTP 502.
export function parseModelOutput(raw: string): ModelGrouping[] {
  const arr = extractJsonArray(raw)
  return ModelGroupingsArraySchema.parse(arr)
}

function hashGroupingId(g: Pick<CachedGrouping, 'name' | 'transactionIds'>): string {
  const key = g.name + '|' + [...g.transactionIds].sort().join(',')
  return createHash('sha1').update(key).digest('hex').slice(0, 12)
}

// Resolve model indices to transaction IDs. Drops indices that fall outside
// the table (defensive against the model going off-script) and dedupes within
// each grouping. Empty groupings are dropped.
export function modelToCached(
  model: ModelGrouping[],
  orderedIds: string[],
): CachedGrouping[] {
  const out: CachedGrouping[] = []
  for (const g of model) {
    const seen = new Set<string>()
    const ids: string[] = []
    for (const idx of g.indices) {
      if (idx < 1 || idx > orderedIds.length) continue
      const id = orderedIds[idx - 1]
      if (seen.has(id)) continue
      seen.add(id)
      ids.push(id)
    }
    if (ids.length === 0) continue
    out.push({ name: g.name, why: g.why, transactionIds: ids })
  }
  return out
}

// Drop hallucinated/missing transaction ids; drop any grouping that ends up
// with fewer than 2 members; cap at MAX_GROUPINGS. Returns the cleaned cached
// form (for persistence) and the enriched form (for the response).
export function enrichForResponse(
  cached: CachedGrouping[],
  knownIds: Set<string>,
  amountsById: Map<string, number>,
): { clean: CachedGrouping[]; enriched: Grouping[] } {
  const clean: CachedGrouping[] = []
  const enriched: Grouping[] = []

  for (const g of cached) {
    const filteredIds = g.transactionIds.filter((id) => knownIds.has(id))
    if (filteredIds.length < 2) continue

    const cleaned: CachedGrouping = { ...g, transactionIds: filteredIds }
    const total = filteredIds.reduce((sum, id) => sum + (amountsById.get(id) ?? 0), 0)
    clean.push(cleaned)
    enriched.push({
      ...cleaned,
      id: hashGroupingId(cleaned),
      total,
    })
    if (clean.length >= MAX_GROUPINGS) break
  }

  return { clean, enriched }
}
