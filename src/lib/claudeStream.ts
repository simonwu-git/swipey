// Helpers for talking to the Claude CLI in streaming mode
// (`--output-format stream-json --include-partial-messages --verbose`).

import { spawn } from 'child_process'

const CLAUDE_PATH = '/Users/simonwu/.local/bin/claude'

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

// Spawn the Claude CLI in streaming mode and yield text deltas as they arrive.
// Throws on non-zero exit. Supports cancellation via an optional AbortSignal
// (kills the child process and returns silently).
export async function* streamClaudeDeltas(
  prompt: string,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const child = spawn(
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

  // If spawn itself fails (e.g. ENOENT — binary not found), push the error
  // through stdout so the for-await loop throws it naturally.
  child.on('error', (err) => {
    child.stdout?.destroy(err)
  })

  // Wire up abort signal → kill child.
  const onAbort = () => child.kill()
  signal?.addEventListener('abort', onAbort, { once: true })

  let stderrBuf = ''
  child.stderr?.on('data', (chunk: Buffer) => {
    stderrBuf += chunk.toString()
  })

  let buffer = ''
  try {
    for await (const chunk of child.stdout!) {
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.trim()) continue
        let evt: unknown
        try {
          evt = JSON.parse(line)
        } catch {
          continue
        }
        const text = extractTextDelta(evt)
        if (text !== null) yield text
      }
    }
  } finally {
    signal?.removeEventListener('abort', onAbort)
  }

  // If we were aborted, exit silently — the caller already knows.
  if (signal?.aborted) return

  // Wait for the process to fully close if it hasn't already.
  const exitCode =
    child.exitCode ??
    (await new Promise<number | null>((resolve) => {
      child.on('close', resolve)
    }))

  if (exitCode !== 0) {
    throw new Error(
      `Claude exited ${exitCode}${stderrBuf ? `: ${stderrBuf.slice(0, 200)}` : ''}`,
    )
  }
}

// Run the Claude CLI once, buffering all deltas into a single string. Use this
// when you don't need streaming — e.g. structured-JSON endpoints where the
// client renders the full result at once. Throws on non-zero exit.
export async function runClaudeOnce(
  prompt: string,
  signal?: AbortSignal,
): Promise<string> {
  let out = ''
  for await (const text of streamClaudeDeltas(prompt, signal)) {
    out += text
  }
  return out
}
