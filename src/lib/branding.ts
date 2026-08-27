/**
 * Per-deployment branding & behaviour config.
 *
 * This repo is deployed once per client (Latam Entry's own CRM, Setu, Measure, ...).
 * Everything that differs between those deployments is driven from here so we never
 * have to branch on a specific client name in feature code.
 *
 * NOTE: NEXT_PUBLIC_* values are inlined at BUILD time, not read at runtime — they
 * must be set in the Netlify build environment, not just at runtime.
 */

import { TEAM } from '@/lib/constants'

export const CLIENT_THEME = process.env.NEXT_PUBLIC_CLIENT_THEME || ''
export const CLIENT_NAME = process.env.NEXT_PUBLIC_CLIENT_NAME || 'Latam Entry'
export const CLIENT_LABEL = process.env.NEXT_PUBLIC_CLIENT_LABEL || 'Revenue Enablement'
export const CLIENT_LOGO = process.env.NEXT_PUBLIC_CLIENT_LOGO || ''
export const SHOW_POWERED_BY = process.env.NEXT_PUBLIC_SHOW_POWERED_BY === 'true'

/**
 * True on any client-facing white-label instance; false on Latam Entry's own CRM.
 * Client instances hide our internal service packages and use a two-role model.
 */
export const IS_CLIENT_CRM = CLIENT_THEME !== ''

/** Role given to the client's own staff, e.g. "Setu Team" / "Measure Team". */
export const CLIENT_TEAM_ROLE =
  process.env.NEXT_PUBLIC_CLIENT_TEAM_ROLE || `${CLIENT_NAME} Team`

export const LATAM_TEAM_ROLE = 'Latam Entry Team'

/** Roles selectable when creating a user. Kept in sync with the server-side allow-list. */
export const ROLE_OPTIONS = IS_CLIENT_CRM
  ? [LATAM_TEAM_ROLE, CLIENT_TEAM_ROLE]
  : ['Account Executive', 'Managing Partner', 'Senior AE', 'Presales', 'Technical Managing Partner']

/**
 * Who can own an opportunity on this instance.
 * Set NEXT_PUBLIC_CLIENT_OWNER_IDS to a comma-separated list of TEAM ids
 * (e.g. "jorge,sreejith") to restrict it; unset means the whole team.
 */
const OWNER_IDS = (process.env.NEXT_PUBLIC_CLIENT_OWNER_IDS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

export const OWNER_OPTIONS = OWNER_IDS.length
  ? TEAM.filter(t => OWNER_IDS.includes(t.id))
  : TEAM
