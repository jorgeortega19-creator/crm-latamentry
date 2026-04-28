'use client'

import Icon from '@/components/ui/Icon'

interface TopbarProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export default function Topbar({ title, subtitle, action }: TopbarProps) {
  return (
    <div style={{
      height: 60, flex: '0 0 60px',
      borderBottom: '1px solid var(--hairline)',
      display: 'flex', alignItems: 'center',
      padding: '0 24px', gap: 16,
      background: 'rgba(8,8,8,0.85)',
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{ flex: '0 0 auto', minWidth: 200 }}>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{subtitle}</div>}
      </div>

      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 14px',
        background: 'var(--surface-1)',
        border: '1px solid var(--hairline)',
        borderRadius: 8, maxWidth: 480,
      }}>
        <Icon name="search" size={14} color="var(--text-dim)"/>
        <input
          placeholder="Search contacts, deals, companies…"
          style={{
            flex: 1, background: 'transparent', border: 'none',
            outline: 'none', fontSize: 13, color: 'var(--text)',
            padding: 0,
          }}
        />
        <span style={{
          fontSize: 10, padding: '2px 6px',
          border: '1px solid var(--hairline-strong)',
          borderRadius: 4, color: 'var(--text-muted)',
          fontFamily: 'JetBrains Mono, monospace',
        }}>⌘K</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button style={{
          width: 36, height: 36, borderRadius: 8,
          display: 'grid', placeItems: 'center',
          color: 'var(--text-dim)', border: '1px solid transparent',
          background: 'transparent', position: 'relative',
        }}>
          <Icon name="bell" size={16}/>
          <span style={{
            position: 'absolute', top: 8, right: 9,
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--gold)', border: '2px solid var(--bg)',
          }}/>
        </button>
        {action}
      </div>
    </div>
  )
}
