import { describe, it, expect } from 'vitest'
import { parseInsights } from './parseInsights'

describe('parseInsights', () => {
  it('parses all 3 sections correctly', () => {
    const raw =
      '[SPOTLIGHT] Spot content [PATTERNS] Pat content [SUGGESTIONS] Sug content'
    const result = parseInsights(raw)
    expect(result).toEqual({
      spotlight: 'Spot content',
      patterns: 'Pat content',
      suggestions: 'Sug content',
    })
  })

  it('returns null for a legacy string with no labels', () => {
    expect(parseInsights('Just some plain text insight')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(parseInsights('')).toBeNull()
  })

  it('returns null for old four-section format (legacy cache)', () => {
    const raw = '[SUMMARY] Sum content [PATTERNS] Pat content [COMPARISON] Comp content [SUGGESTIONS] Sug content'
    expect(parseInsights(raw)).toBeNull()
  })

  it('parses sections in non-standard order', () => {
    const raw = '[SUGGESTIONS] First [SPOTLIGHT] Second [PATTERNS] Third'
    const result = parseInsights(raw)
    expect(result).toEqual({
      spotlight: 'Second',
      patterns: 'Third',
      suggestions: 'First',
    })
  })

  it('defaults missing sections to empty string', () => {
    const raw = '[SPOTLIGHT] Only spotlight here'
    const result = parseInsights(raw)
    expect(result).toEqual({
      spotlight: 'Only spotlight here',
      patterns: '',
      suggestions: '',
    })
  })

  it('ignores preamble before the first label', () => {
    const raw = 'Some preamble text\n[SPOTLIGHT] The spotlight [PATTERNS] The patterns'
    const result = parseInsights(raw)
    expect(result?.spotlight).toBe('The spotlight')
    expect(result?.patterns).toBe('The patterns')
  })

  it('preserves multiline content within a section', () => {
    const raw = '[SPOTLIGHT] Line one\nLine two\nLine three [PATTERNS] Pat'
    const result = parseInsights(raw)
    expect(result?.spotlight).toBe('Line one\nLine two\nLine three')
    expect(result?.patterns).toBe('Pat')
  })
})
