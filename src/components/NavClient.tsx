'use client';

import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { PrivacyToggle } from './PrivacyToggle';

export function NavClient() {
  return (
    <div className="flex items-center gap-1.5">
      <Link
        href="/accounts"
        className="text-muted-foreground hover:text-primary hover:bg-secondary px-3 py-1.5 rounded-md text-sm font-semibold transition-colors"
      >
        Accounts
      </Link>
      <div className="w-px h-5 bg-border mx-1" />
      <PrivacyToggle />
      <ThemeToggle />
    </div>
  );
}
