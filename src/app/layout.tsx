import type { Metadata } from 'next'
import './globals.css'
import { CLIENT_NAME, CLIENT_THEME } from '@/lib/branding'

export const metadata: Metadata = {
  title: `${CLIENT_NAME} CRM`,
  description: 'Revenue Enablement Platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" data-theme={CLIENT_THEME || undefined}>
      <body className="h-full">{children}</body>
    </html>
  )
}
