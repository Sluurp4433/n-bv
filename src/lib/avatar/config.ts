// Strukturerad avatar: medlemmen väljer figurtyp och delar, vi sparar valen
// och renderar samma figur som SVG i valfri storlek.

export type AvatarConfig = {
  v: 1
  kind: string
  skin: string
  face: string
  eyes: string
  brows: string
  mouth: string
  facial: string
  hair: string
  hairColor: string
  top: string
  topColor: string
  eyewear: string
  headwear: string
  headwearColor: string
  neckwear: string
  neckwearColor: string
  bodyColor: string
}

// ---- Figurtyper ----
export const HUMAN_KINDS = ['human'] as const
export const ANIMAL_KINDS = [
  'cat', 'dog', 'fox', 'bear', 'rabbit', 'mouse', 'squirrel', 'raccoon', 'crocodile', 'panda', 'owl', 'eagle',
] as const
export const INSECT_KINDS = ['bee', 'ladybug', 'butterfly', 'ant'] as const
export const OTHER_KINDS = ['octopus', 'alien', 'robot'] as const
export const ALL_KINDS = [...HUMAN_KINDS, ...ANIMAL_KINDS, ...INSECT_KINDS, ...OTHER_KINDS] as const

export const KIND_LABELS: Record<string, string> = {
  human: 'Avatar',
  cat: 'Katt', dog: 'Hund', fox: 'Räv', bear: 'Björn', rabbit: 'Kanin', mouse: 'Mus',
  squirrel: 'Ekorre', raccoon: 'Tvättbjörn', crocodile: 'Krokodil', panda: 'Panda', owl: 'Uggla', eagle: 'Örn',
  bee: 'Bi', ladybug: 'Nyckelpiga', butterfly: 'Fjäril', ant: 'Myra',
  octopus: 'Bläckfisk', alien: 'Utomjording', robot: 'Robot',
}

export function isHuman(kind: string) { return (HUMAN_KINDS as readonly string[]).includes(kind) }

// ---- Paletter (nyckel -> hex) ----
export const SKIN_TONES: Record<string, string> = {
  s1: '#ffe0bd', s2: '#f6c197', s3: '#e0a06e', s4: '#c68642', s5: '#8d5524', s6: '#5c3820',
}
export const HAIR_COLORS: Record<string, string> = {
  h1: '#2b2320', h2: '#5a3825', h3: '#a9662e', h4: '#d8a83b',
  h5: '#ece6d6', h6: '#b3b3ba', h7: '#c0392b', h8: '#7b5bd6',
}
export const CLOTHING_COLORS: Record<string, string> = {
  c1: '#2f6395', c2: '#1f7a4d', c3: '#b0413e', c4: '#d98a2b', c5: '#7b5bd6',
  c6: '#2c3e50', c7: '#d6497e', c8: '#159a86', c9: '#e0b000', c10: '#8895a3',
}
export const ANIMAL_COLORS: Record<string, string> = {
  a1: '#e8a45c', a2: '#b5773f', a3: '#9aa0a8', a4: '#f2ede4', a5: '#3b3a3c',
  a6: '#d8b38a', a7: '#c9884f', a8: '#6d6e72', a9: '#e6c34a', a10: '#c0392b',
}

// ---- Alternativ (nycklar) ----
export const FACE_SHAPES = ['round', 'oval', 'square', 'heart'] as const
export const EYE_STYLES = ['dots', 'round', 'happy', 'sleepy', 'wide', 'wink'] as const
export const BROW_STYLES = ['straight', 'raised', 'flat', 'angled'] as const
export const MOUTH_STYLES = ['smile', 'grin', 'neutral', 'open', 'smirk', 'sad'] as const
export const FACIAL_STYLES = ['none', 'stubble', 'mustache', 'goatee', 'beard'] as const
export const HAIR_STYLES = [
  'none', 'short', 'buzz', 'side', 'bob', 'long', 'ponytail', 'curly', 'spiky',
  'bun', 'afro', 'mohawk', 'wavy', 'braids', 'pixie', 'updo',
] as const
export const TOP_STYLES = [
  'tshirt', 'hoodie', 'shirt', 'vest', 'jacket', 'sweater', 'tank', 'dress', 'turtleneck', 'stripes',
] as const
export const EYEWEAR_STYLES = ['none', 'glasses', 'sunglasses', 'monocle'] as const
export const HEADWEAR_STYLES = ['none', 'beanie', 'cap', 'earmuffs', 'headband', 'bandana'] as const
export const NECKWEAR_STYLES = ['none', 'scarf'] as const

const skinKeys = Object.keys(SKIN_TONES)
const hairColorKeys = Object.keys(HAIR_COLORS)
const clothingKeys = Object.keys(CLOTHING_COLORS)
const animalKeys = Object.keys(ANIMAL_COLORS)

