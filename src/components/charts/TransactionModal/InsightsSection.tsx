'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  RefreshCw,
  FileText,
  TrendingUp,
  ArrowLeftRight,
  Lightbulb,
} from 'lucide-react';
import { usePrivacy } from '@/lib/privacy';
import { parseInsights } from './parseInsights';
import { useInsightsStream } from './useInsightsStream';

function AnimatedStar({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 2l1.8 5.5L19 9l-5.2 1.5L12 16l-1.8-5.5L5 9l5.2-1.5z" />
    </svg>
  );
}

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
  const { insight, isLoading, error, refresh } = useInsightsStream(month);
  const [activeSection, setActiveSection] = useState<SectionKey>('summary');

  // Reset the active tab when the month switches. React's recommended pattern
  // for resetting state tied to a prop — cheaper than a useEffect.
  const [prevMonth, setPrevMonth] = useState(month);
  if (prevMonth !== month) {
    setPrevMonth(month);
    setActiveSection('summary');
  }

  const parsed = useMemo(() => {
    if (!insight) return null;
    return parseInsights(insight);
  }, [insight]);

  const renderBody = () => {
    if (error) {
      return (
        <div className="flex-1 flex items-center justify-between">
          <span className="text-sm text-red-500">{error}</span>
          <Button variant="ghost" size="sm" onClick={refresh}>
            Retry
          </Button>
        </div>
      );
    }

    // Keep showing the loader until the first section has streamed in.
    // This avoids the brief flash of raw text before [SUMMARY] arrives.
    if (isLoading && !parsed) {
      return (
        <div className="flex-1 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyzing spend...
        </div>
      );
    }

    if (insight) {
      return (
        <>
          <div className="flex items-center gap-2 mb-2">
            <AnimatedStar className="ai-sparkle h-4 w-4" />
            <span className="text-sm font-medium">Insights</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 w-6 p-0"
              onClick={refresh}
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
        <AnimatedStar className="ai-sparkle h-4 w-4" />
        Insights will appear here
      </div>
    );
  };

  return (
    <Card className="ai-glow-surface h-full">
      <CardContent className="p-3 h-full flex flex-col">
        {renderBody()}
      </CardContent>
    </Card>
  );
}
