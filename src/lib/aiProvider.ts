import { workersAiProvider } from './workersAi'

export interface AiProvider {
  streamTextDeltas(opts: { prompt: string; system?: string; signal?: AbortSignal }): AsyncIterable<string>
}

export function getProvider(): AiProvider {
  return workersAiProvider
}
