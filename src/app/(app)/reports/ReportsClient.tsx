'use client'

import { useState } from 'react'
import Topbar from '@/components/shell/Topbar'
import Icon from '@/components/ui/Icon'
import { fmtCurrency, SERVICE_PACKAGES, STAGES, TEAM, getStage } from '@/lib/constants'
import type { Deal, Contact } from '@/lib/types'

interface Props { deals: Deal[]; contacts: Contact[] }

type DrillType = 'total' | 'won' | 'lost' | null

export default function ReportsClient({ deals, contacts }: Props) {
  const [drill, setDrill] = useState<DrillType>(null)

  const wonDeals = deals.filter(d => d.stage === 'closed_won')
  const lostDeals = deals.filter(d => d.stage === 'closed_lost')

  const byOwner = TEAM.map(t => {
    const myDeals = deals.filter(d => d.owner_name === t.name)
    const won = myDeals.filter(d => d.stage === 'closed_won')
    return {
      name: t.name.split(' ')[0],
      deals: myDeals.length,
      revenue: won.reduce((s, d) => s + (d.fee_amount || 0), 0),
      rate: myDeals.length ? Math.round((won.length / myDeals.length) * 100) : 0,
    }
  }).filter(t => t.deals > 0)

  const byPkg = SERVICE_PACKAGES.map(p => ({
    name: p.name,
    count: deals.filter(d => d.pkg === p.id).length,
    revenue: deals.filter(d => d.pkg === p.id && d.stage === 'closed_won').reduce((s, d) => s + (d.fee_amount || 0), 0),
  })).filter(p => p.count > 0)

  const maxRevenue = Math.max(...byOwner.map(o => o.revenue), 1)
  const winRate = deals.length ? Math.round((wonDeals.length / deals.length) * 100) : 0

  const winLossCards = [
    { key: 'total' as DrillType, label: 'Total Deals',  value: deals.length,    color: 'var(--text)',     sub: 'All time' },
    { key: 'won'   as DrillType, label: 'Won',          value: wonDeals.length,  color: 'var(--positive)', sub: fmtCurrency(wonDeals.reduce((s, d) => s + (d.fee_amount || 0), 0)) },
    { key: 'lost'  as DrillType, label: 'Lost',         value: lostDeals.length, color: 'var(--negative)', sub: 'Closed lost' },
    { key: 'won'   as DrillType, label: 'Win Rate',     value: `${winRate}%`,    color: 'var(--gold)',     sub: 'Won / Total' },
  ]

  const drillDeals = drill === 'won' ? wonDeals : drill === 'lost' ? lostDeals : deals
  const drillTitle = drill === 'won' ? 'Won Deals' : drill === 'lost' ? 'Lost Deals' : 'All Deals'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title="Reports" subtitle="Performance overview"/>
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {/* Performance by owner */}
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--hairline)', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Performance by Owner</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {byOwner.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data yet</div>
              ) : byOwner.map(o => (
                <div key={o.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{o.name}</span>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                      <span>{o.deals} deals</span>
                      <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{fmtCurrency(o.revenue)}</span>
                      <span>{o.rate}% win</span>
                    </div>
                  </div>
                  <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${(o.revenue / maxRevenue) * 100}%`, background: 'var(--gold)', borderRadius: 2, transition: 'width 0.3s' }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue by package */}
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--hairline)', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Revenue by Package</div>
            {byPkg.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {byPkg.map(p => (
                  <div key={p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.count} deals</div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gold)' }}>{fmtCurrency(p.revenue)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Win/Loss — clickable cards */}
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--hairline)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Win / Loss Summary</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {winLossCards.map((s, i) => (
              <button
                key={`${s.key}-${i}`}
                onClick={() => setDrill(s.key)}
                style={{
                  background: 'var(--surface-2)', borderRadius: 8, padding: '14px 16px',
                  border: '1px solid var(--hairline)', textAlign: 'left', cursor: 'pointer',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = s.color; (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-3)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--hairline)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)' }}
              >
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.sub}</div>
                <div style={{ fontSize: 10, color: s.color, marginTop: 6, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Icon name="eye" size={9} color={s.color}/> Ver detalle
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Drill-down modal */}
      {drill !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 100, padding: 24 }}>
          <div style={{ width: 'min(760px, 100%)', maxHeight: '88vh', background: 'var(--surface-1)', border: '1px solid var(--hairline-strong)', borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.7)' }} className="animate-modal-in">
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{drillTitle}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{drillDeals.length} deals</div>
              </div>
              <button onClick={() => setDrill(null)} style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', color: 'var(--text-dim)', border: '1px solid var(--hairline)', background: 'transparent', cursor: 'pointer' }}>
                <Icon name="x" size={16}/>
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto' }}>
              {drillDeals.length === 0 ? (
                <div style={{ padding: '40px 24px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No deals in this category</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--hairline)' }}>
                      {['Deal', 'Company', 'Stage', 'TCV', 'Fee', 'Owner', 'Close date'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {drillDeals.map(d => {
                      const stage = getStage(d.stage)
                      return (
                        <tr key={d.id} style={{ borderBottom: '1px solid var(--hairline)' }}>
                          <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 500 }}>{d.name}</td>
                          <td style={{ padding: '11px 16px', fontSize: 13, color: 'var(--text-dim)' }}>{d.company_name}</td>
                          <td style={{ padding: '11px 16px' }}>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: `${stage?.color}22`, color: stage?.color }}>{stage?.label}</span>
                          </td>
                          <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 600 }}>{fmtCurrency(d.tcv)}</td>
                          <td style={{ padding: '11px 16px', fontSize: 13, color: 'var(--gold)' }}>{d.fee_amount ? fmtCurrency(d.fee_amount) : '—'}</td>
                          <td style={{ padding: '11px 16px', fontSize: 12, color: 'var(--text-dim)' }}>{d.owner_name || '—'}</td>
                          <td style={{ padding: '11px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{d.close_date || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
