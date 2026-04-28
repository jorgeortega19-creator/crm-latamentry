'use client'

import Topbar from '@/components/shell/Topbar'
import { fmtCurrency, SERVICE_PACKAGES, STAGES, TEAM } from '@/lib/constants'
import type { Deal, Contact } from '@/lib/types'

interface Props { deals: Deal[]; contacts: Contact[] }

export default function ReportsClient({ deals, contacts }: Props) {
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
                  <div key={p.name} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 8,
                  }}>
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

        {/* Win/Loss */}
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--hairline)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Win / Loss Summary</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Total Deals', value: deals.length, color: 'var(--text)' },
              { label: 'Won', value: wonDeals.length, color: 'var(--positive)' },
              { label: 'Lost', value: lostDeals.length, color: 'var(--negative)' },
              { label: 'Win Rate', value: deals.length ? `${Math.round((wonDeals.length / deals.length) * 100)}%` : '—', color: 'var(--gold)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '14px 16px', border: '1px solid var(--hairline)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
