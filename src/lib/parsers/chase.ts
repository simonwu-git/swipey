import { Transaction } from '../types'
import { BaseTransactionParser } from './base'

export class ChaseTransactionParser extends BaseTransactionParser {
  getBankName(): string {
    return 'Chase'
  }

  getExpectedHeaders(): string[] {
    return [
      'Transaction Date',
      'Post Date',
      'Description',
      'Category',
      'Type',
      'Amount'
    ]
  }

  cleanTransaction(row: Record<string, string>): Transaction | null {
    try {
      const transactionDate = this.parseDate(row['Transaction Date'] || '')
      const postDate = this.parseDate(row['Post Date'] || '')
      const amount = this.parseAmount(row['Amount'] || '0')
      const description = this.normalizeText(row['Description'] || '')
      const category = this.normalizeText(row['Category'] || '')
      const transactionType = this.normalizeText(row['Type'] || '')

      return {
        transaction_date: transactionDate || new Date(),
        post_date: postDate || undefined,
        description,
        category: category || undefined,
        transaction_type: transactionType || undefined,
        amount,
        created_at: new Date()
      }
    } catch (error) {
      console.warn('Error cleaning Chase transaction:', error)
      return null
    }
  }
}
