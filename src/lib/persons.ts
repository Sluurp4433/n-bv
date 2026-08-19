import { supabase } from './supabase'

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
