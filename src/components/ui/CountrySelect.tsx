'use client'

import { useState, useRef, useEffect } from 'react'
import { COUNTRIES } from '@/lib/constants'
import Icon from './Icon'

interface Props {
  value: string
  onChange: (code: string) => void
  error?: boolean
}

export default function CountrySelect({ value, onChange, error }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = COUNTRIES.find(c => c.code === value) ?? COUNTRIES[0]

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px', background: 'var(--surface-2)',
          border: `1px solid ${error ? 'var(--negative)' : 'var(--hairline)'}`,
          borderRadius: 8, fontSize: 13, color: 'var(--text)',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 16 }}>{selected.flag}</span>
        <span style={{ flex: 1 }}>{selected.name}</span>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={13} color="var(--text-muted)"/>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300,
          background: 'var(--surface-2)', border: '1px solid var(--hairline)',
          borderRadius: 8, marginTop: 4,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          overflow: 'hidden', maxHeight: 240, overflowY: 'auto',
        }}>
          {COUNTRIES.map(c => (
            <button
              key={c.code}
              type="button"
              onMouseDown={() => { onChange(c.code); setOpen(false) }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', background: c.code === value ? 'var(--surface-3)' : 'none',
                border: 'none', borderBottom: '1px solid var(--hairline)',
                fontSize: 13, color: 'var(--text)', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>{c.flag}</span>
              <span>{c.name}</span>
              {c.code === value && <Icon name="check" size={12} color="var(--gold)"/>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
