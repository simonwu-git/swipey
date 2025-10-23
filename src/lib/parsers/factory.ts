import { BankParser, BankType } from '../types'
import { ChaseTransactionParser } from './chase'
import { CapitalOneTransactionParser } from './capitalOne'

export class ParserFactory {
  private static parsers = {
    chase: ChaseTransactionParser,
    capital_one: CapitalOneTransactionParser,
  }

  static createParser(csvContent: string, bankType?: BankType): BankParser {
    if (bankType) {
      return this.createByBankType(csvContent, bankType)
    } else {
      return this.autoDetectParser(csvContent)
    }
  }

  private static createByBankType(csvContent: string, bankType: BankType): BankParser {
    const normalizedType = bankType.toLowerCase().replace(' ', '_') as BankType
    
    if (!(normalizedType in this.parsers)) {
      const available = Object.keys(this.parsers).join(', ')
      throw new Error(`Unknown bank type '${bankType}'. Available: ${available}`)
    }

    const ParserClass = this.parsers[normalizedType as keyof typeof this.parsers]
    return new ParserClass(csvContent)
  }

  private static autoDetectParser(csvContent: string): BankParser {
    const headers = this.getCsvHeaders(csvContent)
    console.log('Detected CSV headers:', headers)

    for (const [bankName, ParserClass] of Object.entries(this.parsers)) {
      try {
        const tempParser = new ParserClass(csvContent)
        const expectedHeaders = tempParser.getExpectedHeaders()
        
        if (expectedHeaders.every(header => headers.includes(header))) {
          console.log(`Auto-detected bank type: ${bankName}`)
          return new ParserClass(csvContent)
        }
      } catch (error) {
        console.debug(`Parser ${bankName} failed header validation:`, error)
        continue
      }
    }

    const availableParsers = Object.keys(this.parsers)
    throw new Error(
      `Could not auto-detect bank type from CSV headers. ` +
      `Available parsers: ${availableParsers.join(', ')}. ` +
      `Please specify bank type.`
    )
  }

  private static getCsvHeaders(csvContent: string): string[] {
    const firstLine = csvContent.split('\n')[0]
    if (!firstLine) {
      throw new Error('CSV content is empty')
    }
    
    return firstLine.split(',').map(h => h.trim().replace(/"/g, ''))
  }

  static getAvailableBanks(): string[] {
    return Object.keys(this.parsers)
  }
}
