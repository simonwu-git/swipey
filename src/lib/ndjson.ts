const NDJSON_HEADERS = {
  'Content-Type': 'application/x-ndjson; charset=utf-8',
  'Cache-Control': 'no-store, no-transform',
  'X-Accel-Buffering': 'no',
}

// Build an NDJSON streaming Response. Passes an `enqueue` helper (JSON-serializes
// + newline) and an AbortController (aborted on client disconnect) to `fn`.
// Closes the stream automatically when `fn` resolves or throws.
export function buildNdjsonStream(
  fn: (enqueue: (event: unknown) => void, ac: AbortController) => Promise<void>,
): Response {
  const encoder = new TextEncoder()
  const ac = new AbortController()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (event: unknown) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
        } catch {
          // controller already closed (client disconnected)
        }
      }
      try {
        await fn(enqueue, ac)
      } finally {
        try { controller.close() } catch { /* already closed */ }
      }
    },
    cancel() {
      ac.abort()
    },
  })

  return new Response(stream, { headers: NDJSON_HEADERS })
}

// Read a ReadableStream of UTF-8 bytes as newline-delimited JSON, yielding
// each parsed value. Handles chunks that split mid-line and multi-byte chars
// that split across chunk boundaries. Lines that fail to parse are skipped.
export async function* readNdjsonLines(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<unknown> {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      buffer += decoder.decode();
      const trailing = buffer.trim();
      if (trailing) {
        try {
          yield JSON.parse(trailing);
        } catch {
          // ignore trailing garbage
        }
      }
      return;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        yield JSON.parse(line);
      } catch {
        continue;
      }
    }
  }
}
