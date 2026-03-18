'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';

interface InsightsSectionProps {
  month: string | null;
}

export function InsightsSection({ month }: InsightsSectionProps) {
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async (refresh = false) => {
    if (!month) return;
    setIsLoading(true);
    setError(null);
    try {
      const url = `/api/ask-claude?month=${month}${refresh ? '&refresh=true' : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'Failed to get insights');
      } else {
        setInsight(data.answer);
      }
    } catch {
      setError('Failed to connect to Claude');
    } finally {
      setIsLoading(false);
    }
  }, [month]);

  // Auto-fetch when month changes
  useEffect(() => {
    setInsight(null);
    setError(null);
    if (month) {
      fetchInsights();
    }
  }, [month, fetchInsights]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyzing spend...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-3 flex items-center justify-between">
          <span className="text-sm text-red-500">{error}</span>
          <Button variant="ghost" size="sm" onClick={() => fetchInsights()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (insight) {
    return (
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">Insights</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 w-6 p-0"
              onClick={() => fetchInsights(true)}
              title="Regenerate insights"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
          <div className="text-sm whitespace-pre-wrap max-h-[200px] overflow-auto">
            {insight}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
