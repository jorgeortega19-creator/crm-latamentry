'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Topbar from '@/components/shell/Topbar'
import NewContactModal from '@/components/contacts/NewContactModal'
import Icon from '@/components/ui/Icon'
import { getCountry, fmtCurrency, fmtDate } from '@/lib/constants'
import type { Contact, ContactStatus } from '@/lib/types'

interface Props { initialContacts: Contact[] }

const STATUS_COLORS: Record<string, string> = {
  Lead: '#6B7280', Prospect: '#3B82F6', Customer: '#FAC51C',
}

export default function ContactsClient({ initialContacts }: Props) {
  const [contacts, setContacts] = useState(initialContacts)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<ContactStatus | 'All'>('All')
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const ch = supabase.channel('contacts-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, () => {
        supabase.from('contacts').select('*').order('created_at', { ascending: false })
          .then(({ data }) => data && setContacts(data))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase])

  const filtered = useMemo(() => {
    return contacts.filter(c => {
      if (filter !== 'All' && c.status !== filter) return false
      if (search) {
        const q = search.toLowerCase()
        return c.name.toLowerCase().includes(q) ||
          (c.company_name || '').toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
      }
      return true
    })
  }, [contacts, search, filter])

  const toggleSelect = (id: string) => {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const deleteSelected = async () => {
    if (!selected.size) return
    setDeleting(true)
    await supabase.from('contacts').delete().in('id', [...selected])
    setContacts(c => c.filter(x => !selected.has(x.id)))
    setSelected(new Set())
    setDeleting(false)
  }

  const counts = {
    All: contacts.length,
    Lead: contacts.filter(c => c.status === 'Lead').length,
    Prospect: contacts.filter(c => c.status === 'Prospect').length,
    Customer: contacts.filter(c => c.status === 'Customer').length,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Topbar
        title="Contacts"
        subtitle={`${contacts.length} total`}
        action={
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '9px 16px', background: 'var(--gold)', color: '#080808',
              borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none',
            }}
          >
            <Icon name="plus" size={14}/>
            <span>Add Contact</span>
          </button>
        }
      />

      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {/* Filters + search */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 2, background: 'var(--surface-2)', borderRadius: 8, padding: 4, border: '1px solid var(--hairline)' }}>
            {(['All', 'Lead', 'Prospect', 'Customer'] as const).map(s => (
              <button key={s} onClick={() => setFilter(s)} style={{
                padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none',
                background: filter === s ? 'var(--surface-3)' : 'transparent',
                color: filter === s ? 'var(--text)' : 'var(--text-dim)',
                cursor: 'pointer',
              }}>
                {s} <span style={{ opacity: 0.6 }}>{counts[s]}</span>
              </button>
            ))}
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--surface-1)', border: '1px solid var(--hairline)', borderRadius: 8, maxWidth: 320 }}>
            <Icon name="search" size={14} color="var(--text-dim)"/>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search contacts…"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text)', padding: 0 }}
            />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', padding: 0 }}><Icon name="x" size={14}/></button>}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {selected.size > 0 && (
              <button onClick={deleteSelected} disabled={deleting} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', fontSize: 12, fontWeight: 500,
                background: 'var(--negative-soft)', color: 'var(--negative)',
                border: '1px solid rgba(255,77,79,0.2)', borderRadius: 8,
              }}>
                <Icon name="trash" size={13}/>
                {deleting ? 'Deleting…' : `Delete ${selected.size}`}
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--hairline)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--hairline)' }}>
                <th style={{ width: 40, padding: '10px 16px' }}>
                  <input type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={e => setSelected(e.target.checked ? new Set(filtered.map(c => c.id)) : new Set())}
                    style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--gold)' }}
                  />
                </th>
                {['Contact', 'Company', 'Status', 'Country', 'Email', 'Owner', 'Value', 'Added'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
                <th style={{ width: 40 }}/>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  {search ? 'No contacts match your search' : 'No contacts yet — add your first one'}
                </td></tr>
              ) : filtered.map(c => (
                <tr key={c.id}
                  className="table-row-interactive"
                  style={{ borderBottom: '1px solid var(--hairline)' }}
                  onClick={() => router.push(`/contacts/${c.id}`)}
                >
                  <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)}
                      style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--gold)' }}
                    />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--surface-3)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', flex: '0 0 auto' }}>
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                        {c.title && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.title}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-dim)' }}>{c.company_name || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5, background: `${STATUS_COLORS[c.status]}22`, color: STATUS_COLORS[c.status] }}>{c.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-dim)' }}>
                    {getCountry(c.country)?.flag} {getCountry(c.country)?.name}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>{c.email}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-dim)' }}>{c.owner_name || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{c.value > 0 ? fmtCurrency(c.value) : '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(c.created_at)}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <button style={{ width: 28, height: 28, borderRadius: 6, display: 'grid', placeItems: 'center', color: 'var(--text-dim)', background: 'transparent', border: 'none' }}
                      onClick={e => { e.stopPropagation() }}>
                      <Icon name="more" size={14}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <NewContactModal
          onClose={() => setShowModal(false)}
          onCreated={c => setContacts(prev => [c, ...prev])}
        />
      )}
    </div>
  )
}
