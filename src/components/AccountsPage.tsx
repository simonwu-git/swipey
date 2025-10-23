'use client'

import { useState, useEffect } from 'react'
import { AccountForm } from './AccountForm'

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
        <button
          onClick={handleAddAccount}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Add Account
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No accounts found</p>
          <button
            onClick={handleAddAccount}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Create your first account
          </button>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {accounts.map((account) => (
              <li key={account.id}>
                <div className="px-4 py-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-medium">
                            {account.bankType.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {account.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {account.bankType} • {account.tableKey}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditAccount(account)}
                      className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(account.id)}
                      className="text-red-600 hover:text-red-900 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
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
