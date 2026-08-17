import { supabase } from './supabase'
import { normalizeRegnr } from './format'

export type VehicleInput = {
  registration_number?: string
  make?: string
  model?: string
  color?: string
  vehicle_type?: string
  notes?: string
}

/**
 * Hittar befintligt fordon via normaliserat regnr eller skapar ett nytt.
 * Återanvänder samma fordon mellan observationer (normaliserad databas).
 * Returnerar fordonets id, eller null om inget regnr angavs.
 */
export async function upsertVehicle(input: VehicleInput): Promise<string | null> {
  const norm = normalizeRegnr(input.registration_number ?? '')
  if (!norm) return null

  const { data: existing, error: findErr } = await supabase
    .from('vehicles')
    .select('id')
    .eq('registration_normalized', norm)
    .maybeSingle()
  if (findErr) throw findErr
  if (existing) return existing.id

  const { data: created, error: insErr } = await supabase
    .from('vehicles')
    .insert({
      registration_number: (input.registration_number ?? '').trim(),
      make: input.make || null,
      model: input.model || null,
      color: input.color || null,
      vehicle_type: input.vehicle_type || null,
      notes: input.notes || null,
    })
    .select('id')
    .single()
  if (insErr) throw insErr
  return created.id
}

/** Kopplar ett fordon till en observation (idempotent). */
export async function linkVehicle(observationId: string, vehicleId: string): Promise<void> {
  const { error } = await supabase
    .from('observation_vehicles')
    .upsert({ observation_id: observationId, vehicle_id: vehicleId }, { onConflict: 'observation_id,vehicle_id' })
  if (error) throw error
}

/** Tar bort alla fordonskopplingar för en observation. */
export async function clearVehicleLinks(observationId: string): Promise<void> {
  const { error } = await supabase
    .from('observation_vehicles')
    .delete()
    .eq('observation_id', observationId)
  if (error) throw error
}
