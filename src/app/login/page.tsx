'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { CLIENT_LOGO, CLIENT_NAME, CLIENT_LABEL } from '@/lib/branding'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{
        width: 'min(420px, 100%)',
        background: 'var(--surface-1)',
        border: '1px solid var(--hairline-strong)',
        borderRadius: 16, padding: '36px 36px 32px',
        boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
      }} className="animate-modal-in">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: 12, background: '#F5F5F5', padding: 6, display: 'grid', placeItems: 'center' }}>
            {CLIENT_LOGO ? (
              <Image
                src={CLIENT_LOGO}
                alt={CLIENT_NAME}
                width={36}
                height={36}
                /* Next's image optimizer rejects SVG with a 415, and client
                   logos may be SVG (Measure) or raster (Setu). Nothing to gain
                   from optimizing a 36px logo, so serve it as-is either way. */
                unoptimized
                style={{ objectFit: 'contain', width: 36, height: 36 }}
              />
            ) : (
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <circle cx="18" cy="18" r="18" fill="#1A2B4A"/>
                <path d="M10 18 L20 10 L30 18" stroke="#F97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 18 L14 26 L22 26 L22 18" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        </div>

        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', textAlign: 'center', marginBottom: 6 }}>
          Welcome back
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 24 }}>
          Sign in to the {CLIENT_NAME} CRM
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={labelStyle}>Email</div>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(null) }}
            placeholder="you@company.com"
            style={inputStyle(!!error)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        <div style={{ marginBottom: 6 }}>
          <div style={labelStyle}>Password</div>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null) }}
              placeholder="••••••••"
              style={{ ...inputStyle(!!error), paddingRight: 40 }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, fontSize: 16 }}
            >
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>
          {error && <div style={{ fontSize: 11, color: 'var(--negative)', marginTop: 6 }}>{error}</div>}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', padding: '11px 18px', marginTop: 16,
            fontSize: 13, fontWeight: 600, borderRadius: 8,
            background: 'var(--gold)', opacity: loading ? 0.6 : 1,
            color: '#080808', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', marginTop: 28, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          {CLIENT_NAME} · {CLIENT_LABEL}
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: 'var(--text-dim)', fontWeight: 600,
  letterSpacing: '0.04em', marginBottom: 6,
}

const inputStyle = (err: boolean): React.CSSProperties => ({
  width: '100%', background: 'var(--surface-2)',
  border: '1px solid ' + (err ? 'var(--negative)' : 'var(--hairline)'),
  borderRadius: 8, padding: '11px 12px',
  fontSize: 13, color: 'var(--text)', outline: 'none',
})
