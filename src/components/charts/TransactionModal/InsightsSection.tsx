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
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePrivacy } from '@/lib/privacy';
import { parseInsights } from './parseInsights';
import { useInsightsStream } from './useInsightsStream';
import { GroupingCard } from './GroupingCard';
import type { Grouping } from '@/lib/groupings';

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
type ActiveSection = SectionKey | 'groups';

const BULLET_SECTIONS: SectionKey[] = ['patterns', 'suggestions'];

interface InsightsSectionProps {
  month: string | null;
  groupings: Grouping[];
  groupingsLoading: boolean;
  groupingsError: string | null;
  activeGroupingId: string | null;
  onGroupingClick: (id: string | null) => void;
  onGroupingsTabOpen: () => void;
  refreshGroupings: () => void;
  // Edit-mode props
  editingGroupingId: string | null;
  editingTxIds: Set<string>;
  isSaving: boolean;
  editError: string | null;
  onStartEdit: (id: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  transactions: Array<{ id: string; amount: number }>;
}


function renderContent(text: string, isBulletSection: boolean) {
  if (!text) return <span className="text-muted-foreground italic">No data</span>;

  if (isBulletSection) {
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

export function InsightsSection({
  month,
  groupings,
  groupingsLoading,
  groupingsError,
  activeGroupingId,
  onGroupingClick,
  onGroupingsTabOpen,
  refreshGroupings,
  editingGroupingId,
  editingTxIds,
  isSaving,
  editError,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  transactions,
}: InsightsSectionProps) {
  const { isPrivacyMode } = usePrivacy();
  const { insight, isLoading, error, refresh } = useInsightsStream(month);
  const [activeSection, setActiveSection] = useState<ActiveSection>('summary');

  const [prevMonth, setPrevMonth] = useState(month);
  if (prevMonth !== month) {
    setPrevMonth(month);
    setActiveSection('summary');
  }

  const parsed = useMemo(() => {
    if (!insight) return null;
    return parseInsights(insight);
  }, [insight]);

  const editingTotal = useMemo(() => {
    if (!editingGroupingId) return 0;
    return transactions
      .filter((t) => editingTxIds.has(t.id))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [editingGroupingId, editingTxIds, transactions]);

  const hasChanges = useMemo(() => {
    if (!editingGroupingId) return false;
    const original = groupings.find((g) => g.id === editingGroupingId);
    if (!original) return false;
    if (editingTxIds.size !== original.transactionIds.length) return true;
    return original.transactionIds.some((id) => !editingTxIds.has(id));
  }, [editingGroupingId, editingTxIds, groupings]);

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
            {activeSection !== 'groups' && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-6 w-6 p-0"
                onClick={refresh}
                title="Regenerate insights"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
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
                  <Button
                    variant={activeSection === 'groups' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={() => { onGroupingsTabOpen(); setActiveSection('groups'); }}
                  >
                    <Layers className="h-3 w-3" />
                    Groups
                  </Button>
                </div>
                <div className="text-sm">
                  {activeSection === 'groups' ? (
                    <div className="space-y-2">
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={refreshGroupings}
                          title="Regenerate groupings"
                          disabled={groupingsLoading || editingGroupingId !== null}
                        >
                          <RefreshCw className={cn('h-3 w-3', groupingsLoading && 'animate-spin')} />
                        </Button>
                      </div>
                      {groupingsLoading && groupings.length === 0 && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Analyzing groupings...
                        </div>
                      )}
                      {groupingsError && (
                        <span className="text-destructive">{groupingsError}</span>
                      )}
                      {!groupingsLoading && !groupingsError && groupings.length === 0 && (
                        <p className="text-muted-foreground italic">
                          No clear groupings for this month.
                        </p>
                      )}
                      {groupings.map((g) => {
                        const isEditing = g.id === editingGroupingId;
                        const isActive = g.id === activeGroupingId;
                        const isDimmed = editingGroupingId !== null && !isEditing;
                        return (
                          <GroupingCard
                            key={g.id}
                            grouping={g}
                            isEditing={isEditing}
                            isActive={isActive}
                            isDimmed={isDimmed}
                            editingTxIds={editingTxIds}
                            editingTotal={editingTotal}
                            isSaving={isSaving}
                            editError={editError}
                            hasChanges={hasChanges}
                            onCardClick={isDimmed || isEditing ? undefined : () => onGroupingClick(isActive ? null : g.id)}
                            onStartEdit={onStartEdit}
                            onCancelEdit={onCancelEdit}
                            onSaveEdit={onSaveEdit}
                          />
                        );
                      })}
                      {groupingsLoading && groupings.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Finding more...
                        </div>
                      )}
                    </div>
                  ) : (
                    renderContent(
                      parsed[activeSection as SectionKey],
                      BULLET_SECTIONS.includes(activeSection as SectionKey),
                    )
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
