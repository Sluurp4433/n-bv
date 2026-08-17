import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { AppSettings, Profile } from '../types/database.types'

/** Hämtar alla profiler (medlemmar) och en uppslagskarta id -> profil. */
export function useProfiles() {
  const query = useQuery({
    queryKey: ['profiles'],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })

  const map: Record<string, Profile> = {}
  for (const p of query.data ?? []) map[p.id] = p

  return { ...query, profiles: query.data ?? [], map }
}

/** Föreningens inställningar (gallringstid, redigeringsfönster). */
export function useSettings() {
  return useQuery({
    queryKey: ['app_settings'],
    queryFn: async (): Promise<AppSettings | null> => {
      const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

/** Avgör om en post får redigeras av den som skapat den (inom redigeringsfönstret). */
export function canEditOwn(
  createdBy: string | null | undefined,
  createdAt: string | null | undefined,
  userId: string | undefined,
  isAdmin: boolean,
  editWindowHours: number | undefined
): boolean {
  if (isAdmin) return true
  if (!createdBy || !userId || createdBy !== userId) return false
  if (!createdAt || editWindowHours == null) return true
  return new Date(createdAt).getTime() > Date.now() - editWindowHours * 3600_000
}

/** Namn på en medlem utifrån id, med fallback. */
export function creatorName(
  map: Record<string, Profile>,
  id: string | null | undefined
): string {
  if (!id) return 'Okänd'
  const p = map[id]
  return p?.name || p?.email || 'Okänd medlem'
}
