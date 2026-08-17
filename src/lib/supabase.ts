import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !anonKey) {
  // Tydligt fel om miljövariabler saknas vid bygge/utveckling.
  throw new Error(
    'Saknar VITE_SUPABASE_URL eller VITE_SUPABASE_ANON_KEY. Kopiera .env.example till .env och fyll i värden.'
  )
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
