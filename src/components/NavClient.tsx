'use client';

import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';

export function NavClient() {
  return (
    <div className="flex items-center space-x-2">
      <Link
        href="/accounts"
        className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium"
      >
        Accounts
      </Link>
      <ThemeToggle />
    </div>
  );
}
