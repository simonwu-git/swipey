import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeScript } from '@/components/ThemeScript'
import { ThemeProvider } from '@/lib/theme'
import { NavClient } from '@/components/NavClient'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Finances Web',
  description: 'Transaction import and management system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <nav className="bg-white dark:bg-gray-900 shadow-sm border-b dark:border-gray-700">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-end">
                <NavClient />
              </div>
            </div>
          </nav>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}