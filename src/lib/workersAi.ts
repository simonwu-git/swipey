import { parseSSEStream } from './sseStream'

const DEFAULT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'

export const workersAiProvider = {
  async *streamTextDeltas({
    prompt,
    system,
    signal,
  }: {
    prompt: string
    system?: string
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
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          { role: 'user', content: prompt },
        ],
        stream: true,
        max_tokens: 8192,
      }),
      signal,
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Workers AI ${res.status}: ${body.slice(0, 200)}`)
    }

    yield* parseSSEStream(res.body!)
  },
}
