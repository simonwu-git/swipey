export interface ParsedInsights {
  summary: string;
  patterns: string;
  comparison: string;
  suggestions: string;
}

const SECTION_RE = /\[(SUMMARY|PATTERNS|COMPARISON|SUGGESTIONS)\]/;

/**
 * Parse a raw insight string into structured sections.
 * Returns null if no section labels are found (legacy/cached responses).
 */
export function parseInsights(raw: string): ParsedInsights | null {
  if (!SECTION_RE.test(raw)) return null;

  const sections: Record<string, string> = {};

  const parts = raw.split(SECTION_RE);
  // parts: [preamble, "SUMMARY", content, "PATTERNS", content, ...]
  for (let i = 1; i < parts.length; i += 2) {
    sections[parts[i].toLowerCase()] = parts[i + 1].trim();
  }

  return {
    summary: sections.summary ?? '',
    patterns: sections.patterns ?? '',
    comparison: sections.comparison ?? '',
    suggestions: sections.suggestions ?? '',
  };
}
