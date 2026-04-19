import { useCallback, useEffect, useRef, useState } from 'react';
import { readNdjsonLines } from '@/lib/ndjson';

// Matches the NDJSON event shapes emitted by /api/ask-claude?stream=true.
type StreamEvent =
  | { type: 'meta'; month: string; totalAmount: number; cached: boolean }
  | { type: 'delta'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

function isStreamEvent(value: unknown): value is StreamEvent {
  if (typeof value !== 'object' || value === null) return false;
  const t = (value as { type?: unknown }).type;
  return t === 'meta' || t === 'delta' || t === 'done' || t === 'error';
}

export interface UseInsightsStreamResult {
  insight: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useInsightsStream(month: string | null): UseInsightsStreamResult {
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchStream = useCallback(async (refresh: boolean) => {
    if (!month) return;

    // Cancel any in-flight request so its late setState calls don't clobber
    // the new request's state.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    setInsight(null);

    try {
      const url = `/api/ask-claude?month=${month}&stream=true${refresh ? '&refresh=true' : ''}`;
      const response = await fetch(url, { signal: controller.signal });

      // Pre-stream failures (bad month / no transactions) come back as JSON.
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (!controller.signal.aborted) {
          setError(data.error ?? 'Failed to get insights');
        }
        return;
      }

      if (!response.body) {
        setError('Streaming not supported');
        return;
      }

      const reader = response.body.getReader();
      let accumulated = '';
      let streamError: string | null = null;

      for await (const raw of readNdjsonLines(reader)) {
        if (!isStreamEvent(raw)) continue;
        if (raw.type === 'delta') {
          accumulated += raw.text;
          setInsight(accumulated);
        } else if (raw.type === 'error') {
          streamError = raw.message;
        }
      }

      if (streamError) {
        setError(streamError);
        setInsight(null);
      }
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      setError('Failed to connect to Claude');
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsLoading(false);
      }
    }
  }, [month]);

  // Kick off a fresh stream whenever the month changes.
  useEffect(() => {
    setInsight(null);
    setError(null);
    if (month) fetchStream(false);
  }, [month, fetchStream]);

  // Abort any in-flight stream on unmount.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const refresh = useCallback(() => fetchStream(true), [fetchStream]);

  return { insight, isLoading, error, refresh };
}
