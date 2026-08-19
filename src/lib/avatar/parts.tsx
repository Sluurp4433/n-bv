import type { ReactNode } from 'react'
import { skinHex, hairHex, clothingHex, darken } from './config'

// Alla delar ritas i koordinatsystemet 0..100. Enkelt, tydligt och sött även i litet format.

const INK = '#2b2320' // konturer/ögon
const stroke = { stroke: INK, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' }

/* ---------- Ansikte (huvudform) ---------- */
export function FaceLayer({ shape, skin }: { shape: string; skin: string }): ReactNode {
  const c = skinHex(skin)
  const line = darken(c, 0.22)
  switch (shape) {
    case 'oval':
      return <ellipse cx="50" cy="46" rx="20" ry="26" fill={c} stroke={line} strokeWidth="1" />
    case 'square':
      return <rect x="29" y="22" width="42" height="48" rx="15" fill={c} stroke={line} strokeWidth="1" />
    case 'heart':
      return (
        <path
          d="M50 72 C34 62 28 50 28 40 C28 30 36 24 44 27 C47 28 50 31 50 33 C50 31 53 28 56 27 C64 24 72 30 72 40 C72 50 66 62 50 72 Z"
          fill={c}
          stroke={line}
          strokeWidth="1"
        />
      )
    default: // round
      return <ellipse cx="50" cy="46" rx="23" ry="24" fill={c} stroke={line} strokeWidth="1" />
  }
}

export function EarsLayer({ skin }: { skin: string }): ReactNode {
  const c = skinHex(skin)
  const line = darken(c, 0.22)
  return (
    <>
      <ellipse cx="27" cy="48" rx="4" ry="5.5" fill={c} stroke={line} strokeWidth="1" />
      <ellipse cx="73" cy="48" rx="4" ry="5.5" fill={c} stroke={line} strokeWidth="1" />
    </>
  )
}

export function Neck({ skin }: { skin: string }): ReactNode {
  const c = skinHex(skin)
  return <rect x="43" y="62" width="14" height="16" rx="6" fill={c} />
}

/* ---------- Ögon ---------- */
export function EyesLayer({ style }: { style: string }): ReactNode {
  const L = 41
  const R = 59
  const y = 47
  const eye = (x: number, s: string) => {
    switch (s) {
      case 'dots':
        return <circle cx={x} cy={y} r="2.4" fill={INK} />
      case 'happy':
        return <path d={`M${x - 3.5} ${y + 1} Q${x} ${y - 3.5} ${x + 3.5} ${y + 1}`} {...stroke} strokeWidth="2" />
      case 'sleepy':
        return <path d={`M${x - 3.5} ${y - 0.5} Q${x} ${y + 2.5} ${x + 3.5} ${y - 0.5}`} {...stroke} strokeWidth="2" />
      case 'wide':
        return (
          <>
            <circle cx={x} cy={y} r="5" fill="#fff" stroke={INK} strokeWidth="1" />
            <circle cx={x} cy={y} r="2.5" fill={INK} />
          </>
        )
      default: // round
        return (
          <>
            <circle cx={x} cy={y} r="4" fill="#fff" stroke={INK} strokeWidth="1" />
            <circle cx={x} cy={y} r="2.2" fill={INK} />
          </>
        )
    }
  }
  if (style === 'wink') {
    return (
      <>
        {eye(L, 'round')}
        <path d={`M${R - 3.5} ${y} Q${R} ${y - 3} ${R + 3.5} ${y}`} {...stroke} strokeWidth="2" />
      </>
    )
  }
  return (
    <>
      {eye(L, style)}
      {eye(R, style)}
    </>
  )
}

/* ---------- Ögonbryn ---------- */
export function BrowsLayer({ style }: { style: string }): ReactNode {
  const L = 41
  const R = 59
  const y = 38
  const brow = (x: number, mirror = 1) => {
    switch (style) {
      case 'raised':
        return <path d={`M${x - 4} ${y + 1.5} Q${x} ${y - 2.5} ${x + 4} ${y}`} {...stroke} strokeWidth="1.8" />
      case 'flat':
        return <line x1={x - 4} y1={y} x2={x + 4} y2={y} {...stroke} strokeWidth="2.4" />
      case 'angled':
        return <line x1={x - 4 * mirror} y1={y - 1.5} x2={x + 4 * mirror} y2={y + 1.5} {...stroke} strokeWidth="2" />
      default: // straight
        return <line x1={x - 4} y1={y} x2={x + 4} y2={y} {...stroke} strokeWidth="1.8" />
    }
  }
  return (
    <>
      {brow(L, 1)}
      {brow(R, -1)}
    </>
  )
}

/* ---------- Mun ---------- */
export function MouthLayer({ style }: { style: string }): ReactNode {
  const y = 58
  switch (style) {
    case 'grin':
      return (
        <>
          <path d={`M42 ${y} Q50 ${y + 7} 58 ${y}`} fill="#fff" stroke={INK} strokeWidth="1.4" />
          <path d={`M42 ${y} Q50 ${y + 7} 58 ${y}`} {...stroke} strokeWidth="1.6" />
        </>
      )
    case 'neutral':
      return <line x1="45" y1={y + 1} x2="55" y2={y + 1} {...stroke} strokeWidth="1.8" />
    case 'open':
      return <ellipse cx="50" cy={y + 1} rx="4" ry="4.5" fill="#a83f52" stroke={INK} strokeWidth="1" />
    case 'smirk':
      return <path d={`M45 ${y + 1} Q52 ${y + 4} 57 ${y - 1}`} {...stroke} strokeWidth="1.8" />
    case 'sad':
      return <path d={`M44 ${y + 3} Q50 ${y - 2} 56 ${y + 3}`} {...stroke} strokeWidth="1.8" />
    default: // smile
      return <path d={`M43 ${y} Q50 ${y + 6} 57 ${y}`} {...stroke} strokeWidth="1.8" />
  }
}

/* ---------- Ansiktsbehåring ---------- */
export function FacialHairLayer({ style, color }: { style: string; color: string }): ReactNode {
  if (style === 'none') return null
  const c = hairHex(color)
  const must = <path d="M41 55 Q50 51 59 55 Q54 60 50 57.5 Q46 60 41 55 Z" fill={c} />
  switch (style) {
    case 'mustache':
      return must
    case 'stubble':
      return (
        <path d="M31 50 C31 69 41 77 50 77 C59 77 69 69 69 50 C64 61 58 63 50 63 C42 63 36 61 31 50 Z" fill={c} opacity="0.28" />
      )
    case 'goatee':
      return (
        <g>
          {must}
          <path d="M45 61 C45 70 55 70 55 61 C54 66 46 66 45 61 Z" fill={c} />
        </g>
      )
    case 'beard':
      return (
        <g>
          <path d="M30 49 C30 69 40 78 50 78 C60 78 70 69 70 49 C65 61 58 63 50 63 C42 63 35 61 30 49 Z" fill={c} />
          {must}
        </g>
      )
    default:
      return null
  }
}

/* ---------- Glasögon ---------- */
export function EyewearLayer({ style }: { style: string }): ReactNode {
  if (style === 'none') return null
  if (style === 'monocle') {
    return (
      <g stroke={INK} strokeWidth="1.4" fill="none">
        <circle cx="59" cy="47" r="7" />
        <path d="M59 54 Q56 62 52 66" />
      </g>
    )
  }
  const fill = style === 'sunglasses' ? '#20242b' : 'none'
  return (
    <g stroke={INK} strokeWidth="1.4" fill={fill}>
      <circle cx="41" cy="47" r="6" />
      <circle cx="59" cy="47" r="6" />
      <line x1="47" y1="47" x2="53" y2="47" />
      <line x1="27" y1="46" x2="35" y2="47" />
      <line x1="73" y1="46" x2="65" y2="47" />
    </g>
  )
}

/* ---------- Hår (bak + fram) ---------- */
export function HairBack({ style, color }: { style: string; color: string }): ReactNode {
  const c = hairHex(color)
  switch (style) {
    case 'long':
      return <path d="M24 40 C24 20 76 20 76 40 L78 76 L70 76 L70 44 C70 30 30 30 30 44 L30 76 L22 76 Z" fill={c} />
    case 'bob':
      return <path d="M25 42 C25 22 75 22 75 42 L75 60 L69 60 L69 42 C69 30 31 30 31 42 L31 60 L25 60 Z" fill={c} />
    case 'ponytail':
      return (
        <>
          <path d="M70 34 C82 36 82 60 74 66 C80 56 74 42 68 42 Z" fill={c} />
          <ellipse cx="72" cy="34" rx="4" ry="4" fill={c} />
        </>
      )
    case 'afro':
      return <circle cx="50" cy="34" r="26" fill={c} />
    case 'wavy':
      return <path d="M24 40 C24 20 76 20 76 40 C78 54 73 68 72 76 C71 64 70 52 70 44 C70 30 30 30 30 44 C30 52 29 64 28 76 C27 68 22 54 24 40 Z" fill={c} />
    case 'braids':
      return (
        <g fill={c}>
          <path d="M25 42 C25 22 75 22 75 42 L73 47 C73 33 27 33 27 47 Z" />
          <ellipse cx="27" cy="53" rx="5" ry="7" /><ellipse cx="27" cy="63" rx="4.5" ry="6" /><ellipse cx="27" cy="72" rx="4" ry="5" />
          <ellipse cx="73" cy="53" rx="5" ry="7" /><ellipse cx="73" cy="63" rx="4.5" ry="6" /><ellipse cx="73" cy="72" rx="4" ry="5" />
        </g>
      )
    case 'updo':
      return <ellipse cx="50" cy="21" rx="11" ry="8" fill={c} />
    default:
      return null
  }
}

export function HairFront({ style, color }: { style: string; color: string }): ReactNode {
  if (style === 'none' || style === 'buzz') {
    if (style === 'buzz')
      return <path d="M28 40 C30 24 70 24 72 40 C66 32 34 32 28 40 Z" fill={hairHex(color)} opacity="0.85" />
    return null
  }
  const c = hairHex(color)
  const edge = darken(c, 0.15)
  switch (style) {
    case 'short':
      return <path d="M27 42 C27 22 73 22 73 42 C69 34 66 33 60 33 C58 28 42 28 40 33 C34 33 31 34 27 42 Z" fill={c} stroke={edge} strokeWidth="0.5" />
    case 'side':
      return <path d="M27 42 C27 22 73 22 73 40 C70 33 56 33 48 34 C40 35 33 34 27 42 Z M27 42 C30 30 40 28 52 30" fill={c} stroke={edge} strokeWidth="0.6" />
    case 'bob':
      return <path d="M28 40 C28 22 72 22 72 40 C68 33 63 32 58 33 C55 28 45 28 42 33 C37 32 32 33 28 40 Z" fill={c} />
    case 'long':
      return <path d="M28 40 C28 22 72 22 72 40 C66 33 60 33 55 34 C52 29 48 29 45 34 C40 33 33 33 28 40 Z" fill={c} />
    case 'ponytail':
      return <path d="M28 42 C28 22 72 22 72 42 C67 33 60 33 54 34 C51 29 44 30 41 34 C35 34 32 35 28 42 Z" fill={c} />
    case 'curly':
      return (
        <g fill={c}>
          <circle cx="34" cy="30" r="8" />
          <circle cx="44" cy="26" r="8" />
          <circle cx="56" cy="26" r="8" />
          <circle cx="66" cy="30" r="8" />
          <circle cx="30" cy="40" r="6" />
          <circle cx="70" cy="40" r="6" />
        </g>
      )
    case 'spiky':
      return (
        <path
          d="M27 42 L31 26 L37 38 L43 24 L50 38 L57 24 L63 38 L69 26 L73 42 C66 33 34 33 27 42 Z"
          fill={c}
        />
      )
    case 'bun':
      return (
        <>
          <circle cx="50" cy="21" r="7" fill={c} />
          <path d="M28 40 C28 24 72 24 72 40 C66 33 34 33 28 40 Z" fill={c} />
        </>
      )
    case 'afro':
      return null
    case 'mohawk':
      return <path d="M45 20 L55 20 L57 40 C54 34 46 34 43 40 Z" fill={c} />
    case 'wavy':
      return <path d="M27 42 C27 22 73 22 73 42 C69 33 62 34 56 34 C53 29 47 29 44 34 C38 34 31 33 27 42 Z" fill={c} />
    case 'braids':
      return <path d="M28 40 C28 22 72 22 72 40 C67 33 60 33 54 34 C51 29 44 30 41 34 C35 34 32 35 28 40 Z" fill={c} />
    case 'pixie':
      return <path d="M28 40 C28 23 72 23 72 41 C70 34 60 33 56 33 C54 30 40 29 40 34 C36 33 31 34 28 40 Z" fill={c} stroke={edge} strokeWidth="0.6" />
    case 'updo':
      return <path d="M29 41 C29 26 71 26 71 41 C66 34 34 34 29 41 Z" fill={c} />
    default:
      return null
  }
}

/* ---------- Kläder (axlar) ---------- */
export function TopLayer({ style, color }: { style: string; color: string }): ReactNode {
  const c = clothingHex(color)
  const dark = darken(c, 0.16)
  const base = 'M16 100 C16 82 30 74 50 74 C70 74 84 82 84 100 Z'
  switch (style) {
    case 'hoodie':
      return (
        <g>
          <path d={base} fill={c} />
          <path d="M40 75 C40 84 60 84 60 75 L58 74 C55 80 45 80 42 74 Z" fill={dark} />
          <line x1="47" y1="80" x2="47" y2="92" stroke={dark} strokeWidth="1.4" />
          <line x1="53" y1="80" x2="53" y2="92" stroke={dark} strokeWidth="1.4" />
        </g>
      )
    case 'shirt':
      return (
        <g>
          <path d={base} fill={c} />
          <path d="M43 75 L50 84 L57 75 L54 74 L50 78 L46 74 Z" fill="#f4f4f4" />
          <line x1="50" y1="84" x2="50" y2="100" stroke={dark} strokeWidth="1" />
          <circle cx="50" cy="90" r="1" fill={dark} />
          <circle cx="50" cy="96" r="1" fill={dark} />
        </g>
      )
    case 'vest':
      return (
        <g>
          <path d={base} fill="#f0f0f2" />
          <path d="M16 100 C16 82 28 74 40 74 L46 100 Z" fill={c} />
          <path d="M84 100 C84 82 72 74 60 74 L54 100 Z" fill={c} />
        </g>
      )
    case 'jacket':
      return (
        <g>
          <path d={base} fill={c} />
          <path d="M46 74 L50 82 L54 74 Z" fill={dark} />
          <line x1="50" y1="80" x2="50" y2="100" stroke={dark} strokeWidth="1.6" />
          <path d="M40 75 L44 80 M60 75 L56 80" stroke={dark} strokeWidth="1.4" fill="none" />
        </g>
      )
    case 'sweater':
      return (
        <g>
          <path d={base} fill={c} />
          <path d="M42 76 C46 82 54 82 58 76" stroke={dark} strokeWidth="2" fill="none" />
        </g>
      )
    case 'tank':
      return (
        <g>
          <path d="M22 100 C22 84 34 76 50 76 C66 76 78 84 78 100 Z" fill={c} />
          <path d="M40 78 C42 84 44 88 44 100 M60 78 C58 84 56 88 56 100" stroke={dark} strokeWidth="1" fill="none" />
        </g>
      )
    case 'dress':
      return (
        <g>
          <path d={base} fill={c} />
          <path d="M43 75 C46 82 54 82 57 75" stroke={dark} strokeWidth="1.4" fill="none" />
          <path d="M28 93 C40 97 60 97 72 93" stroke={dark} strokeWidth="1.2" fill="none" />
        </g>
      )
    case 'turtleneck':
      return (
        <g>
          <path d={base} fill={c} />
          <path d="M41 74 C41 70 59 70 59 74 L59 80 C55 84 45 84 41 80 Z" fill={c} stroke={dark} strokeWidth="0.8" />
        </g>
      )
    case 'stripes':
      return (
        <g>
          <path d={base} fill={c} />
          <path d="M20 79 H80 M18 86 H82 M18 93 H82" stroke="#ffffff" strokeWidth="2.4" opacity="0.7" fill="none" />
        </g>
      )
    default: // tshirt
      return (
        <g>
          <path d={base} fill={c} />
          <path d="M43 75 C46 80 54 80 57 75" stroke={dark} strokeWidth="1.4" fill="none" />
        </g>
      )
  }
}

/* ---------- Huvudbonad ---------- */
export function HeadwearLayer({ style, color }: { style: string; color: string }): ReactNode {
  if (style === 'none') return null
  const c = clothingHex(color)
  const dark = darken(c, 0.18)
  switch (style) {
    case 'beanie':
      return (
        <g>
          <path d="M26 34 C26 16 74 16 74 34 C66 28 34 28 26 34 Z" fill={c} />
          <rect x="26" y="32" width="48" height="6" rx="3" fill={dark} />
        </g>
      )
    case 'cap':
      return (
        <g>
          <path d="M27 34 C27 18 73 18 72 34 C64 29 34 29 27 34 Z" fill={c} />
          <path d="M50 34 L82 38 C82 32 70 31 60 32 Z" fill={dark} />
        </g>
      )
    case 'earmuffs':
      return (
        <g>
          <path d="M28 40 C28 20 72 20 72 40" stroke={c} strokeWidth="4" fill="none" />
          <circle cx="27" cy="48" r="6" fill={c} stroke={dark} strokeWidth="1" />
          <circle cx="73" cy="48" r="6" fill={c} stroke={dark} strokeWidth="1" />
        </g>
      )
    case 'headband':
      return <path d="M27 38 C34 33 66 33 73 38 L73 42 C66 37 34 37 27 42 Z" fill={c} />
    case 'bandana':
      return (
        <g>
          <path d="M26 40 C26 23 74 23 74 40 C66 32 34 32 26 40 Z" fill={c} />
          <path d="M72 37 L84 33 L80 43 Z" fill={dark} />
          <g fill="#ffffff" opacity="0.6">
            <circle cx="38" cy="32" r="1.4" /><circle cx="50" cy="29" r="1.4" /><circle cx="62" cy="32" r="1.4" />
          </g>
        </g>
      )
    default:
      return null
  }
}

/* ---------- Halsduk ---------- */
export function NeckwearLayer({ style, color }: { style: string; color: string }): ReactNode {
  if (style !== 'scarf') return null
  const c = clothingHex(color)
  const dark = darken(c, 0.16)
  return (
    <g>
      <path d="M38 66 C42 74 58 74 62 66 L64 72 C58 80 42 80 36 72 Z" fill={c} />
      <path d="M56 72 L60 90 L52 90 L54 72 Z" fill={dark} />
    </g>
  )
}
