'use client'

import { useState } from 'react'

interface Account {
  id: string
  name: string
  tableKey: string
  bankType: string
  createdAt: string
}

interface AccountFormProps {
  account?: Account | null
  onSubmit: (data: Omit<Account, 'id' | 'createdAt'>) => void
  onCancel: () => void
}

export function AccountForm({ account, onSubmit, onCancel }: AccountFormProps) {
  const [formData, setFormData] = useState({
    name: account?.name || '',
    tableKey: account?.tableKey || '',
    bankType: account?.bankType || 'chase'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {account ? 'Edit Account' : 'Add New Account'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Account Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Chase Sapphire ****2313"
              />
            </div>

            <div>
              <label htmlFor="bankType" className="block text-sm font-medium text-gray-700">
                Bank Type
              </label>
              <select
                id="bankType"
                name="bankType"
                value={formData.bankType}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="chase">Chase</option>
                <option value="capital_one">Capital One</option>
              </select>
            </div>

            <div>
              <label htmlFor="tableKey" className="block text-sm font-medium text-gray-700">
                Table Key
              </label>
              <input
                type="text"
                id="tableKey"
                name="tableKey"
                value={formData.tableKey}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., chase_2313"
              />
              <p className="mt-1 text-sm text-gray-500">
                Unique identifier for this account (used for database table naming)
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              >
                {account ? 'Update' : 'Create'} Account
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
