import { streamClaudeDeltas } from './claudeStream'
import { workersAiProvider } from './workersAi'

export interface AiProvider {
  streamTextDeltas(opts: { prompt: string; signal?: AbortSignal }): AsyncIterable<string>
}

export function getProvider(): AiProvider {
  if (process.env.AI_PROVIDER === 'workers-ai') return workersAiProvider
  return {
    streamTextDeltas: ({ prompt, signal }) => streamClaudeDeltas(prompt, signal),
  }
}
