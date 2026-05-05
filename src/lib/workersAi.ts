const DEFAULT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'

export const workersAiProvider = {
  async *streamTextDeltas({
    prompt,
    signal,
  }: {
    prompt: string
    signal?: AbortSignal
  }): AsyncGenerator<string> {
    const accountId = process.env.WORKERS_AI_ACCOUNT_ID
    const apiToken = process.env.WORKERS_AI_API_TOKEN
    const model = process.env.WORKERS_AI_MODEL ?? DEFAULT_MODEL

    if (!accountId || !apiToken) {
      throw new Error('WORKERS_AI_ACCOUNT_ID and WORKERS_AI_API_TOKEN must be set when AI_PROVIDER=workers-ai')
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      }),
      signal,
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Workers AI ${res.status}: ${body.slice(0, 200)}`)
    }

    const reader = res.body!.getReader()
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
            const text = (parsed as Record<string, unknown>)?.response
            if (typeof text === 'string' && text) yield text
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  },
}
