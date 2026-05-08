import type { Contact, Deal, Company } from './types'
import { getPkg, getStage, getCountry } from './constants'

function toCsv(rows: Record<string, string | number>[]) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: string | number) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  return [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
  ].join('\n')
}

function download(filename: string, content: string, mime = 'text/csv') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportContacts(contacts: Contact[]) {
  const rows = contacts.map(c => ({
    Name: c.name,
    Title: c.title ?? '',
    Company: c.company_name ?? '',
    Email: c.email,
    Phone: c.phone ?? '',
    Country: getCountry(c.country)?.name ?? c.country,
    Status: c.status,
    Package: getPkg(c.pkg)?.name ?? c.pkg,
    Value: c.value,
    Owner: c.owner_name ?? '',
    Created: c.created_at.slice(0, 10),
  }))
  download('contacts.csv', toCsv(rows))
}

export function exportCompanies(companies: Company[]) {
  const rows = companies.map(c => ({
    Name: c.name,
    Country: getCountry(c.country)?.name ?? c.country,
    Website: c.website ?? '',
    Created: c.created_at.slice(0, 10),
  }))
  download('companies.csv', toCsv(rows))
}

export function exportDeals(deals: Deal[]) {
  const rows = deals.map(d => ({
    'Deal Name': d.name,
    Company: d.company_name,
    Contact: d.contact_name ?? '',
    Country: getCountry(d.country)?.name ?? d.country,
    Stage: getStage(d.stage)?.label ?? d.stage,
    Probability: d.probability,
    Package: getPkg(d.pkg)?.name ?? d.pkg,
    'TCV (USD)': d.tcv,
    'Term (months)': d.term_months,
    'Fee %': d.fee_pct,
    'Fee Amount': d.fee_amount,
    'Close Date': d.close_date ?? '',
    Owner: d.owner_name ?? '',
    Created: d.created_at.slice(0, 10),
  }))
  download('deals.csv', toCsv(rows))
}
