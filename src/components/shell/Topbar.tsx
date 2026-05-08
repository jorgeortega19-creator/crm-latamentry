'use client'

import Icon from '@/components/ui/Icon'
import GlobalSearch from './GlobalSearch'
import { useSidebar } from './SidebarContext'

interface TopbarProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export default function Topbar({ title, subtitle, action }: TopbarProps) {
  const { toggle } = useSidebar()

  return (
    <div style={{
      height: 60, flex: '0 0 60px',
      borderBottom: '1px solid var(--hairline)',
      display: 'flex', alignItems: 'center',
      padding: '0 24px', gap: 16,
      background: 'rgba(8,8,8,0.85)',
      backdropFilter: 'blur(8px)',
    }}>
      {/* Hamburger — mobile only */}
      <button
        className="hamburger-btn"
        onClick={toggle}
        style={{ width: 32, height: 32, borderRadius: 8, display: 'none', placeItems: 'center', color: 'var(--text)', border: '1px solid var(--hairline)', background: 'var(--surface-2)', cursor: 'pointer', flex: '0 0 auto' }}
      >
        <Icon name="menu" size={16}/>
      </button>

      <div style={{ flex: '0 0 auto', minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{subtitle}</div>}
      </div>

      <GlobalSearch/>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
        {action}
      </div>
    </div>
  )
}
