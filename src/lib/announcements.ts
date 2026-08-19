import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { Announcement } from '../types/database.types'

export const ANNOUNCEMENT_LEVELS = [
  { value: 'info', label: 'Information' },
  { value: 'warning', label: 'Viktigt' },
  { value: 'critical', label: 'Driftstörning' },
] as const

export function levelLabel(v: string): string {
  return ANNOUNCEMENT_LEVELS.find((l) => l.value === v)?.label ?? 'Information'
}

/** Aktiva meddelanden (för startsidan). */
export function useActiveAnnouncements() {
  return useQuery({
    queryKey: ['announcements', 'active'],
    queryFn: async (): Promise<Announcement[]> => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

/** Alla meddelanden (för administration). */
export function useAllAnnouncements() {
  return useQuery({
    queryKey: ['announcements', 'all'],
    queryFn: async (): Promise<Announcement[]> => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}
