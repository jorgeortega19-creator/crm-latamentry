import type { ServicePackage, Stage, Country } from './types'

export const SERVICE_PACKAGES: ServicePackage[] = [
  { id: 'lead-gen',           name: 'Lead Gen',           fee_pct: 0, term_months: 2,  term_label: '2 months'  },
  { id: 'sales-enablement',   name: 'Sales Enablement',   fee_pct: 7, term_months: 3,  term_label: '3 months'  },
  { id: 'commercial-arm',     name: 'Commercial Arm',     fee_pct: 5, term_months: 6,  term_label: '6 months'  },
  { id: 'strategic-accounts', name: 'Strategic Accounts', fee_pct: 3, term_months: 12, term_label: '12 months' },
]

export const STAGES: Stage[] = [
  { id: 'discovery',    label: 'Discovery',    probability: 10,  color: '#6B7280' },
  { id: 'qualified',    label: 'Qualified',    probability: 25,  color: '#3B82F6' },
  { id: 'proposal',     label: 'Proposal',     probability: 45,  color: '#8B5CF6' },
  { id: 'negotiation',  label: 'Negotiation',  probability: 70,  color: '#F59E0B' },
  { id: 'closed_won',   label: 'Closed Won',   probability: 100, color: '#3ECF8E' },
  { id: 'closed_lost',  label: 'Closed Lost',  probability: 0,   color: '#FF4D4F' },
]

export const COUNTRIES: Country[] = [
  { code: 'IN', name: 'India',          flag: '🇮🇳' },
  { code: 'US', name: 'United States',  flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'MX', name: 'Mexico',         flag: '🇲🇽' },
  { code: 'BR', name: 'Brazil',         flag: '🇧🇷' },
  { code: 'CO', name: 'Colombia',       flag: '🇨🇴' },
  { code: 'CL', name: 'Chile',          flag: '🇨🇱' },
  { code: 'AR', name: 'Argentina',      flag: '🇦🇷' },
  { code: 'PE', name: 'Peru',           flag: '🇵🇪' },
]

export const TEAM = [
  { id: 'diego',    name: 'Diego R.',              initials: 'DR', role: 'Senior AE · Mexico' },
  { id: 'camila',   name: 'Camila T.',              initials: 'CT', role: 'Senior AE · Brazil' },
  { id: 'andres',   name: 'Andrés P.',              initials: 'AP', role: 'Account Exec · Chile' },
  { id: 'mateo',    name: 'Mateo S.',               initials: 'MS', role: 'Presales' },
  { id: 'jorge',    name: 'Jorge Ortega',           initials: 'JO', role: 'Managing Partner' },
  { id: 'sreejith', name: 'Sreejith Sivasankar',    initials: 'SS', role: 'Technical Managing Partner' },
  { id: 'raczel',   name: 'Raczel Tijerino',        initials: 'RT', role: 'Account Exec' },
]

export const getPkg = (id: string) => SERVICE_PACKAGES.find(p => p.id === id)
export const getStage = (id: string) => STAGES.find(s => s.id === id)
export const getCountry = (code: string) => COUNTRIES.find(c => c.code === code)

export const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
