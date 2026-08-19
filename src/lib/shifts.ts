import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { Shift } from '../types/database.types'

export type ShiftWithBookings = Shift & { bookings: string[] }

/** Hämtar körpass (med bokade medlemmars user_id) som startar i intervallet [from, to). */
export function useShiftsInRange(fromISO: string, toISO: string) {
  return useQuery({
    queryKey: ['shifts', fromISO, toISO],
    queryFn: async (): Promise<ShiftWithBookings[]> => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*, shift_bookings(user_id)')
        .gte('starts_at', fromISO)
        .lt('starts_at', toISO)
        .order('starts_at', { ascending: true })
      if (error) throw error
      return (data ?? []).map((s) => {
        const { shift_bookings, ...shift } = s as Shift & { shift_bookings: { user_id: string }[] }
        return { ...shift, bookings: (shift_bookings ?? []).map((b) => b.user_id) }
      })
    },
  })
}

/** Ett enskilt körpass med bokningar. */
export function useShift(id: string | undefined) {
  return useQuery({
    queryKey: ['shift', id],
    enabled: !!id,
    queryFn: async (): Promise<ShiftWithBookings> => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*, shift_bookings(user_id)')
        .eq('id', id!)
        .single()
      if (error) throw error
      const { shift_bookings, ...shift } = data as Shift & { shift_bookings: { user_id: string }[] }
      return { ...shift, bookings: (shift_bookings ?? []).map((b) => b.user_id) }
    },
  })
}

export type CreateShiftInput = {
  starts_at: string
  ends_at: string
  capacity: number
  title?: string | null
  location?: string | null
  notes?: string | null
}

export async function createShift(
  input: CreateShiftInput,
  bookSelf: boolean,
  userId: string
): Promise<{ id?: string; error?: string }> {
  const { data, error } = await supabase.from('shifts').insert(input).select('id').single()
  if (error || !data) return { error: 'Kunde inte skapa passet.' }
  if (bookSelf) {
    await supabase.from('shift_bookings').insert({ shift_id: data.id, user_id: userId })
  }
  return { id: data.id }
}

export async function bookShift(shiftId: string, userId: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('shift_bookings').insert({ shift_id: shiftId, user_id: userId })
  if (!error) return {}
  const msg = error.message || ''
  if (msg.includes('fullbokat')) return { error: 'Passet är fullbokat.' }
  if (error.code === '23505' || msg.includes('duplicate')) return { error: 'Du är redan bokad på passet.' }
  return { error: 'Kunde inte boka passet.' }
}

export async function unbookShift(shiftId: string, userId: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('shift_bookings')
    .delete()
    .eq('shift_id', shiftId)
    .eq('user_id', userId)
  return error ? { error: 'Kunde inte avboka passet.' } : {}
}
