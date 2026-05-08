import { cache } from 'react'
import { createClient } from './supabase/server'
import type { Profile } from './types'

const getSupabase = cache(async () => createClient())

export const getUser = cache(async () => {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  return user ?? null
})

export const getProfile = cache(async () => {
  const user = await getUser()
  if (!user) return null
  const supabase = await getSupabase()
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return (data as Profile) ?? null
})
