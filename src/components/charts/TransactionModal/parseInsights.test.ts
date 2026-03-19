import { describe, it, expect } from 'vitest'
import { parseInsights } from './parseInsights'

describe('parseInsights', () => {
  it('parses all 4 sections correctly', () => {
    const raw =
      '[SUMMARY] Sum content [PATTERNS] Pat content [COMPARISON] Comp content [SUGGESTIONS] Sug content'
    const result = parseInsights(raw)
    expect(result).toEqual({
      summary: 'Sum content',
      patterns: 'Pat content',
      comparison: 'Comp content',
      suggestions: 'Sug content',
    })
  })

  it('returns null for a legacy string with no labels', () => {
    expect(parseInsights('Just some plain text insight')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(parseInsights('')).toBeNull()
  })

  it('parses sections in non-standard order', () => {
    const raw = '[SUGGESTIONS] First [SUMMARY] Second [COMPARISON] Third [PATTERNS] Fourth'
    const result = parseInsights(raw)
    expect(result).toEqual({
      summary: 'Second',
      patterns: 'Fourth',
      comparison: 'Third',
      suggestions: 'First',
    })
  })

  it('defaults missing sections to empty string', () => {
    const raw = '[SUMMARY] Only summary here'
    const result = parseInsights(raw)
    expect(result).toEqual({
      summary: 'Only summary here',
      patterns: '',
      comparison: '',
      suggestions: '',
    })
  })

  it('ignores preamble before the first label', () => {
    const raw = 'Some preamble text\n[SUMMARY] The summary [PATTERNS] The patterns'
    const result = parseInsights(raw)
    expect(result?.summary).toBe('The summary')
    expect(result?.patterns).toBe('The patterns')
  })

  it('preserves multiline content within a section', () => {
    const raw = '[SUMMARY] Line one\nLine two\nLine three [PATTERNS] Pat'
    const result = parseInsights(raw)
    expect(result?.summary).toBe('Line one\nLine two\nLine three')
    expect(result?.patterns).toBe('Pat')
  })
})
