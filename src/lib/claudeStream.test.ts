import { describe, it, expect } from 'vitest'
import { extractTextDelta } from './claudeStream'

// Sample shape matches what `claude -p --output-format stream-json
// --include-partial-messages --verbose` actually emits.
function makeDelta(text: string) {
  return {
    type: 'stream_event',
    event: {
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'text_delta', text },
    },
  }
}

describe('extractTextDelta', () => {
  it('returns the text from a valid content_block_delta / text_delta', () => {
    expect(extractTextDelta(makeDelta('hello'))).toBe('hello')
  })

  it('preserves empty-string deltas', () => {
    // The CLI occasionally emits empty text chunks; they should round-trip
    // rather than being treated as "no delta".
    expect(extractTextDelta(makeDelta(''))).toBe('')
  })

  it('preserves whitespace-only deltas', () => {
    expect(extractTextDelta(makeDelta('\n  '))).toBe('\n  ')
  })

  it('returns null for non-stream_event top-level events', () => {
    expect(extractTextDelta({ type: 'assistant', message: {} })).toBeNull()
    expect(extractTextDelta({ type: 'result', result: 'done' })).toBeNull()
    expect(extractTextDelta({ type: 'system', subtype: 'init' })).toBeNull()
  })

  it('returns null for stream_events that are not content_block_delta', () => {
    expect(
      extractTextDelta({
        type: 'stream_event',
        event: { type: 'message_start', message: {} },
      }),
    ).toBeNull()
    expect(
      extractTextDelta({
        type: 'stream_event',
        event: { type: 'message_stop' },
      }),
    ).toBeNull()
    expect(
      extractTextDelta({
        type: 'stream_event',
        event: { type: 'content_block_start', index: 0, content_block: {} },
      }),
    ).toBeNull()
  })

  it('returns null for non-text deltas (e.g. input_json_delta)', () => {
    expect(
      extractTextDelta({
        type: 'stream_event',
        event: {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'input_json_delta', partial_json: '{"a":1}' },
        },
      }),
    ).toBeNull()
  })

  it('returns null when delta.text is missing or not a string', () => {
    expect(
      extractTextDelta({
        type: 'stream_event',
        event: {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta' },
        },
      }),
    ).toBeNull()
    expect(
      extractTextDelta({
        type: 'stream_event',
        event: {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text: 42 },
        },
      }),
    ).toBeNull()
    expect(
      extractTextDelta({
        type: 'stream_event',
        event: {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text: null },
        },
      }),
    ).toBeNull()
  })

  it('returns null for primitives and nullish values', () => {
    expect(extractTextDelta(null)).toBeNull()
    expect(extractTextDelta(undefined)).toBeNull()
    expect(extractTextDelta('string')).toBeNull()
    expect(extractTextDelta(42)).toBeNull()
    expect(extractTextDelta(true)).toBeNull()
  })

  it('returns null for malformed objects missing nested fields', () => {
    expect(extractTextDelta({})).toBeNull()
    expect(extractTextDelta({ type: 'stream_event' })).toBeNull()
    expect(extractTextDelta({ type: 'stream_event', event: null })).toBeNull()
    expect(
      extractTextDelta({ type: 'stream_event', event: 'not-an-object' }),
    ).toBeNull()
    expect(
      extractTextDelta({
        type: 'stream_event',
        event: { type: 'content_block_delta', delta: null },
      }),
    ).toBeNull()
  })
})
