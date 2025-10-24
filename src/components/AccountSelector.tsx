'use client'

import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
      <div className="text-muted-foreground">Loading accounts...</div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="text-muted-foreground">
        No accounts found. <a href="/accounts" className="text-primary hover:underline">Create an account</a> first.
      </div>
    )
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select an account..." />
      </SelectTrigger>
      <SelectContent>
        {accounts.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            {account.name} ({account.bankType})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
