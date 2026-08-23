import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { FuelGauge } from '../types/database.types'

export function useFuelGauge() {
  return useQuery({
    queryKey: ['fuel_gauge'],
    queryFn: async (): Promise<FuelGauge | null> => {
      const { data, error } = await supabase.from('fuel_gauge').select('*').eq('id', 1).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useSetFuelLevel() {
  const qc = useQueryClient()
  return async (level: number, userId: string) => {
    const { error } = await supabase
      .from('fuel_gauge')
      .update({ level: Math.round(level), updated_by: userId })
      .eq('id', 1)
    if (!error) qc.invalidateQueries({ queryKey: ['fuel_gauge'] })
    return { error: error ? 'Kunde inte spara tanknivån.' : undefined }
  }
}
