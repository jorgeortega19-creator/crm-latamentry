export type ContactStatus = 'Lead' | 'Prospect' | 'Customer'
export type DealStage = 'discovery' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
export type ActivityType = 'note' | 'call' | 'email' | 'meeting' | 'stage_change' | 'deal_created' | 'contact_created'

export interface Profile {
  id: string
  name: string
  initials: string
  role: string
  email: string
  is_admin: boolean
  created_at: string
}

export interface Company {
  id: string
  name: string
  logo?: string
  country: string
  website?: string
  address?: string
  activity?: string
  linkedin?: string
  employee_count?: string
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  name: string
  title?: string
  company_id?: string
  company_name?: string
  email: string
  phone?: string
  country: string
  status: ContactStatus
  owner_id?: string
  owner_name?: string
  pkg: string
  value: number
  last_activity?: string
  created_at: string
  updated_at: string
}

export interface Deal {
  id: string
  name: string
  company_id?: string
  company_name: string
  contact_id?: string
  contact_name?: string
  country: string
  stage: DealStage
  probability: number
  pkg: string
  tcv: number
  term_months: number
  fee_pct: number
  fee_amount: number
  close_date?: string
  owner_id?: string
  owner_name?: string
  last_activity?: string
  created_at: string
  updated_at: string
}

export interface Activity {
  id: string
  type: ActivityType
  body: string
  contact_id?: string
  deal_id?: string
  author_id?: string
  author_name?: string
  created_at: string
}

export interface ServicePackage {
  id: string
  name: string
  fee_pct: number
  term_months: number
  term_label: string
}

export interface Stage {
  id: DealStage
  label: string
  probability: number
  color: string
}

export interface Country {
  code: string
  name: string
  flag: string
}
