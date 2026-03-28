'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Loader2,
  RefreshCw,
  FileText,
  TrendingUp,
  ArrowLeftRight,
  Lightbulb,
} from 'lucide-react';
import { usePrivacy } from '@/lib/privacy';
import { parseInsights } from './parseInsights';

const SECTIONS = [
  { key: 'summary', label: 'Summary', Icon: FileText },
  { key: 'patterns', label: 'Patterns', Icon: TrendingUp },
  { key: 'comparison', label: 'Comparison', Icon: ArrowLeftRight },
  { key: 'suggestions', label: 'Tips', Icon: Lightbulb },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

const BULLET_SECTIONS: SectionKey[] = ['patterns', 'suggestions'];

interface InsightsSectionProps {
  month: string | null;
}

function renderContent(text: string, isBulletSection: boolean) {
  if (!text) return <span className="text-muted-foreground italic">No data</span>;

  if (isBulletSection) {
    // Split on newlines, filter empty, strip leading bullet chars
    const items = text
      .split('\n')
      .map((line) => line.replace(/^[\s•\-*]+/, '').trim())
      .filter(Boolean);

    return (
      <ul className="list-disc list-inside space-y-1">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  }

  return <p>{text}</p>;
}

export function InsightsSection({ month }: InsightsSectionProps) {
  const { isPrivacyMode } = usePrivacy();
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey>('summary');
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

  // Reset state when month changes
  useEffect(() => {
    setInsight(null);
    setError(null);
    setActiveSection('summary');
    if (month) {
      fetchInsights();
    }
  }, [month, fetchInsights]);

  const parsed = useMemo(() => {
    if (!insight) return null;
    return parseInsights(insight);
  }, [insight]);

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="flex-1 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyzing spend...
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex-1 flex items-center justify-between">
          <span className="text-sm text-red-500">{error}</span>
          <Button variant="ghost" size="sm" onClick={() => fetchInsights()}>
            Retry
          </Button>
        </div>
      );
    }

    if (insight) {
      return (
        <>
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
          <div className={isPrivacyMode ? 'blur-sm select-none' : ''}>
            {parsed ? (
              <>
                <div className="flex gap-1 mb-2 flex-wrap">
                  {SECTIONS.map(({ key, label, Icon }) => (
                    <Button
                      key={key}
                      variant={activeSection === key ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 px-2 text-xs gap-1"
                      onClick={() => setActiveSection(key)}
                    >
                      <Icon className="h-3 w-3" />
                      {label}
                    </Button>
                  ))}
                </div>
                <div className="text-sm">
                  {renderContent(
                    parsed[activeSection],
                    BULLET_SECTIONS.includes(activeSection)
                  )}
                </div>
              </>
            ) : (
              <div className="text-sm whitespace-pre-wrap flex-1 overflow-auto">
                {insight}
              </div>
            )}
          </div>
        </>
      );
    }

    return (
      <div className="flex-1 flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 text-purple-500" />
        Insights will appear here
      </div>
    );
  };

  return (
    <Card className="h-full">
      <CardContent className="p-3 h-full flex flex-col">
        {renderBody()}
      </CardContent>
    </Card>
  );
}
