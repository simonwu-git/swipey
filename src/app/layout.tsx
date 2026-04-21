import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { ThemeScript } from '@/components/ThemeScript'
import { ThemeProvider } from '@/lib/theme'
import { PrivacyProvider } from '@/lib/privacy'
import { NavClient } from '@/components/NavClient'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-sans',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: 'Swipey · Finances',
  description: 'AI-powered credit card spend management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${jakarta.variable} ${spaceGrotesk.variable}`}>
      <head>
        <ThemeScript />
      </head>
      <body className="font-sans">
        <ThemeProvider>
          <PrivacyProvider>
            <nav className="bg-card border-b border-border sticky top-0 z-40 backdrop-blur-sm bg-card/85">
              <div className="container mx-auto px-6 py-3.5">
                <div className="flex items-center justify-between gap-6">
                  <a href="/" className="font-display font-bold text-lg tracking-tight text-foreground hover:text-primary transition-colors">
                    Swipey
                  </a>
                  <NavClient />
                </div>
              </div>
            </nav>
            {children}
          </PrivacyProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
