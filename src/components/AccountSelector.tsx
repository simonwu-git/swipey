'use client'

import { useState, useEffect } from 'react'

interface Account {
  id: string
  name: string
  tableKey: string
  bankType: string
}

interface AccountSelectorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function AccountSelector({ value, onChange, disabled }: AccountSelectorProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data)
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="text-gray-500">Loading accounts...</div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="text-gray-500">
        No accounts found. <a href="/accounts" className="text-blue-600 hover:underline">Create an account</a> first.
      </div>
    )
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <option value="">Select an account...</option>
      {accounts.map((account) => (
        <option key={account.id} value={account.id}>
          {account.name} ({account.bankType})
        </option>
      ))}
    </select>
  )
}
