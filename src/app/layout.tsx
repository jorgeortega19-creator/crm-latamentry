import type { Metadata } from 'next'
import './globals.css'

const clientName = process.env.NEXT_PUBLIC_CLIENT_NAME || 'Latam Entry'
const clientTheme = process.env.NEXT_PUBLIC_CLIENT_THEME || ''

export const metadata: Metadata = {
  title: `${clientName} CRM`,
  description: 'Revenue Enablement Platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" data-theme={clientTheme || undefined}>
      <body className="h-full">{children}</body>
    </html>
  )
}
