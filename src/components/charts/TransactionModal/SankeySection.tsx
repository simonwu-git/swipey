'use client';

import { CategorySankeyChart } from '../CategorySankeyChart';
import { Transaction } from './types';

function LoadingSpinner() {
  return (
    <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  );
}

interface SankeySectionProps {
  transactions: Transaction[];
  isLoading: boolean;
}

export function SankeySection({ transactions, isLoading }: SankeySectionProps) {
  const hasData = transactions.length > 0;

  if (hasData) {
    return (
      <>
        <CategorySankeyChart transactions={transactions} height="100%" />
        {isLoading && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-lg">
            <LoadingSpinner />
          </div>
        )}
      </>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center text-muted-foreground">
      No data to display
    </div>
  );
}
