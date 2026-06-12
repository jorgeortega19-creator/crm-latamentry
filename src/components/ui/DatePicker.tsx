'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  format, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek,
  addMonths, subMonths,
  eachDayOfInterval,
  isSameMonth, isSameDay, parseISO,
} from 'date-fns'
import Icon from './Icon'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hasError?: boolean
  style?: React.CSSProperties
}

export default function DatePicker({ value, onChange, placeholder = 'Select date', hasError, style }: Props) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<Date>(() => value ? parseISO(value) : new Date())
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, openUp: false })
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selected = value ? parseISO(value) : null

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      const insideWrapper = ref.current?.contains(target)
      const insideDropdown = dropdownRef.current?.contains(target)
      if (!insideWrapper && !insideDropdown) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (value) setView(parseISO(value))
  }, [value])

  const DROPDOWN_HEIGHT = 290 // approximate calendar height in px

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const openUp = spaceBelow < DROPDOWN_HEIGHT + 8
      setDropdownPos({
        top: openUp ? rect.top - DROPDOWN_HEIGHT - 4 : rect.bottom + 4,
        left: rect.left,
        openUp,
      })
    }
    setOpen(v => !v)
  }

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(view), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(view), { weekStartsOn: 0 }),
  })

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--surface-2)',
          border: `1px solid ${hasError ? 'var(--negative)' : open ? 'var(--gold)' : 'var(--hairline)'}`,
          borderRadius: 8, padding: '10px 12px',
          fontSize: 13, color: selected ? 'var(--text)' : 'var(--text-muted)',
          cursor: 'pointer', textAlign: 'left',
          transition: 'border-color 0.15s',
        }}
      >
        <Icon name="calendar" size={13} color="var(--text-dim)"/>
        <span style={{ flex: 1 }}>
          {selected ? format(selected, 'MMM d, yyyy') : placeholder}
        </span>
        {selected && (
          <span
            onClick={e => { e.stopPropagation(); onChange(''); setOpen(false) }}
            style={{ fontSize: 11, color: 'var(--text-muted)', padding: '0 2px', cursor: 'pointer' }}
          >✕</span>
        )}
      </button>

      {open && createPortal(
        <div ref={dropdownRef} style={{
          position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, zIndex: 9999,
          background: 'var(--surface-1)', border: '1px solid var(--hairline-strong)',
          borderRadius: 10, padding: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.75)',
          width: 252,
        }}>
          {/* Month navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => setView(d => subMonths(d, 1))}
              style={navBtnStyle}
            >‹</button>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{format(view, 'MMMM yyyy')}</span>
            <button
              type="button"
              onClick={() => setView(d => addMonths(d, 1))}
              style={navBtnStyle}
            >›</button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', padding: '3px 0', fontWeight: 600 }}>{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {days.map(day => {
              const isSel = selected ? isSameDay(day, selected) : false
              const inMonth = isSameMonth(day, view)
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => { onChange(format(day, 'yyyy-MM-dd')); setOpen(false) }}
                  style={{
                    padding: '6px 0', textAlign: 'center', fontSize: 12,
                    borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: isSel ? 'var(--gold)' : 'transparent',
                    color: isSel ? '#080808' : inMonth ? 'var(--text)' : 'var(--text-muted)',
                    fontWeight: isSel ? 700 : 400,
                    opacity: inMonth ? 1 : 0.35,
                  }}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

const navBtnStyle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6,
  border: '1px solid var(--hairline)',
  background: 'transparent', color: 'var(--text)',
  cursor: 'pointer', fontSize: 18, lineHeight: 1,
  display: 'grid', placeItems: 'center',
}
