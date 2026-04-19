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
