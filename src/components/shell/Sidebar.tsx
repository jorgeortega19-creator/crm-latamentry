'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Icon from '@/components/ui/Icon'
import { CLIENT_LOGO, CLIENT_NAME, CLIENT_LABEL, SHOW_POWERED_BY } from '@/lib/branding'
import type { Profile } from '@/lib/types'

interface SidebarProps {
  user: Profile | null
  onClose?: () => void
}

const NAV = [
  { id: 'dashboard',  label: 'Dashboard',  icon: 'dashboard'  as const, path: '/dashboard' },
  { id: 'pipeline',   label: 'Pipeline',   icon: 'pipeline'   as const, path: '/pipeline' },
  { id: 'contacts',   label: 'Contacts',   icon: 'contacts'   as const, path: '/contacts' },
  { id: 'companies',  label: 'Companies',  icon: 'companies'  as const, path: '/companies' },
]
const NAV2 = [
  { id: 'reports',  label: 'Reports',  icon: 'reports'  as const, path: '/reports' },
  { id: 'settings', label: 'Settings', icon: 'settings' as const, path: '/settings' },
]

export default function Sidebar({ user, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const isActive = (path: string) => pathname.startsWith(path)

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside style={{
      width: 232, flex: '0 0 232px',
      borderRight: '1px solid var(--hairline)',
      background: '#0B0B0B',
      display: 'flex', flexDirection: 'column',
      height: '100vh',
    }}>
      {/* Brand */}
      <div style={{
        padding: '18px 20px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: '1px solid var(--hairline)',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: '#FFFFFF', padding: 4,
          display: 'grid', placeItems: 'center',
          flex: '0 0 auto',
          border: '1px solid var(--hairline)',
        }}>
          {CLIENT_LOGO ? (
            <Image
              src={CLIENT_LOGO}
              alt={CLIENT_NAME}
              width={36}
              height={36}
              /* Next's image optimizer 415s on SVG, and client logos may be
                 SVG (Measure) or raster (Setu). A 36px logo gains nothing
                 from optimization, so serve it as-is either way. */
              unoptimized
              style={{ objectFit: 'contain', width: 36, height: 36 }}
            />
          ) : (
            <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="18" fill="#1A2B4A"/>
              <path d="M10 18 L20 10 L30 18" stroke="#F97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 18 L14 26 L22 26 L22 18" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.02em' }}>{CLIENT_NAME}</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 3, fontWeight: 600 }}>{CLIENT_LABEL}</div>
        </div>
        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="sidebar-close-btn"
            style={{ width: 28, height: 28, borderRadius: 6, display: 'none', placeItems: 'center', color: 'var(--text-dim)', border: '1px solid var(--hairline)', background: 'transparent', cursor: 'pointer', flex: '0 0 auto' }}
          >
            <Icon name="x" size={14}/>
          </button>
        )}
      </div>

      {/* Nav */}
      <div style={{ padding: '20px 12px 8px', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 600 }}>Workspace</div>
      <nav style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(item => <NavItem key={item.id} item={item} active={isActive(item.path)} onClick={onClose}/>)}
      </nav>

      <div style={{ padding: '16px 12px 8px', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 600 }}>More</div>
      <nav style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV2.map(item => <NavItem key={item.id} item={item} active={isActive(item.path)} onClick={onClose}/>)}
      </nav>

      {/* Powered by Latam Entry */}
      {SHOW_POWERED_BY && (
        <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, borderTop: '1px solid var(--hairline)' }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>Powered by</div>
          <div style={{ background: '#fff', borderRadius: 8, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="18" height="18" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="18" fill="#1A2B4A"/>
              <path d="M10 18 L20 10 L30 18" stroke="#F97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 18 L14 26 L22 26 L22 18" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1A2B4A', letterSpacing: '0.01em' }}>Latam Entry</span>
          </div>
        </div>
      )}

      {/* User */}
      <div style={{
        marginTop: 'auto', padding: 12,
        borderTop: '1px solid var(--hairline)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, #2A2A2A, #1A1A1A)',
          display: 'grid', placeItems: 'center',
          color: 'var(--gold)', fontWeight: 700, fontSize: 12,
          border: '1px solid var(--hairline)', flex: '0 0 auto',
        }}>
          {user?.initials || 'U'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'User'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.role || 'Account Executive'}</div>
        </div>
        <button
          onClick={signOut}
          style={{ width: 28, height: 28, borderRadius: 6, display: 'grid', placeItems: 'center', color: 'var(--text-dim)', border: '1px solid transparent', background: 'transparent', cursor: 'pointer' }}
          title="Sign out"
        >
          <Icon name="logout" size={14}/>
        </button>
      </div>
    </aside>
  )
}

function NavItem({ item, active, onClick }: {
  item: { label: string; icon: Parameters<typeof Icon>[0]['name']; path: string }
  active: boolean
  onClick?: () => void
}) {
  return (
    <Link
      href={item.path}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '9px 12px', borderRadius: 8,
        color: active ? 'var(--text)' : 'var(--text-dim)',
        background: active ? 'var(--surface-2)' : 'transparent',
        fontSize: 13, fontWeight: active ? 600 : 500,
        position: 'relative',
        textDecoration: 'none',
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {active && (
        <span style={{
          position: 'absolute', left: -8, top: 8, bottom: 8,
          width: 2, borderRadius: 2, background: 'var(--gold)',
        }}/>
      )}
      <Icon name={item.icon} size={16}/>
      <span>{item.label}</span>
    </Link>
  )
}
