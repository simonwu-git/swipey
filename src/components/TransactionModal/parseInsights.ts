export interface ParsedInsights {
  spotlight: string;
  patterns: string;
  suggestions: string;
}

const SECTION_RE = /\[(SPOTLIGHT|PATTERNS|SUGGESTIONS)\]/;
const LEGACY_RE = /\[(SUMMARY|COMPARISON)\]/;

/**
 * Parse a raw insight string into structured sections.
 * Returns null if no section labels are found, or if the response uses the
 * old four-section format (SUMMARY/COMPARISON) so legacy cache hits fall
 * through to plain-text rendering instead of showing empty tabs.
 */
export function parseInsights(raw: string): ParsedInsights | null {
  if (LEGACY_RE.test(raw)) return null;
  if (!SECTION_RE.test(raw)) return null;

  const sections: Record<string, string> = {};

  const parts = raw.split(SECTION_RE);
  // parts: [preamble, "SPOTLIGHT", content, "PATTERNS", content, ...]
  for (let i = 1; i < parts.length; i += 2) {
    sections[parts[i].toLowerCase()] = parts[i + 1].trim();
  }

  return {
    spotlight: sections.spotlight ?? '',
    patterns: sections.patterns ?? '',
    suggestions: sections.suggestions ?? '',
  };
}
