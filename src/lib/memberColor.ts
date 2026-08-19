import type { Profile } from '../types/database.types'

// Valbara personliga färger (profil). Tydliga och särskiljbara i kalendern.
export const COLOR_PALETTE = [
  '#2f6395', // marinblå
  '#1f7a4d', // grön
  '#b0413e', // röd
  '#d98a2b', // orange
  '#7b5bd6', // lila
  '#159a86', // turkos
  '#d6497e', // rosa
  '#e0b000', // gul
  '#2c3e50', // mörkgrå
  '#0f8a8a', // teal
  '#c0392b', // tegel
  '#5b6bbf', // blålila
]

function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h
}

/** Medlemmens personliga färg, med deterministisk fallback från id om ingen valts. */
export function memberColor(profile: Pick<Profile, 'id' | 'personal_color'> | null | undefined): string {
  if (!profile) return '#8895a3'
  if (profile.personal_color) return profile.personal_color
  return COLOR_PALETTE[hashId(profile.id) % COLOR_PALETTE.length]
}
