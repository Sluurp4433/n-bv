import { supabase } from './supabase'
import { safeImageContentType } from './observations'
import { compressImage } from './images'

export type PersonInput = {
  first_name?: string
  last_name?: string
  gender?: string
  aliases?: string[]
  description?: string
  address?: string
  city?: string
  connections?: string
}

/** True om person-inmatningen innehåller något värt att spara. */
export function personHasData(p: PersonInput): boolean {
  return !!(
    p.first_name?.trim() ||
    p.last_name?.trim() ||
    (p.aliases && p.aliases.length) ||
    p.description?.trim() ||
    p.address?.trim() ||
    p.city?.trim() ||
    p.connections?.trim()
  )
}

/** Skapar en person (per observation; koppling mellan personer sker via sök). */
export async function createPerson(input: PersonInput): Promise<string | null> {
  if (!personHasData(input)) return null
  const { data, error } = await supabase
    .from('persons')
    .insert({
      first_name: input.first_name?.trim() || null,
      last_name: input.last_name?.trim() || null,
      gender: input.gender || null,
      aliases: input.aliases ?? [],
      description: input.description?.trim() || null,
      address: input.address?.trim() || null,
      city: input.city?.trim() || null,
      connections: input.connections?.trim() || null,
    })
    .select('id')
    .single()
  if (error || !data) throw error ?? new Error('person insert failed')
  return data.id
}

export async function linkPersonObservation(observationId: string, personId: string): Promise<void> {
  const { error } = await supabase
    .from('observation_persons')
    .upsert({ observation_id: observationId, person_id: personId }, { onConflict: 'observation_id,person_id' })
  if (error) throw error
}

export async function linkPersonVehicle(personId: string, vehicleId: string): Promise<void> {
  const { error } = await supabase
    .from('person_vehicles')
    .upsert({ person_id: personId, vehicle_id: vehicleId }, { onConflict: 'person_id,vehicle_id' })
  if (error) throw error
}

/** Tar bort alla personkopplingar för en observation (personerna finns kvar i databasen). */
export async function clearPersonLinks(observationId: string): Promise<void> {
  const { error } = await supabase.from('observation_persons').delete().eq('observation_id', observationId)
  if (error) throw error
}

export function personName(p: { first_name?: string | null; last_name?: string | null; aliases?: string[] | null } | null | undefined): string {
  if (!p) return 'Okänd person'
  const full = [p.first_name, p.last_name].filter(Boolean).join(' ').trim()
  if (full) return full
  if (p.aliases && p.aliases.length) return p.aliases[0]
  return 'Okänd person'
}

// ---- Foton på personer (samma lagringsyta som observations-/loggboksbilder) ----
const IMG_BUCKET = 'observation-images'

/** Laddar upp ett foto på en person med sökbar bildtext. */
export async function uploadPersonImage(
  personId: string,
  file: File,
  caption: string,
  userId: string
): Promise<{ error?: string }> {
  if (!safeImageContentType(file.name)) return { error: 'Filtypen stöds inte. Tillåtna format: JPG, PNG, WEBP, GIF.' }
  const compressed = await compressImage(file)
  const contentType = safeImageContentType(compressed.name)
  if (!contentType) return { error: 'Filtypen stöds inte. Tillåtna format: JPG, PNG, WEBP, GIF.' }
  const safe = compressed.name.replace(/[^\w.\-]+/g, '_')
  const path = `person/${personId}/${crypto.randomUUID()}-${safe}`
  const up = await supabase.storage.from(IMG_BUCKET).upload(path, compressed, {
    upsert: false,
    contentType,
  })
  if (up.error) return { error: 'Kunde inte ladda upp bilden.' }
  const { error } = await supabase.from('person_images').insert({
    person_id: personId,
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

export async function personImageUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(IMG_BUCKET).createSignedUrl(path, 3600)
  if (error || !data) return null
  return data.signedUrl
}

export async function deletePersonImage(id: string, filePath: string): Promise<void> {
  await supabase.from('person_images').delete().eq('id', id)
  await supabase.storage.from(IMG_BUCKET).remove([filePath])
}
