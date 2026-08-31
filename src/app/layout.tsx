import type { Metadata } from 'next'
import './globals.css'
import { CLIENT_NAME, CLIENT_LABEL, CLIENT_THEME } from '@/lib/branding'

export const metadata: Metadata = {
  title: `${CLIENT_NAME} CRM`,
  // Shown in link previews (WhatsApp, Slack, search results). Derived from the
  // same two values the UI shows, so it needs no extra env var per deployment.
  description: `${CLIENT_NAME} · ${CLIENT_LABEL}`,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" data-theme={CLIENT_THEME || undefined}>
      <body className="h-full">{children}</body>
    </html>
  )
}
