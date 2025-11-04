import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Image from 'next/image'
import './globals.css'

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
    <html lang="en">
      <body className={inter.className}>
        <nav className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Image
                  src="/rocket.png"
                  alt="Rocket icon"
                  width={65}
                  height={65}
                  className="object-contain mix-blend-multiply"
                  style={{ filter: 'brightness(1.2) contrast(1.1)' }}
                />
              </div>
              <div className="flex space-x-4">
                <a
                  href="/accounts"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Accounts
                </a>
              </div>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}