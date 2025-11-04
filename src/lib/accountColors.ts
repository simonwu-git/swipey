// Predefined color palette for accounts
const COLORS = [
  '#2563eb', // blue
  '#dc2626', // red
  '#16a34a', // green
  '#9333ea', // purple
  '#ea580c', // orange
  '#0891b2', // cyan
  '#ca8a04', // yellow
  '#db2777', // pink
];

// Custom colors for specific accounts
const ACCOUNT_COLORS: Record<string, string> = {
  'Savor': '#ea580c', // orange
  'Venture X': '#1e3a8a', // dark blue
  'Freedom': '#6b7280', // grey
  'Preferred': '#60a5fa', // light blue
};

/**
 * Get the color for a given account name.
 * Returns a custom color if defined, otherwise uses the default palette.
 */
export function getAccountColor(accountName: string, index: number = 0): string {
  return ACCOUNT_COLORS[accountName] || COLORS[index % COLORS.length];
}

/**
 * Get all account names that have custom colors defined.
 */
export function getCustomColorAccounts(): string[] {
  return Object.keys(ACCOUNT_COLORS);
}
