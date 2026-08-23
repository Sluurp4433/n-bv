import { supabase } from './supabase'
import { normalizeRegnr } from './format'

export type VehicleInput = {
  registration_number?: string
  make?: string
  model?: string
  color?: string
  vehicle_type?: string
  year_model?: number | null
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
      year_model: input.year_model || null,
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

// ---- Bildbilagor ----
const IMG_BUCKET = 'observation-images'

/** Laddar upp en bild till en observation med sökbar bildtext. */
export async function uploadObservationImage(
  observationId: string,
  file: File,
  caption: string,
  userId: string
): Promise<{ error?: string }> {
  const safe = file.name.replace(/[^\w.\-]+/g, '_')
  const path = `${observationId}/${crypto.randomUUID()}-${safe}`
  const up = await supabase.storage.from(IMG_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  })
  if (up.error) return { error: 'Kunde inte ladda upp bilden.' }
  const { error } = await supabase.from('observation_images').insert({
    observation_id: observationId,
    file_path: path,
    caption: caption || null,
    uploaded_by: userId,
  })
  if (error) {
    await supabase.storage.from(IMG_BUCKET).remove([path])
    return { error: 'Kunde inte spara bilden.' }
  }
  return {}
}

export async function observationImageUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(IMG_BUCKET).createSignedUrl(path, 3600)
  if (error || !data) return null
  return data.signedUrl
}

export async function deleteObservationImage(id: string, filePath: string): Promise<void> {
  await supabase.from('observation_images').delete().eq('id', id)
  await supabase.storage.from(IMG_BUCKET).remove([filePath])
}

/** Laddar upp en bild till ett loggboksinlägg med sökbar bildtext (samma bucket). */
export async function uploadLogbookImage(
  entryId: string,
  file: File,
  caption: string,
  userId: string
): Promise<{ error?: string }> {
  const safe = file.name.replace(/[^\w.\-]+/g, '_')
  const path = `log/${entryId}/${crypto.randomUUID()}-${safe}`
  const up = await supabase.storage.from(IMG_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  })
  if (up.error) return { error: 'Kunde inte ladda upp bilden.' }
  const { error } = await supabase.from('logbook_images').insert({
    logbook_entry_id: entryId,
    file_path: path,
    caption: caption || null,
    uploaded_by: userId,
  })
  if (error) {
    await supabase.storage.from(IMG_BUCKET).remove([path])
    return { error: 'Kunde inte spara bilden.' }
  }
  return {}
}

export async function deleteLogbookImage(id: string, filePath: string): Promise<void> {
  await supabase.from('logbook_images').delete().eq('id', id)
  await supabase.storage.from(IMG_BUCKET).remove([filePath])
}