export const DEFAULT_AVATAR: AvatarConfig = {
  v: 1,
  kind: 'human',
  skin: 's2',
  face: 'round',
  eyes: 'round',
  brows: 'straight',
  mouth: 'smile',
  facial: 'none',
  hair: 'short',
  hairColor: 'h2',
  top: 'tshirt',
  topColor: 'c1',
  eyewear: 'none',
  headwear: 'none',
  headwearColor: 'c6',
  neckwear: 'none',
  neckwearColor: 'c3',
  bodyColor: 'a1',
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function randomAvatar(): AvatarConfig {
  const kind = pick(ALL_KINDS)
  return {
    v: 1,
    kind,
    skin: pick(skinKeys),
    face: pick(FACE_SHAPES),
    eyes: pick(EYE_STYLES),
    brows: pick(BROW_STYLES),
    mouth: pick(MOUTH_STYLES),
    facial: kind === 'human' && Math.random() < 0.4 ? pick(FACIAL_STYLES.filter((f) => f !== 'none')) : 'none',
    hair: pick(HAIR_STYLES.filter((h) => h !== 'none')),
    hairColor: pick(hairColorKeys),
    top: pick(TOP_STYLES),
    topColor: pick(clothingKeys),
    eyewear: Math.random() < 0.3 ? pick(EYEWEAR_STYLES.filter((e) => e !== 'none')) : 'none',
    headwear: Math.random() < 0.25 ? pick(HEADWEAR_STYLES.filter((h) => h !== 'none')) : 'none',
    headwearColor: pick(clothingKeys),
    neckwear: Math.random() < 0.2 ? 'scarf' : 'none',
    neckwearColor: pick(clothingKeys),
    bodyColor: pick(animalKeys),
  }
}

function valid(value: unknown, allowed: readonly string[], fallback: string): string {
  return typeof value === 'string' && allowed.includes(value) ? value : fallback
}

/** Gör en godtycklig lagrad config säker att rendera (gamla/okända värden -> default). */
export function sanitizeAvatar(input: unknown): AvatarConfig {
  const o = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  // Bakåtkompatibilitet: äldre man/kvinna -> generisk avatar
  let kindRaw = typeof o.kind === 'string' ? o.kind : 'human'
  if (kindRaw === 'woman' || kindRaw === 'man') kindRaw = 'human'
  return {
    v: 1,
    kind: valid(kindRaw, ALL_KINDS, DEFAULT_AVATAR.kind),
    skin: valid(o.skin, skinKeys, DEFAULT_AVATAR.skin),
    face: valid(o.face, FACE_SHAPES, DEFAULT_AVATAR.face),
    eyes: valid(o.eyes, EYE_STYLES, DEFAULT_AVATAR.eyes),
    brows: valid(o.brows, BROW_STYLES, DEFAULT_AVATAR.brows),
    mouth: valid(o.mouth, MOUTH_STYLES, DEFAULT_AVATAR.mouth),
    facial: valid(o.facial, FACIAL_STYLES, DEFAULT_AVATAR.facial),
    hair: valid(o.hair, HAIR_STYLES, DEFAULT_AVATAR.hair),
    hairColor: valid(o.hairColor, hairColorKeys, DEFAULT_AVATAR.hairColor),
    top: valid(o.top, TOP_STYLES, DEFAULT_AVATAR.top),
    topColor: valid(o.topColor, clothingKeys, DEFAULT_AVATAR.topColor),
    eyewear: valid(o.eyewear, EYEWEAR_STYLES, DEFAULT_AVATAR.eyewear),
    headwear: valid(o.headwear, HEADWEAR_STYLES, DEFAULT_AVATAR.headwear),
    headwearColor: valid(o.headwearColor, clothingKeys, DEFAULT_AVATAR.headwearColor),
    neckwear: valid(o.neckwear, NECKWEAR_STYLES, DEFAULT_AVATAR.neckwear),
    neckwearColor: valid(o.neckwearColor, clothingKeys, DEFAULT_AVATAR.neckwearColor),
    bodyColor: valid(o.bodyColor, animalKeys, DEFAULT_AVATAR.bodyColor),
  }
}

export function skinHex(k: string) { return SKIN_TONES[k] ?? SKIN_TONES.s2 }
export function hairHex(k: string) { return HAIR_COLORS[k] ?? HAIR_COLORS.h2 }
export function clothingHex(k: string) { return CLOTHING_COLORS[k] ?? CLOTHING_COLORS.c1 }
export function animalHex(k: string) { return ANIMAL_COLORS[k] ?? ANIMAL_COLORS.a1 }

export function darken(hex: string, amount = 0.18): string {
  const m = hex.replace('#', '')
  const r = parseInt(m.slice(0, 2), 16)
  const g = parseInt(m.slice(2, 4), 16)
  const b = parseInt(m.slice(4, 6), 16)
  const d = (c: number) => Math.max(0, Math.round(c * (1 - amount)))
  return `#${[d(r), d(g), d(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

export function lighten(hex: string, amount = 0.4): string {
  const m = hex.replace('#', '')
  const r = parseInt(m.slice(0, 2), 16)
  const g = parseInt(m.slice(2, 4), 16)
  const b = parseInt(m.slice(4, 6), 16)
  const l = (c: number) => Math.min(255, Math.round(c + (255 - c) * amount))
  return `#${[l(r), l(g), l(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}
