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

// What the API streams to the client.
export interface Grouping extends CachedGrouping {
  id: string    // stable hash of name + sorted(transactionIds)
  total: number // absolute sum of member transactions
}

// Minimal transaction shape needed for prompt building.
export interface PromptTransaction {
  id: string
  date: Date
  amount: number  // absolute value (caller does the abs)
  description: string
  accountName: string
}

export interface PromptResult {
  prompt: string
  orderedIds: string[] // index N in the prompt → orderedIds[N-1]
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
    `${MAX_GROUPINGS} meaningful groupings exist, return fewer (or nothing after the marker).`,
    ``,
    `Respond with the marker [GROUPS] on its own line, then one JSON object per line`,
    `(no array brackets, no commas between objects, no prose, no code fences):`,
    `[GROUPS]`,
    `{"name":"Japan trip","why":"short reason","indices":[12,13,14,17]}`,
    `{"name":"Coffee runs","why":"short reason","indices":[5,8,21]}`,
    ``,
    `"indices" must be the integers in [brackets] from the table above (1-based).`,
    `Emit each grouping on its own line as soon as you determine it.`,
  ].join('\n')

  return { prompt, orderedIds, totalAmount, amountsById }
}

// Parse a single JSONL line emitted by the model. Returns null on any failure
// so the caller can skip the line and continue processing the rest of the stream.
export function parseModelLine(raw: string): ModelGrouping | null {
  const trimmed = raw.trim()
  if (!trimmed || trimmed === '[GROUPS]') return null
  try {
    return ModelGroupingSchema.parse(JSON.parse(trimmed))
  } catch {
    return null
  }
}

// Resolve a single ModelGrouping's indices to transaction IDs. Returns null if
// the resulting set is empty (all indices out of range or all duplicates).
export function lineToCachedGrouping(
  model: ModelGrouping,
  orderedIds: string[],
): CachedGrouping | null {
  const seen = new Set<string>()
  const ids: string[] = []
  for (const idx of model.indices) {
    if (idx < 1 || idx > orderedIds.length) continue
    const id = orderedIds[idx - 1]
    if (seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  if (ids.length === 0) return null
  return { name: model.name, why: model.why, transactionIds: ids }
}

function hashGroupingId(g: Pick<CachedGrouping, 'name' | 'transactionIds'>): string {
  const key = g.name + '|' + [...g.transactionIds].sort().join(',')
  return createHash('sha1').update(key).digest('hex').slice(0, 12)
}

// Consume a stream of Claude text deltas, locate the [GROUPS] marker, and yield
// one enriched grouping per valid JSONL line that follows it. Stops yielding
// after MAX_GROUPINGS but drains the source to let the caller's for-await
// complete naturally (needed so route.ts can persist to cache after the stream).
export async function* parseGroupingStream(
  deltas: AsyncIterable<string>,
  orderedIds: string[],
  knownIds: Set<string>,
  amountsById: Map<string, number>,
): AsyncGenerator<{ grouping: Grouping; cached: CachedGrouping }> {
  let buf = ''
  let seenMarker = false
  let emitted = 0

  for await (const text of deltas) {
    buf += text

    if (!seenMarker) {
      const idx = buf.indexOf('[GROUPS]')
      if (idx === -1) continue
      buf = buf.slice(idx + '[GROUPS]'.length)
      seenMarker = true
    }

    const lines = buf.split('\n')
    buf = lines.pop() ?? ''

    for (const line of lines) {
      if (emitted >= MAX_GROUPINGS) continue
      const model = parseModelLine(line)
      const cached = model && lineToCachedGrouping(model, orderedIds)
      const grouping = cached && enrichOne(cached, knownIds, amountsById)
      if (!grouping || !cached) continue
      yield { grouping, cached }
      emitted++
    }
  }

  // Handle trailing content that arrived without a final newline.
  if (seenMarker && buf.trim() && emitted < MAX_GROUPINGS) {
    const model = parseModelLine(buf)
    const cached = model && lineToCachedGrouping(model, orderedIds)
    const grouping = cached && enrichOne(cached, knownIds, amountsById)
    if (grouping && cached) yield { grouping, cached }
  }
}

// Enrich a single CachedGrouping into a Grouping. Filters out any transactionIds
// not in `knownIds`, then rejects the grouping if fewer than 2 members remain.
export function enrichOne(
  cached: CachedGrouping,
  knownIds: Set<string>,
  amountsById: Map<string, number>,
): Grouping | null {
  const filteredIds = cached.transactionIds.filter((id) => knownIds.has(id))
  if (filteredIds.length < 2) return null
  const cleaned: CachedGrouping = { ...cached, transactionIds: filteredIds }
  const total = filteredIds.reduce((sum, id) => sum + (amountsById.get(id) ?? 0), 0)
  return { ...cleaned, id: hashGroupingId(cleaned), total }
}
