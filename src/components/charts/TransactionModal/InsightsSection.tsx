'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Loader2 } from 'lucide-react';

interface InsightsSectionProps {
  month: string | null;
  disabled: boolean;
}

export function InsightsSection({ month, disabled }: InsightsSectionProps) {
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset when month changes
  useEffect(() => {
    setInsight(null);
    setError(null);
  }, [month]);

  const fetchInsights = async () => {
    if (!month) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/ask-claude?month=${month}`);
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
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyzing spending with Claude...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-3 flex items-center justify-between">
          <span className="text-sm text-red-500">{error}</span>
          <Button variant="ghost" size="sm" onClick={fetchInsights}>
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
          </div>
          <div className="text-sm whitespace-pre-wrap max-h-[200px] overflow-auto">
            {insight}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={fetchInsights}
      disabled={disabled}
    >
      <Sparkles className="h-4 w-4 mr-1" />
      Insights
    </Button>
  );
}
