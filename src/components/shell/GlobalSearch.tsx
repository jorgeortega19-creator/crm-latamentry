'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Icon from '@/components/ui/Icon'
import { fmtCurrency, getStage } from '@/lib/constants'
import type { Contact, Deal } from '@/lib/types'

interface SearchResult {
  type: 'contact' | 'deal'
  id: string
  primary: string
  secondary: string
  tertiary?: string
  href: string
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openSearch = useCallback(() => {
    setOpen(true)
    setQuery('')
    setResults([])
    setCursor(0)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const closeSearch = useCallback(() => {
    setOpen(false)
    setQuery('')
    setResults([])
  }, [])

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        open ? closeSearch() : openSearch()
      }
      if (e.key === 'Escape') closeSearch()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, openSearch, closeSearch])

  // Debounced search
  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const q = query.trim()

      const [{ data: contacts }, { data: deals }] = await Promise.all([
        supabase.from('contacts').select('id, name, company_name, email, status').or(`name.ilike.%${q}%,email.ilike.%${q}%,company_name.ilike.%${q}%`).limit(5),
        supabase.from('deals').select('id, name, company_name, stage, tcv').or(`name.ilike.%${q}%,company_name.ilike.%${q}%`).limit(5),
      ])

      const contactResults: SearchResult[] = (contacts ?? []).map((c: any) => ({
        type: 'contact',
        id: c.id,
        primary: c.name,
        secondary: c.company_name ?? c.email,
        tertiary: c.status,
        href: `/contacts/${c.id}`,
      }))

      const dealResults: SearchResult[] = (deals ?? []).map((d: any) => ({
        type: 'deal',
        id: d.id,
        primary: d.name,
        secondary: d.company_name,
        tertiary: `${getStage(d.stage)?.label ?? d.stage} · ${fmtCurrency(d.tcv)}`,
        href: '/pipeline',
      }))

      setResults([...contactResults, ...dealResults])
      setCursor(0)
      setLoading(false)
    }, 200)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, open, supabase])

  const navigate = (r: SearchResult) => {
    closeSearch()
    router.push(r.href)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter' && results[cursor]) navigate(results[cursor])
  }

  return (
    <>
      {/* Trigger bar */}
      <div
        className="global-search-wrap"
        onClick={openSearch}
        style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 14px',
          background: 'var(--surface-1)',
          border: '1px solid var(--hairline)',
          borderRadius: 8, maxWidth: 480,
          cursor: 'text',
        }}
      >
        <Icon name="search" size={14} color="var(--text-dim)"/>
        <span style={{ flex: 1, fontSize: 13, color: 'var(--text-muted)' }}>
          Search contacts, deals, companies…
        </span>
        <span style={{
          fontSize: 10, padding: '2px 6px',
          border: '1px solid var(--hairline-strong)',
          borderRadius: 4, color: 'var(--text-muted)',
          fontFamily: 'JetBrains Mono, monospace',
        }}>⌘K</span>
      </div>

      {/* Modal overlay */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'grid', placeItems: 'start center', paddingTop: '15vh' }}
          onClick={e => { if (e.target === e.currentTarget) closeSearch() }}
        >
          <div style={{ width: 'min(560px, calc(100vw - 32px))', background: 'var(--surface-1)', border: '1px solid var(--hairline-strong)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.8)' }} className="animate-modal-in">

            {/* Search input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--hairline)' }}>
              <Icon name="search" size={16} color="var(--text-dim)"/>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Search contacts, deals, companies…"
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 15, color: 'var(--text)', padding: 0 }}
              />
              {loading && <div style={{ width: 14, height: 14, border: '2px solid var(--hairline)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}/>}
              <button onClick={closeSearch} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', padding: 2 }}>
                <Icon name="x" size={14}/>
              </button>
            </div>

            {/* Results */}
            <div style={{ maxHeight: 380, overflow: 'auto' }}>
              {!query.trim() && (
                <div style={{ padding: '24px 18px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                  Type to search contacts, deals, and companies
                </div>
              )}

              {query.trim() && !loading && results.length === 0 && (
                <div style={{ padding: '24px 18px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                  No results for &ldquo;{query}&rdquo;
                </div>
              )}

              {results.length > 0 && (
                <>
                  {/* Group: Contacts */}
                  {results.some(r => r.type === 'contact') && (
                    <div>
                      <div style={{ padding: '8px 18px 4px', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Contacts</div>
                      {results.filter(r => r.type === 'contact').map((r, i) => {
                        const globalIdx = results.indexOf(r)
                        return (
                          <ResultRow
                            key={r.id}
                            result={r}
                            active={cursor === globalIdx}
                            onClick={() => navigate(r)}
                            onMouseEnter={() => setCursor(globalIdx)}
                          />
                        )
                      })}
                    </div>
                  )}

                  {/* Group: Deals */}
                  {results.some(r => r.type === 'deal') && (
                    <div>
                      <div style={{ padding: '8px 18px 4px', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Deals</div>
                      {results.filter(r => r.type === 'deal').map((r) => {
                        const globalIdx = results.indexOf(r)
                        return (
                          <ResultRow
                            key={r.id}
                            result={r}
                            active={cursor === globalIdx}
                            onClick={() => navigate(r)}
                            onMouseEnter={() => setCursor(globalIdx)}
                          />
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer hint */}
            <div style={{ padding: '8px 18px', borderTop: '1px solid var(--hairline)', display: 'flex', gap: 16, fontSize: 10, color: 'var(--text-muted)' }}>
              <span>↑↓ navigate</span>
              <span>↵ open</span>
              <span>Esc close</span>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

function ResultRow({ result, active, onClick, onMouseEnter }: { result: SearchResult; active: boolean; onClick: () => void; onMouseEnter: () => void }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 18px', background: active ? 'var(--surface-2)' : 'transparent',
        border: 'none', textAlign: 'left', cursor: 'pointer',
      }}
    >
      <div style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--surface-3)', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
        <Icon name={result.type === 'contact' ? 'user' : 'pipeline'} size={14} color={active ? 'var(--gold)' : 'var(--text-dim)'}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{result.primary}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{result.secondary}</div>
      </div>
      {result.tertiary && (
        <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--surface-3)', padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap' }}>{result.tertiary}</span>
      )}
    </button>
  )
}
