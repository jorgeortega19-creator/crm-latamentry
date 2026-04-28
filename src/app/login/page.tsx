'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
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
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: name || email.split('@')[0] } },
        })
        if (error) { setError(error.message); setLoading(false); return }
        // With autoconfirm enabled, session is available immediately
        if (data.session) {
          router.push('/dashboard')
          router.refresh()
        } else {
          // Fallback: email confirmation required
          setError('Check your email to confirm your account, then sign in.')
          setLoading(false)
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { setError(error.message); setLoading(false); return }
        router.push('/dashboard')
        router.refresh()
      }
    } catch (e) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--bg)',
      display: 'grid', placeItems: 'center',
      padding: 24,
    }}>
      <div style={{
        width: 'min(420px, 100%)',
        background: 'var(--surface-1)',
        border: '1px solid var(--hairline-strong)',
        borderRadius: 16,
        padding: '36px 36px 32px',
        boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
      }} className="animate-modal-in">
        {/* Brand */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 12,
            background: '#F5F5F5', padding: 6,
            display: 'grid', placeItems: 'center',
          }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="18" fill="#1A2B4A"/>
              <path d="M10 18 L20 10 L30 18" stroke="#F97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 18 L14 26 L22 26 L22 18" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', textAlign: 'center', marginBottom: 6 }}>
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 24 }}>
          {mode === 'login' ? 'Sign in to the Latam Entry CRM' : 'Join the Revenue Enablement platform'}
        </div>

        {mode === 'signup' && (
          <div style={{ marginBottom: 14 }}>
            <div style={labelStyle}>Full name</div>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Diego Ramírez"
              style={inputStyle(false)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <div style={labelStyle}>Email</div>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(null) }}
            placeholder="you@latamentry.com"
            style={inputStyle(!!error)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        <div style={{ marginBottom: 6 }}>
          <div style={labelStyle}>Password</div>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(null) }}
            placeholder="••••••••"
            style={inputStyle(!!error)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
          {error && <div style={{ fontSize: 11, color: 'var(--negative)', marginTop: 6 }}>{error}</div>}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', padding: '11px 18px', marginTop: 16,
            fontSize: 13, fontWeight: 600, borderRadius: 8,
            background: loading ? 'rgba(250,197,28,0.6)' : 'var(--gold)',
            color: '#080808', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.15s',
          }}
        >
          {loading ? 'Signing in…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          margin: '20px 0', fontSize: 10,
          color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.18em',
        }}>
          <div style={{ flex: 1, height: 1, background: 'var(--hairline)' }}/>
          <span>{mode === 'login' ? 'or' : 'already have an account'}</span>
          <div style={{ flex: 1, height: 1, background: 'var(--hairline)' }}/>
        </div>

        <button
          onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(null) }}
          style={{
            width: '100%', padding: '10px',
            fontSize: 13, fontWeight: 500,
            border: '1px solid var(--hairline)', borderRadius: 8,
            background: 'var(--surface-2)', color: 'var(--text)',
          }}
        >
          {mode === 'login' ? 'Create new account' : 'Sign in instead'}
        </button>

        <div style={{
          textAlign: 'center', fontSize: 10,
          color: 'var(--text-muted)', marginTop: 22,
          letterSpacing: '0.14em', textTransform: 'uppercase',
        }}>
          Latam Entry · Revenue Enablement
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
