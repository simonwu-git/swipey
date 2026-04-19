// Helpers for parsing the Claude CLI's `--output-format stream-json
// --include-partial-messages` NDJSON output.

// Pulls the text out of a `stream_event` line, if it carries a
// `content_block_delta` with a `text_delta`. Returns null for any other shape
// — including malformed input, non-text deltas (e.g. `input_json_delta`), and
// top-level events like `assistant` / `result` / `system`.
export function extractTextDelta(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return null
  const obj = value as Record<string, unknown>
  if (obj.type !== 'stream_event') return null
  const event = obj.event
  if (typeof event !== 'object' || event === null) return null
  const ev = event as Record<string, unknown>
  if (ev.type !== 'content_block_delta') return null
  const delta = ev.delta
  if (typeof delta !== 'object' || delta === null) return null
  const d = delta as Record<string, unknown>
  if (d.type !== 'text_delta' || typeof d.text !== 'string') return null
  return d.text
}
