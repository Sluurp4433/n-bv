// Strukturerad avatar: medlemmen väljer delar, vi sparar valen (inte en bild)
// och renderar samma figur som SVG i valfri storlek.

export type AvatarConfig = {
  v: 1
  skin: string
  face: string
  eyes: string
  brows: string
  mouth: string
  hair: string
  hairColor: string
  top: string
  topColor: string
  eyewear: string
  headwear: string
  headwearColor: string
  neckwear: string
  neckwearColor: string
}

// ---- Paletter (nyckel -> hex) ----
export const SKIN_TONES: Record<string, string> = {
  s1: '#ffe0bd',
  s2: '#f6c197',
  s3: '#e0a06e',
  s4: '#c68642',
  s5: '#8d5524',
  s6: '#5c3820',
}

export const HAIR_COLORS: Record<string, string> = {
  h1: '#2b2320', // svart
  h2: '#5a3825', // mörkbrun
  h3: '#a9662e', // brun
  h4: '#d8a83b', // blond
  h5: '#ece6d6', // platina
  h6: '#b3b3ba', // grå
  h7: '#c0392b', // röd
  h8: '#7b5bd6', // lila (rolig)
}

export const CLOTHING_COLORS: Record<string, string> = {
  c1: '#2f6395', // marinblå
  c2: '#1f7a4d', // grön
  c3: '#b0413e', // röd
  c4: '#d98a2b', // orange
  c5: '#7b5bd6', // lila
  c6: '#2c3e50', // mörkgrå
  c7: '#d6497e', // rosa
  c8: '#159a86', // turkos
  c9: '#e0b000', // gul
  c10: '#8895a3', // grå
}

// ---- Alternativ (nycklar) ----
export const FACE_SHAPES = ['round', 'oval', 'square', 'heart'] as const
export const EYE_STYLES = ['dots', 'round', 'happy', 'sleepy', 'wide', 'wink'] as const
export const BROW_STYLES = ['straight', 'raised', 'flat', 'angled'] as const
export const MOUTH_STYLES = ['smile', 'grin', 'neutral', 'open', 'smirk', 'sad'] as const
export const HAIR_STYLES = [
  'none', 'short', 'buzz', 'side', 'bob', 'long', 'ponytail', 'curly', 'spiky', 'bun', 'afro', 'mohawk',
] as const
export const TOP_STYLES = ['tshirt', 'hoodie', 'shirt', 'vest', 'jacket', 'sweater', 'tank'] as const
export const EYEWEAR_STYLES = ['none', 'glasses', 'sunglasses'] as const
export const HEADWEAR_STYLES = ['none', 'beanie', 'cap', 'earmuffs', 'headband'] as const
export const NECKWEAR_STYLES = ['none', 'scarf'] as const

const skinKeys = Object.keys(SKIN_TONES)
const hairColorKeys = Object.keys(HAIR_COLORS)
const clothingKeys = Object.keys(CLOTHING_COLORS)

export const DEFAULT_AVATAR: AvatarConfig = {
  v: 1,
  skin: 's2',
  face: 'round',
  eyes: 'round',
  brows: 'straight',
  mouth: 'smile',
  hair: 'short',
  hairColor: 'h2',
  top: 'tshirt',
  topColor: 'c1',
  eyewear: 'none',
  headwear: 'none',
  headwearColor: 'c6',
  neckwear: 'none',
  neckwearColor: 'c3',
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function randomAvatar(): AvatarConfig {
  return {
    v: 1,
    skin: pick(skinKeys),
    face: pick(FACE_SHAPES),
    eyes: pick(EYE_STYLES),
    brows: pick(BROW_STYLES),
    mouth: pick(MOUTH_STYLES),
    hair: pick(HAIR_STYLES.filter((h) => h !== 'none')),
    hairColor: pick(hairColorKeys),
    top: pick(TOP_STYLES),
    topColor: pick(clothingKeys),
    eyewear: Math.random() < 0.35 ? pick(EYEWEAR_STYLES.filter((e) => e !== 'none')) : 'none',
    headwear: Math.random() < 0.3 ? pick(HEADWEAR_STYLES.filter((h) => h !== 'none')) : 'none',
    headwearColor: pick(clothingKeys),
    neckwear: Math.random() < 0.2 ? 'scarf' : 'none',
    neckwearColor: pick(clothingKeys),
  }
}

function valid(value: unknown, allowed: readonly string[], fallback: string): string {
  return typeof value === 'string' && allowed.includes(value) ? value : fallback
}

/** Gör en godtycklig lagrad config säker att rendera (gamla/okända värden -> default). */
export function sanitizeAvatar(input: unknown): AvatarConfig {
  const o = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  return {
    v: 1,
    skin: valid(o.skin, skinKeys, DEFAULT_AVATAR.skin),
    face: valid(o.face, FACE_SHAPES, DEFAULT_AVATAR.face),
    eyes: valid(o.eyes, EYE_STYLES, DEFAULT_AVATAR.eyes),
    brows: valid(o.brows, BROW_STYLES, DEFAULT_AVATAR.brows),
    mouth: valid(o.mouth, MOUTH_STYLES, DEFAULT_AVATAR.mouth),
    hair: valid(o.hair, HAIR_STYLES, DEFAULT_AVATAR.hair),
    hairColor: valid(o.hairColor, hairColorKeys, DEFAULT_AVATAR.hairColor),
    top: valid(o.top, TOP_STYLES, DEFAULT_AVATAR.top),
    topColor: valid(o.topColor, clothingKeys, DEFAULT_AVATAR.topColor),
    eyewear: valid(o.eyewear, EYEWEAR_STYLES, DEFAULT_AVATAR.eyewear),
    headwear: valid(o.headwear, HEADWEAR_STYLES, DEFAULT_AVATAR.headwear),
    headwearColor: valid(o.headwearColor, clothingKeys, DEFAULT_AVATAR.headwearColor),
    neckwear: valid(o.neckwear, NECKWEAR_STYLES, DEFAULT_AVATAR.neckwear),
    neckwearColor: valid(o.neckwearColor, clothingKeys, DEFAULT_AVATAR.neckwearColor),
  }
}

export function skinHex(k: string) { return SKIN_TONES[k] ?? SKIN_TONES.s2 }
export function hairHex(k: string) { return HAIR_COLORS[k] ?? HAIR_COLORS.h2 }
export function clothingHex(k: string) { return CLOTHING_COLORS[k] ?? CLOTHING_COLORS.c1 }

/** Enkel mörkare variant för skuggning/konturer. */
export function darken(hex: string, amount = 0.18): string {
  const m = hex.replace('#', '')
  const r = parseInt(m.slice(0, 2), 16)
  const g = parseInt(m.slice(2, 4), 16)
  const b = parseInt(m.slice(4, 6), 16)
  const d = (c: number) => Math.max(0, Math.round(c * (1 - amount)))
  return `#${[d(r), d(g), d(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}
