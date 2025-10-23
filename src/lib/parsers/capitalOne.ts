import { Transaction } from '../types'
import { BaseTransactionParser } from './base'

export class CapitalOneTransactionParser extends BaseTransactionParser {
  getBankName(): string {
    return 'Capital One'
  }

  getExpectedHeaders(): string[] {
    return [
      'Transaction Date',
      'Posted Date',
      'Card No.',
      'Description',
      'Category',
      'Debit',
      'Credit'
    ]
  }

  cleanTransaction(row: Record<string, string>): Transaction | null {
    try {
      const transactionDate = this.parseDate(row['Transaction Date'] || '')
      const postDate = this.parseDate(row['Posted Date'] || '')
      const description = this.normalizeText(row['Description'] || '')
      const category = this.normalizeText(row['Category'] || '')
      
      // Capital One has separate Debit and Credit columns
      const debit = this.parseAmount(row['Debit'] || '0')
      const credit = this.parseAmount(row['Credit'] || '0')
      const amount = credit > 0 ? credit : -debit

      return {
        transaction_date: transactionDate || new Date(),
        post_date: postDate || undefined,
        description,
        category: category || undefined,
        transaction_type: amount > 0 ? 'Credit' : 'Debit',
        amount,
        created_at: new Date()
      }
    } catch (error) {
      console.warn('Error cleaning Capital One transaction:', error)
      return null
    }
  }
}
