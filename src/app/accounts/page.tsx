import { AccountsPage } from '@/components/AccountsPage'

export default function Accounts() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Account Management
        </h1>
        <AccountsPage />
      </div>
    </main>
  )
}
