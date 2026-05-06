// Parse a Server-Sent Events stream from a Workers AI response body and yield
// text deltas. Expects the OpenAI-compatible chunk shape: choices[0].delta.content.
export async function* parseSSEStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''
      for (const event of events) {
        for (const line of event.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') return
          let parsed: unknown
          try {
            parsed = JSON.parse(data)
          } catch {
            continue
          }
          const obj = parsed as Record<string, unknown>
          const choices = obj?.choices
          const delta = Array.isArray(choices)
            ? (choices[0] as Record<string, unknown>)?.delta as Record<string, unknown> | undefined
            : undefined
          const text = delta?.content
          if (typeof text === 'string' && text) yield text
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
