'use client'

import { useState, useEffect } from 'react'
import { AccountForm } from './AccountForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface Account {
  id: string
  name: string
  tableKey: string
  bankType: string
  createdAt: string
}

export function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)

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

  const handleAddAccount = () => {
    setEditingAccount(null)
    setShowForm(true)
  }

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account)
    setShowForm(true)
  }

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return

    try {
      const response = await fetch(`/api/accounts/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setAccounts(accounts.filter(account => account.id !== id))
      } else {
        alert('Failed to delete account')
      }
    } catch (error) {
      console.error('Failed to delete account:', error)
      alert('Failed to delete account')
    }
  }

  const handleFormSubmit = async (accountData: Omit<Account, 'id' | 'createdAt'>) => {
    try {
      const url = editingAccount ? `/api/accounts/${editingAccount.id}` : '/api/accounts'
      const method = editingAccount ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(accountData)
      })

      if (response.ok) {
        const updatedAccount = await response.json()
        
        if (editingAccount) {
          setAccounts(accounts.map(acc => 
            acc.id === editingAccount.id ? updatedAccount : acc
          ))
        } else {
          setAccounts([updatedAccount, ...accounts])
        }
        
        setShowForm(false)
        setEditingAccount(null)
      } else {
        alert('Failed to save account')
      }
    } catch (error) {
      console.error('Failed to save account:', error)
      alert('Failed to save account')
    }
  }

  if (isLoading) {
    return <div className="text-gray-500">Loading accounts...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">
          Your Accounts ({accounts.length})
        </h2>
        <Button onClick={handleAddAccount}>
          Add Account
        </Button>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No accounts found</p>
          <Button onClick={handleAddAccount}>
            Create your first account
          </Button>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {accounts.map((account) => (
                <li key={account.id}>
                  <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <Avatar>
                          <AvatarFallback>
                            {account.bankType.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="ml-4">
                          <div className="text-sm font-medium">
                            {account.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {account.bankType} • {account.tableKey}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditAccount(account)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAccount(account.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <AccountForm
          account={editingAccount}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false)
            setEditingAccount(null)
          }}
        />
      )}
    </div>
  )
}
