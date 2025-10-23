import { Transaction, BankParser } from '../types'

export abstract class BaseTransactionParser implements BankParser {
  protected csvContent: string

  constructor(csvContent: string) {
    this.csvContent = csvContent
  }

  abstract getExpectedHeaders(): string[]
  abstract getBankName(): string
  abstract cleanTransaction(row: Record<string, string>): Transaction | null

  parseCsv(): Transaction[] {
    const lines = this.csvContent.split('\n').filter(line => line.trim())
    if (lines.length < 2) return []

    const headers = this.parseHeaders(lines[0])
    this.validateHeaders(headers)

    const transactions: Transaction[] = []

    for (let i = 1; i < lines.length; i++) {
      try {
        const row = this.parseRow(lines[i], headers)
        const transaction = this.cleanTransaction(row)
        if (transaction) {
          transactions.push(transaction)
        }
      } catch (error) {
        console.warn(`Skipping invalid transaction at line ${i + 1}:`, error)
        continue
      }
    }

    return transactions
  }

  private parseHeaders(headerLine: string): string[] {
    return headerLine.split(',').map(h => h.trim().replace(/"/g, ''))
  }

  private parseRow(rowLine: string, headers: string[]): Record<string, string> {
    const values = this.parseCsvRow(rowLine)
    const row: Record<string, string> = {}
    
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    
    return row
  }

  private parseCsvRow(row: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current.trim())
    return result
  }

  private validateHeaders(headers: string[]): void {
    if (!headers.length) {
      throw new Error('CSV file has no headers')
    }

    const expectedHeaders = this.getExpectedHeaders()
    const missingHeaders = expectedHeaders.filter(h => !headers.includes(h))

    if (missingHeaders.length > 0) {
      throw new Error(
        `CSV file missing required headers for ${this.getBankName()}: ${missingHeaders.join(', ')}`
      )
    }
  }

  protected parseDate(dateStr: string, formats: string[] = ['%m/%d/%y', '%m/%d/%Y', '%Y-%m-%d', '%m-%d-%Y']): Date | null {
    if (!dateStr || dateStr.trim() === '') return null

    const cleaned = dateStr.trim()
    
    for (const format of formats) {
      try {
        // Convert Python strptime format to JavaScript
        const jsFormat = format
          .replace('%m', 'MM')
          .replace('%d', 'DD')
          .replace('%y', 'YY')
          .replace('%Y', 'YYYY')
        
        // Simple date parsing for common formats
        if (format === '%m/%d/%y') {
          const [month, day, year] = cleaned.split('/')
          const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year)
          return new Date(fullYear, parseInt(month) - 1, parseInt(day))
        } else if (format === '%m/%d/%Y') {
          const [month, day, year] = cleaned.split('/')
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        }
      } catch (error) {
        continue
      }
    }

    console.warn(`Could not parse date: ${dateStr}`)
    return null
  }

  protected parseAmount(amountStr: string): number {
    if (!amountStr || amountStr.trim() === '') return 0

    const cleaned = amountStr.trim().replace(/[$,\s]/g, '')
    
    try {
      return parseFloat(cleaned)
    } catch (error) {
      console.warn(`Could not parse amount: ${amountStr}`)
      return 0
    }
  }

  protected normalizeText(text: string): string {
    if (!text) return ''
    return text.trim()
  }
}
