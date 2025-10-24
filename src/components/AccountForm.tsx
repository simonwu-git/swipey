'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {account ? 'Edit Account' : 'Add New Account'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Account Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., Chase Sapphire ****2313"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankType">Bank Type</Label>
            <Select
              name="bankType"
              value={formData.bankType}
              onValueChange={(value) =>
                setFormData(prev => ({ ...prev, bankType: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chase">Chase</SelectItem>
                <SelectItem value="capital_one">Capital One</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tableKey">Table Key</Label>
            <Input
              id="tableKey"
              name="tableKey"
              value={formData.tableKey}
              onChange={handleChange}
              required
              placeholder="e.g., chase_2313"
            />
            <p className="text-sm text-muted-foreground">
              Unique identifier for this account (used for database table naming)
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {account ? 'Update' : 'Create'} Account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
