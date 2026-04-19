import { describe, it, expect } from 'vitest'
import { readNdjsonLines } from './ndjson'

// Build a ReadableStream<Uint8Array> from an array of chunks. Each chunk is
// either a string (encoded as UTF-8) or a raw Uint8Array for byte-level
// control (multi-byte splits, binary frames, etc.).
function streamFrom(chunks: Array<string | Uint8Array>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(
          typeof chunk === 'string' ? encoder.encode(chunk) : chunk,
        )
      }
      controller.close()
    },
  })
}

async function collect(
  chunks: Array<string | Uint8Array>,
): Promise<unknown[]> {
  const reader = streamFrom(chunks).getReader()
  const out: unknown[] = []
  for await (const value of readNdjsonLines(reader)) {
    out.push(value)
  }
  return out
}

describe('readNdjsonLines', () => {
  it('yields each complete line as parsed JSON', async () => {
    const out = await collect(['{"a":1}\n{"b":2}\n{"c":3}\n'])
    expect(out).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }])
  })

  it('buffers a line split across chunk boundaries', async () => {
    const out = await collect(['{"hello":', '"wor', 'ld"}\n'])
    expect(out).toEqual([{ hello: 'world' }])
  })

  it('yields multiple lines when several arrive in one chunk', async () => {
    const out = await collect(['{"a":1}\n{"b":2}\n'])
    expect(out).toEqual([{ a: 1 }, { b: 2 }])
  })

  it('flushes a trailing line that has no terminating newline', async () => {
    const out = await collect(['{"a":1}\n{"b":2}'])
    expect(out).toEqual([{ a: 1 }, { b: 2 }])
  })

  it('yields nothing for an empty stream', async () => {
    const out = await collect([])
    expect(out).toEqual([])
  })

  it('skips blank lines', async () => {
    const out = await collect(['\n{"a":1}\n\n\n{"b":2}\n\n'])
    expect(out).toEqual([{ a: 1 }, { b: 2 }])
  })

  it('skips malformed JSON lines without throwing', async () => {
    const out = await collect([
      '{"ok":1}\nnot json at all\n{"ok":2}\n{oops\n{"ok":3}\n',
    ])
    expect(out).toEqual([{ ok: 1 }, { ok: 2 }, { ok: 3 }])
  })

  it('handles a multi-byte UTF-8 character split across chunk boundaries', async () => {
    // "€" is encoded as 3 bytes: 0xE2 0x82 0xAC. Split it across two chunks
    // to exercise TextDecoder's streaming mode. If the decoder isn't in
    // stream mode, the first chunk would decode to U+FFFD.
    const euroBytes = new Uint8Array([0xe2, 0x82, 0xac])
    const prefix = new TextEncoder().encode('{"price":"')
    const suffix = new TextEncoder().encode('100"}\n')
    const out = await collect([
      new Uint8Array([...prefix, euroBytes[0]]),
      new Uint8Array([euroBytes[1], euroBytes[2], ...suffix]),
    ])
    expect(out).toEqual([{ price: '€100' }])
  })

  it('handles a newline split from its preceding content across chunks', async () => {
    // The \n arrives in the second chunk, so the first chunk must be buffered
    // in its entirety rather than yielded.
    const out = await collect(['{"a":1}', '\n{"b":2}\n'])
    expect(out).toEqual([{ a: 1 }, { b: 2 }])
  })

  it('preserves JSON string contents that contain escaped newlines', async () => {
    // Escaped \n inside a JSON string must not be treated as a line break.
    const out = await collect(['{"text":"line1\\nline2"}\n'])
    expect(out).toEqual([{ text: 'line1\nline2' }])
  })

  it('yields a parsed trailing line with no newline', async () => {
    const out = await collect(['{"only":"line"}'])
    expect(out).toEqual([{ only: 'line' }])
  })

  it('ignores whitespace-only trailing content on done', async () => {
    const out = await collect(['{"a":1}\n   '])
    expect(out).toEqual([{ a: 1 }])
  })
})
