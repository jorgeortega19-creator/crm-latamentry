'use client'

import { useState, useMemo } from 'react'
import Topbar from '@/components/shell/Topbar'
import Icon from '@/components/ui/Icon'
import AddCompanyModal from '@/components/companies/AddCompanyModal'
import { getCountry } from '@/lib/constants'
import { exportCompanies } from '@/lib/export'
import type { Company, Contact } from '@/lib/types'

interface Props {
  initialCompanies: Company[]
  initialContacts: Pick<Contact, 'id' | 'name' | 'title' | 'email' | 'company_name' | 'status'>[]
  isAdmin: boolean
}

const STATUS_COLORS: Record<string, string> = {
  Lead: '#6B7280', Prospect: '#3B82F6', Customer: '#FAC51C',
}

export default function CompaniesClient({ initialCompanies, initialContacts, isAdmin }: Props) {
  const [companies, setCompanies] = useState(initialCompanies)
  const [contacts] = useState(initialContacts)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const filtered = useMemo(() => {
    if (!search.trim()) return companies
    const q = search.toLowerCase()
    return companies.filter(c => c.name.toLowerCase().includes(q))
  }, [companies, search])

  const selectedCompany = companies.find(c => c.id === selected)
  const companyContacts = selectedCompany
    ? contacts.filter(c => c.company_name === selectedCompany.name)
    : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Topbar
        title="Companies"
        subtitle={`${companies.length} total`}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => exportCompanies(companies)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', border: '1px solid var(--hairline)', background: 'var(--surface-2)', color: 'var(--text)', borderRadius: 8, fontSize: 13, fontWeight: 500 }}
            >
              <Icon name="download" size={14}/>
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => setShowAdd(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 16px', background: 'var(--gold)', color: '#080808', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none' }}
            >
              <Icon name="plus" size={14}/>
              <span>Add Company</span>
            </button>
          </div>
        }
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Companies list */}
        <div style={{ width: 300, flex: '0 0 300px', borderRight: '1px solid var(--hairline)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--hairline)' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: 10, pointerEvents: 'none' }}>
                <Icon name="search" size={13} color="var(--text-muted)"/>
              </span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search companies…"
                style={{ width: '100%', paddingLeft: 30, paddingRight: 10, paddingTop: 9, paddingBottom: 9, background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 7, fontSize: 13, color: 'var(--text)', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>No companies found</div>
            ) : filtered.map(company => {
              const count = contacts.filter(c => c.company_name === company.name).length
              const isActive = selected === company.id
              return (
                <button key={company.id} onClick={() => setSelected(isActive ? null : company.id)} style={{
                  width: '100%', textAlign: 'left', padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: isActive ? 'var(--surface-2)' : 'transparent',
                  border: 'none', borderBottom: '1px solid var(--hairline)',
                  cursor: 'pointer',
                  borderLeft: isActive ? '2px solid var(--gold)' : '2px solid transparent',
                }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--surface-3)', border: '1px solid var(--hairline)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', flex: '0 0 auto' }}>
                    {company.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{company.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {getCountry(company.country)?.name ?? company.country} · {count} contact{count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <Icon name="chevron-right" size={14} color="var(--text-muted)"/>
                </button>
              )
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {!selectedCompany ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 12 }}>
              <Icon name="building" size={32} color="var(--text-muted)"/>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Select a company</div>
              <div style={{ fontSize: 12 }}>Click on a company to see its details and contacts</div>
            </div>
          ) : (
            <div style={{ maxWidth: 720 }}>
              {/* Company header */}
              <div style={{ background: 'var(--surface-1)', border: '1px solid var(--hairline)', borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 10, background: 'var(--surface-3)', border: '1px solid var(--hairline)', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 700, color: 'var(--text-dim)', flex: '0 0 auto' }}>
                    {selectedCompany.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>{selectedCompany.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                      {getCountry(selectedCompany.country)?.name ?? selectedCompany.country}
                      {selectedCompany.activity && <> · {selectedCompany.activity}</>}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {selectedCompany.employee_count && (
                    <InfoRow icon="user" label="Employees" value={selectedCompany.employee_count}/>
                  )}
                  {selectedCompany.website && (
                    <InfoRow icon="globe" label="Website" value={selectedCompany.website} link={selectedCompany.website}/>
                  )}
                  {selectedCompany.linkedin && (
                    <InfoRow icon="arrow-up-right" label="LinkedIn" value={selectedCompany.linkedin} link={`https://${selectedCompany.linkedin.replace(/^https?:\/\//, '')}`}/>
                  )}
                  {selectedCompany.address && (
                    <InfoRow icon="map-pin" label="Address" value={selectedCompany.address}/>
                  )}
                </div>
              </div>

              {/* Contacts */}
              <div style={{ background: 'var(--surface-1)', border: '1px solid var(--hairline)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Contacts</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{companyContacts.length} total</div>
                </div>
                {companyContacts.length === 0 ? (
                  <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>No contacts linked to this company</div>
                ) : companyContacts.map((c, i) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < companyContacts.length - 1 ? '1px solid var(--hairline)' : 'none' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--surface-3)', border: '1px solid var(--hairline)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', flex: '0 0 auto' }}>
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.title ? `${c.title} · ` : ''}{c.email}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: `${STATUS_COLORS[c.status] || '#6B7280'}22`, color: STATUS_COLORS[c.status] || '#6B7280', whiteSpace: 'nowrap' }}>{c.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <AddCompanyModal
          onClose={() => setShowAdd(false)}
          onCreated={c => { setCompanies(prev => [c, ...prev]); setShowAdd(false) }}
        />
      )}
    </div>
  )
}

function InfoRow({ icon, label, value, link }: { icon: string; label: string; value: string; link?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 8 }}>
      <Icon name={icon as never} size={13} color="var(--text-muted)"/>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', marginBottom: 2 }}>{label.toUpperCase()}</div>
        {link ? (
          <a href={link} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--gold)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{value}</a>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
        )}
      </div>
    </div>
  )
}
