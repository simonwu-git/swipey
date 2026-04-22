const BANK_LABELS: Record<string, string> = {
  chase: 'Chase',
  capital_one: 'Capital One',
};

/**
 * Build a clean "Chase •••• 2493" label from an account's bankType + tableKey.
 * tableKey stores a bank-prefixed id like "chase_2493" or "c1_2433"; the
 * subtitle on the accounts page was rendering both fields verbatim, which
 * duplicated the bank. We pull the trailing digits off tableKey and pair
 * them with a humanized bank name.
 *
 * Falls back to the raw "{bankType} • {tableKey}" string if no digits are
 * present, so unusual data never renders as a half-broken label.
 */
export function formatAccountLabel(bankType: string, tableKey: string): string {
  const digits = tableKey.match(/(\d+)\s*$/)?.[1];
  if (!digits) return `${bankType} • ${tableKey}`;
  const bank = BANK_LABELS[bankType] ?? bankType.replace(/_/g, ' ');
  return `${bank} •••• ${digits}`;
}
