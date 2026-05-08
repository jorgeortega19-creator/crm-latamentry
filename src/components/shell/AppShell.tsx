'use client'

import { useState } from 'react'
import { SidebarContext } from './SidebarContext'
import Sidebar from './Sidebar'
import type { Profile } from '@/lib/types'

interface Props {
  profile: Profile | null
  children: React.ReactNode
}

export default function AppShell({ profile, children }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <SidebarContext.Provider value={{ open, toggle: () => setOpen(v => !v), close: () => setOpen(false) }}>
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
        {/* Mobile backdrop */}
        {open && (
          <div
            className="sidebar-backdrop"
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 299, backdropFilter: 'blur(2px)' }}
          />
        )}

        {/* Sidebar — always rendered; CSS handles mobile vs desktop */}
        <div className={`sidebar-wrapper${open ? ' sidebar-open' : ''}`}>
          <Sidebar user={profile} onClose={() => setOpen(false)}/>
        </div>

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {children}
        </main>
      </div>
    </SidebarContext.Provider>
  )
}
