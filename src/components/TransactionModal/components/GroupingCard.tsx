'use client';

import { Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Grouping } from '@/lib/groupings';

export interface GroupingCardProps {
  grouping: Grouping;
  isEditing: boolean;
  isActive: boolean;
  isDimmed: boolean;
  editingTxIds: Set<string>;
  editingTotal: number;
  isSaving: boolean;
  editError: string | null;
  hasChanges: boolean;
  onCardClick?: () => void;
  onStartEdit: (id: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
}

export function GroupingCard({
  grouping: g,
  isEditing,
  isActive,
  isDimmed,
  editingTxIds,
  editingTotal,
  isSaving,
  editError,
  hasChanges,
  onCardClick,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
}: GroupingCardProps) {
  return (
    <div
      role={onCardClick ? 'button' : undefined}
      tabIndex={onCardClick ? 0 : undefined}
      onClick={onCardClick}
      className={cn(
        'rounded-lg border p-3 transition-colors',
        isEditing || isActive ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-card',
        isDimmed && 'opacity-50 pointer-events-none',
        !isEditing && !isDimmed && 'cursor-pointer',
        !isEditing && !isActive && !isDimmed && 'hover:bg-muted',
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-display font-medium">{g.name}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground tabular-nums">
            {isEditing
              ? `${editingTxIds.size} tx · $${editingTotal.toFixed(2)}`
              : `${g.transactionIds.length} tx · $${g.total.toFixed(2)}`}
          </span>
          {!isEditing && !isDimmed && isActive && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 p-0 shrink-0"
              onClick={(e) => { e.stopPropagation(); onStartEdit(g.id); }}
              title="Edit group members"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      {isEditing ? (
        <div className="space-y-1.5 mt-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onCancelEdit}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 px-2 text-xs ml-auto"
              onClick={onSaveEdit}
              disabled={isSaving || editingTxIds.size < 2 || !hasChanges}
            >
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
            </Button>
          </div>
          {editError && (
            <p className="text-xs text-destructive">{editError}</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{g.why}</p>
      )}
    </div>
  );
}
