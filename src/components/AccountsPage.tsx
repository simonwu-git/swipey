'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AccountForm } from './AccountForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { SpendingLineChart } from '@/components/charts/SpendingLineChart'
import { TransactionModal } from '@/components/charts/TransactionModal'

interface Account {
  id: string
  name: string
  tableKey: string
  bankType: string
  createdAt: string
}

interface AggregateData {
  month: string
  [accountName: string]: string | number
}

export function AccountsPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [aggregateData, setAggregateData] = useState<AggregateData[]>([])
  const [accountNames, setAccountNames] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingChart, setIsLoadingChart] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)

  useEffect(() => {
    fetchAccounts()
    fetchAggregateData()
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

  const fetchAggregateData = async () => {
    try {
      const response = await fetch('/api/transactions/aggregate')
      if (response.ok) {
        const result = await response.json()
        setAggregateData(result.data)
        setAccountNames(result.accounts)
      }
    } catch (error) {
      console.error('Failed to fetch aggregate data:', error)
    } finally {
      setIsLoadingChart(false)
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

  const handleMonthClick = (month: string) => {
    setSelectedMonth(month)
    setShowTransactionModal(true)
  }

  const handleNavigateMonth = (direction: 'prev' | 'next') => {
    const availableMonths = aggregateData.map(d => d.month)
    const currentIndex = availableMonths.indexOf(selectedMonth!)
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1
    if (newIndex >= 0 && newIndex < availableMonths.length) {
      setSelectedMonth(availableMonths[newIndex])
    }
  }

  const getNavigationState = () => {
    const availableMonths = aggregateData.map(d => d.month)
    const currentIndex = availableMonths.indexOf(selectedMonth!)
    return {
      canNavigatePrev: currentIndex > 0,
      canNavigateNext: currentIndex < availableMonths.length - 1,
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
      {/* Spending Overview Section */}
      {!isLoadingChart && aggregateData.length > 0 && accountNames.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <SpendingLineChart
              data={aggregateData}
              accounts={accountNames}
              title="Spending Overview"
              onMonthClick={handleMonthClick}
            />
          </CardContent>
        </Card>
      )}

      {isLoadingChart && (
        <Card>
          <CardContent className="p-6">
            <div className="text-gray-500">Loading spending data...</div>
          </CardContent>
        </Card>
      )}

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
                    <div
                      className="flex-1 cursor-pointer hover:bg-gray-50 -mx-4 px-4 py-2 rounded transition-colors"
                      onClick={() => router.push(`/accounts/${account.id}`)}
                    >
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
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditAccount(account)
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteAccount(account.id)
                        }}
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

      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        month={selectedMonth}
        accounts={accounts.map(acc => ({ id: acc.id, name: acc.name }))}
        onNavigateMonth={handleNavigateMonth}
        canNavigatePrev={getNavigationState().canNavigatePrev}
        canNavigateNext={getNavigationState().canNavigateNext}
      />
    </div>
  )
}
