import type { ReactNode } from 'react'
import { EyesLayer } from './parts'
import { animalHex, darken, lighten } from './config'

const INK = '#2b2320'

/** Renderar en djur- eller insektsfigur som fyller 0..100. */
export function CreatureCharacter({
  kind,
  bodyColor,
  eyes,
}: {
  kind: string
  bodyColor: string
  eyes: string
}): ReactNode {
  const c = animalHex(bodyColor)
  switch (kind) {
    case 'cat': return <Cat c={c} eyes={eyes} />
    case 'dog': return <Dog c={c} eyes={eyes} />
    case 'fox': return <Fox c={c} eyes={eyes} />
    case 'bear': return <Bear c={c} eyes={eyes} />
    case 'rabbit': return <Rabbit c={c} eyes={eyes} />
    case 'owl': return <Owl c={c} />
    case 'panda': return <Panda />
    case 'mouse': return <Mouse c={c} eyes={eyes} />
    case 'squirrel': return <Squirrel c={c} eyes={eyes} />
    case 'raccoon': return <Raccoon c={c} eyes={eyes} />
    case 'crocodile': return <Crocodile eyes={eyes} />
    case 'eagle': return <Eagle c={c} eyes={eyes} />
    case 'bee': return <Bee c={c} eyes={eyes} />
    case 'ladybug': return <Ladybug c={c} />
    case 'butterfly': return <Butterfly c={c} eyes={eyes} />
    case 'ant': return <Ant c={c} />
    case 'octopus': return <Octopus c={c} eyes={eyes} />
    case 'alien': return <Alien eyes={eyes} />
    case 'robot': return <Robot c={c} />
    default: return <Cat c={c} eyes={eyes} />
  }
}

function nose(x: number, y: number, fill = '#d06b7a') {
  return <path d={`M${x - 3} ${y} L${x + 3} ${y} L${x} ${y + 3} Z`} fill={fill} />
}

function Cat({ c, eyes }: { c: string; eyes: string }) {
  const line = darken(c, 0.22)
  return (
    <>
      <path d="M28 36 L33 14 L45 30 Z" fill={c} stroke={line} strokeWidth="1" />
      <path d="M72 36 L67 14 L55 30 Z" fill={c} stroke={line} strokeWidth="1" />
      <path d="M31.5 31 L34.5 20 L40 29 Z" fill="#e79aa8" />
      <path d="M68.5 31 L65.5 20 L60 29 Z" fill="#e79aa8" />
      <circle cx="50" cy="52" r="27" fill={c} stroke={line} strokeWidth="1" />
      <EyesLayer style={eyes} />
      {nose(50, 59)}
      <path d="M50 62 Q46 66 42 64 M50 62 Q54 66 58 64" stroke={INK} strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <g stroke={INK} strokeWidth="0.7" opacity="0.5">
        <line x1="18" y1="55" x2="33" y2="56" /><line x1="18" y1="61" x2="33" y2="60" />
        <line x1="82" y1="55" x2="67" y2="56" /><line x1="82" y1="61" x2="67" y2="60" />
      </g>
    </>
  )
}

function Dog({ c, eyes }: { c: string; eyes: string }) {
  const line = darken(c, 0.22)
  const snout = lighten(c, 0.45)
  return (
    <>
      <ellipse cx="24" cy="46" rx="9" ry="16" fill={darken(c, 0.1)} stroke={line} strokeWidth="1" />
      <ellipse cx="76" cy="46" rx="9" ry="16" fill={darken(c, 0.1)} stroke={line} strokeWidth="1" />
      <circle cx="50" cy="50" r="27" fill={c} stroke={line} strokeWidth="1" />
      <ellipse cx="50" cy="62" rx="15" ry="12" fill={snout} />
      <EyesLayer style={eyes} />
      <ellipse cx="50" cy="58" rx="4.5" ry="3.5" fill={INK} />
      <path d="M50 61 L50 66 M50 66 Q45 70 42 67 M50 66 Q55 70 58 67" stroke={INK} strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </>
  )
}

function Fox({ c, eyes }: { c: string; eyes: string }) {
  const line = darken(c, 0.2)
  return (
    <>
      <path d="M26 40 L30 12 L48 30 Z" fill={c} stroke={line} strokeWidth="1" />
      <path d="M74 40 L70 12 L52 30 Z" fill={c} stroke={line} strokeWidth="1" />
      <path d="M29 34 L31 19 L41 30 Z" fill={INK} opacity="0.75" />
      <path d="M71 34 L69 19 L59 30 Z" fill={INK} opacity="0.75" />
      <path d="M50 30 C70 30 74 46 68 60 C62 74 50 78 50 78 C50 78 38 74 32 60 C26 46 30 30 50 30 Z" fill={c} stroke={line} strokeWidth="1" />
      <path d="M50 52 C60 52 64 62 58 70 C54 76 50 78 50 78 C50 78 46 76 42 70 C36 62 40 52 50 52 Z" fill="#f6efe6" />
      <EyesLayer style={eyes} />
      <path d="M46 66 L54 66 L50 71 Z" fill={INK} />
    </>
  )
}

function Bear({ c, eyes }: { c: string; eyes: string }) {
  const line = darken(c, 0.22)
  const snout = lighten(c, 0.4)
  return (
    <>
      <circle cx="26" cy="30" r="11" fill={c} stroke={line} strokeWidth="1" />
      <circle cx="74" cy="30" r="11" fill={c} stroke={line} strokeWidth="1" />
      <circle cx="26" cy="30" r="5" fill={snout} />
      <circle cx="74" cy="30" r="5" fill={snout} />
      <circle cx="50" cy="52" r="28" fill={c} stroke={line} strokeWidth="1" />
      <ellipse cx="50" cy="62" rx="16" ry="13" fill={snout} />
      <EyesLayer style={eyes} />
      <ellipse cx="50" cy="57" rx="5" ry="4" fill={INK} />
      <path d="M50 61 L50 66 M50 66 Q45 70 43 67 M50 66 Q55 70 57 67" stroke={INK} strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </>
  )
}

function Rabbit({ c, eyes }: { c: string; eyes: string }) {
  const line = darken(c, 0.2)
  return (
    <>
      <ellipse cx="40" cy="22" rx="7" ry="20" fill={c} stroke={line} strokeWidth="1" />
      <ellipse cx="60" cy="22" rx="7" ry="20" fill={c} stroke={line} strokeWidth="1" />
      <ellipse cx="40" cy="22" rx="3" ry="14" fill="#e79aa8" />
      <ellipse cx="60" cy="22" rx="3" ry="14" fill="#e79aa8" />
      <circle cx="50" cy="54" r="26" fill={c} stroke={line} strokeWidth="1" />
      <EyesLayer style={eyes} />
      {nose(50, 60)}
      <path d="M50 63 L50 67 M46 71 L46 67 L54 67 L54 71" stroke={INK} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <rect x="46.5" y="67" width="7" height="5" rx="1.2" fill="#fff" stroke={INK} strokeWidth="0.6" />
    </>
  )
}

function Owl({ c }: { c: string }) {
  const line = darken(c, 0.22)
  const belly = lighten(c, 0.35)
  return (
    <>
      <path d="M22 28 L30 40 L40 30 Z" fill={c} />
      <path d="M78 28 L70 40 L60 30 Z" fill={c} />
      <path d="M50 22 C74 22 78 44 74 60 C70 76 58 80 50 80 C42 80 30 76 26 60 C22 44 26 22 50 22 Z" fill={c} stroke={line} strokeWidth="1" />
      <path d="M50 44 C62 44 66 62 58 72 C54 77 50 78 50 78 C50 78 46 77 42 72 C34 62 38 44 50 44 Z" fill={belly} />
      <circle cx="39" cy="46" r="12" fill="#fff" stroke={line} strokeWidth="1" />
      <circle cx="61" cy="46" r="12" fill="#fff" stroke={line} strokeWidth="1" />
      <circle cx="39" cy="47" r="5" fill={INK} />
      <circle cx="61" cy="47" r="5" fill={INK} />
      <circle cx="40.5" cy="45.5" r="1.6" fill="#fff" />
      <circle cx="62.5" cy="45.5" r="1.6" fill="#fff" />
      <path d="M44 56 L56 56 L50 64 Z" fill="#e0a800" stroke={darken('#e0a800', 0.2)} strokeWidth="0.6" />
    </>
  )
}

function Panda() {
  return (
    <>
      <circle cx="27" cy="30" r="11" fill="#2b2320" />
      <circle cx="73" cy="30" r="11" fill="#2b2320" />
      <circle cx="50" cy="52" r="28" fill="#f6f6f4" stroke="#d8d8d4" strokeWidth="1" />
      <ellipse cx="38" cy="50" rx="8" ry="11" fill="#2b2320" transform="rotate(-15 38 50)" />
      <ellipse cx="62" cy="50" rx="8" ry="11" fill="#2b2320" transform="rotate(15 62 50)" />
      <circle cx="39" cy="50" r="3.4" fill="#fff" />
      <circle cx="61" cy="50" r="3.4" fill="#fff" />
      <ellipse cx="50" cy="62" rx="4.5" ry="3.4" fill="#2b2320" />
      <path d="M50 65 Q45 69 42 66 M50 65 Q55 69 58 66" stroke="#2b2320" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </>
  )
}

function Bee({ c, eyes }: { c: string; eyes: string }) {
  const body = c === '#f2ede4' ? '#e6c34a' : c
  const line = darken(body, 0.25)
  return (
    <>
      <ellipse cx="30" cy="34" rx="14" ry="9" fill="#eaf4ff" stroke="#b9d3e8" strokeWidth="1" opacity="0.9" transform="rotate(-20 30 34)" />
      <ellipse cx="70" cy="34" rx="14" ry="9" fill="#eaf4ff" stroke="#b9d3e8" strokeWidth="1" opacity="0.9" transform="rotate(20 70 34)" />
      <path d="M40 18 Q36 12 32 12 M60 18 Q64 12 68 12" stroke={INK} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <circle cx="32" cy="11" r="2" fill={INK} /><circle cx="68" cy="11" r="2" fill={INK} />
      <ellipse cx="50" cy="56" rx="26" ry="24" fill={body} stroke={line} strokeWidth="1" />
      <path d="M35 44 Q50 40 65 44 M31 56 H69 M35 68 Q50 72 65 68" stroke={INK} strokeWidth="4" fill="none" opacity="0.9" />
      <EyesLayer style={eyes} />
      <path d="M43 62 Q50 68 57 62" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </>
  )
}

function Ladybug({ c }: { c: string }) {
  const shell = c === '#f2ede4' ? '#c0392b' : c
  const line = darken(shell, 0.25)
  return (
    <>
      <path d="M40 20 Q36 12 31 12 M60 20 Q64 12 69 12" stroke={INK} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <circle cx="31" cy="11" r="2" fill={INK} /><circle cx="69" cy="11" r="2" fill={INK} />
      <path d="M22 54 A28 28 0 0 1 78 54 Z" fill="#2b2320" />
      <path d="M20 56 A30 30 0 0 1 80 56 L80 58 A30 30 0 0 1 20 58 Z" fill="#2b2320" />
      <path d="M22 56 A28 26 0 0 1 78 56 C78 74 62 82 50 82 C38 82 22 74 22 56 Z" fill={shell} stroke={line} strokeWidth="1" />
      <line x1="50" y1="40" x2="50" y2="82" stroke={INK} strokeWidth="1.6" />
      <g fill={INK}>
        <circle cx="36" cy="60" r="3.6" /><circle cx="64" cy="60" r="3.6" />
        <circle cx="40" cy="72" r="3" /><circle cx="60" cy="72" r="3" />
      </g>
      <circle cx="40" cy="46" r="3" fill="#fff" /><circle cx="60" cy="46" r="3" fill="#fff" />
      <circle cx="40" cy="46" r="1.5" fill={INK} /><circle cx="60" cy="46" r="1.5" fill={INK} />
    </>
  )
}

function Butterfly({ c, eyes }: { c: string; eyes: string }) {
  const wing = c === '#f2ede4' ? '#7b5bd6' : c
  const line = darken(wing, 0.25)
  const spot = lighten(wing, 0.5)
  return (
    <>
      <path d="M40 22 Q34 12 28 14 M60 22 Q66 12 72 14" stroke={INK} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <circle cx="28" cy="14" r="2" fill={INK} /><circle cx="72" cy="14" r="2" fill={INK} />
      <ellipse cx="30" cy="40" rx="18" ry="15" fill={wing} stroke={line} strokeWidth="1" />
      <ellipse cx="70" cy="40" rx="18" ry="15" fill={wing} stroke={line} strokeWidth="1" />
      <ellipse cx="32" cy="66" rx="14" ry="12" fill={wing} stroke={line} strokeWidth="1" />
      <ellipse cx="68" cy="66" rx="14" ry="12" fill={wing} stroke={line} strokeWidth="1" />
      <circle cx="28" cy="40" r="4" fill={spot} /><circle cx="72" cy="40" r="4" fill={spot} />
      <circle cx="31" cy="66" r="3" fill={spot} /><circle cx="69" cy="66" r="3" fill={spot} />
      <rect x="46" y="34" width="8" height="40" rx="4" fill={darken(wing, 0.35)} />
      <g transform="translate(0,4)"><EyesLayer style={eyes} /></g>
      <path d="M45 56 Q50 61 55 56" stroke={INK} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </>
  )
}

function Ant({ c }: { c: string }) {
  const body = c === '#f2ede4' ? '#6d4b34' : darken(c, 0.1)
  const line = darken(body, 0.25)
  return (
    <>
      <path d="M44 20 Q40 10 34 10 M56 20 Q60 10 66 10" stroke={INK} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <circle cx="34" cy="10" r="2" fill={INK} /><circle cx="66" cy="10" r="2" fill={INK} />
      <g stroke={line} strokeWidth="2.4" strokeLinecap="round">
        <path d="M40 52 L22 46 M40 58 L20 60 M40 64 L24 72" fill="none" />
        <path d="M60 52 L78 46 M60 58 L80 60 M60 64 L76 72" fill="none" />
      </g>
      <circle cx="50" cy="28" r="15" fill={body} stroke={line} strokeWidth="1" />
      <ellipse cx="50" cy="52" rx="12" ry="11" fill={body} stroke={line} strokeWidth="1" />
      <ellipse cx="50" cy="74" rx="16" ry="15" fill={body} stroke={line} strokeWidth="1" />
      <circle cx="44" cy="26" r="3" fill="#fff" /><circle cx="56" cy="26" r="3" fill="#fff" />
      <circle cx="44" cy="26" r="1.5" fill={INK} /><circle cx="56" cy="26" r="1.5" fill={INK} />
      <path d="M45 32 Q50 36 55 32" stroke={INK} strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </>
  )
}

function Mouse({ c, eyes }: { c: string; eyes: string }) {
  const line = darken(c, 0.2)
  return (
    <>
      <circle cx="27" cy="30" r="15" fill={c} stroke={line} strokeWidth="1" />
      <circle cx="73" cy="30" r="15" fill={c} stroke={line} strokeWidth="1" />
      <circle cx="27" cy="30" r="9" fill="#f0b9c4" />
      <circle cx="73" cy="30" r="9" fill="#f0b9c4" />
      <circle cx="50" cy="54" r="24" fill={c} stroke={line} strokeWidth="1" />
      <EyesLayer style={eyes} />
      <ellipse cx="50" cy="61" rx="4" ry="3" fill="#e07a99" />
      <path d="M50 64 L50 68" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
      <g stroke={INK} strokeWidth="0.7" opacity="0.5">
        <line x1="20" y1="60" x2="34" y2="60" /><line x1="21" y1="66" x2="34" y2="64" />
        <line x1="80" y1="60" x2="66" y2="60" /><line x1="79" y1="66" x2="66" y2="64" />
      </g>
    </>
  )
}

function Squirrel({ c, eyes }: { c: string; eyes: string }) {
  const line = darken(c, 0.2)
  const belly = lighten(c, 0.45)
  return (
    <>
      <path d="M70 78 C96 74 94 28 68 30 C86 36 82 58 62 58 C74 64 72 74 70 78 Z" fill={c} stroke={line} strokeWidth="1" />
      <path d="M34 34 L30 16 L44 28 Z" fill={c} stroke={line} strokeWidth="1" />
      <path d="M66 34 L70 16 L56 28 Z" fill={c} stroke={line} strokeWidth="1" />
      <circle cx="48" cy="52" r="24" fill={c} stroke={line} strokeWidth="1" />
      <ellipse cx="48" cy="60" rx="13" ry="11" fill={belly} />
      <EyesLayer style={eyes} />
      <ellipse cx="48" cy="58" rx="3.6" ry="3" fill={INK} />
      <path d="M45 65 L45 61 L51 61 L51 65" stroke={INK} strokeWidth="1" fill="none" />
      <rect x="45" y="61" width="6" height="5" rx="1" fill="#fff" stroke={INK} strokeWidth="0.5" />
    </>
  )
}

function Raccoon({ c, eyes }: { c: string; eyes: string }) {
  const base = c === '#f2ede4' ? '#9aa0a8' : c
  const line = darken(base, 0.2)
  const light = lighten(base, 0.5)
  return (
    <>
      <path d="M30 34 L26 18 L42 28 Z" fill={base} stroke={line} strokeWidth="1" />
      <path d="M70 34 L74 18 L58 28 Z" fill={base} stroke={line} strokeWidth="1" />
      <circle cx="50" cy="52" r="26" fill={base} stroke={line} strokeWidth="1" />
      <path d="M28 46 C34 40 44 40 46 48 C47 54 41 58 34 56 C29 54 26 50 28 46 Z" fill="#2b2320" />
      <path d="M72 46 C66 40 56 40 54 48 C53 54 59 58 66 56 C71 54 74 50 72 46 Z" fill="#2b2320" />
      <path d="M40 60 C40 72 60 72 60 60 C58 68 42 68 40 60 Z" fill={light} />
      <circle cx="41" cy="48" r="3.2" fill="#fff" /><circle cx="59" cy="48" r="3.2" fill="#fff" />
      <circle cx="41" cy="48" r="1.6" fill={INK} /><circle cx="59" cy="48" r="1.6" fill={INK} />
      {void eyes}
      {nose(50, 60, '#2b2320')}
      <path d="M50 63 Q46 67 43 65 M50 63 Q54 67 57 65" stroke={INK} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </>
  )
}

function Crocodile({ eyes }: { eyes: string }) {
  const c = '#4e9a3f'
  const line = darken(c, 0.22)
  const belly = lighten(c, 0.35)
  return (
    <>
      <path d="M18 74 L82 74 C86 74 86 60 78 60 L22 60 C14 60 14 74 18 74 Z" fill={c} stroke={line} strokeWidth="1" />
      <path d="M22 66 h56" stroke={belly} strokeWidth="3" />
      <g fill="#fff" stroke={line} strokeWidth="0.5">
        <path d="M26 60 l3 5 3 -5 z" /><path d="M36 60 l3 5 3 -5 z" /><path d="M46 60 l3 5 3 -5 z" /><path d="M56 60 l3 5 3 -5 z" /><path d="M66 60 l3 5 3 -5 z" />
      </g>
      <path d="M28 54 C28 34 72 34 72 54 C72 58 68 60 62 60 L38 60 C32 60 28 58 28 54 Z" fill={c} stroke={line} strokeWidth="1" />
      <circle cx="38" cy="34" r="9" fill={c} stroke={line} strokeWidth="1" />
      <circle cx="62" cy="34" r="9" fill={c} stroke={line} strokeWidth="1" />
      <circle cx="38" cy="33" r="4.5" fill="#fff" /><circle cx="62" cy="33" r="4.5" fill="#fff" />
      <circle cx="38" cy="33" r="2.2" fill={INK} /><circle cx="62" cy="33" r="2.2" fill={INK} />
      {void eyes}
      <circle cx="42" cy="52" r="1.6" fill={INK} /><circle cx="58" cy="52" r="1.6" fill={INK} />
    </>
  )
}

function Eagle({ c, eyes }: { c: string; eyes: string }) {
  const body = c === '#f2ede4' ? '#7a5230' : darken(c, 0.05)
  const line = darken(body, 0.25)
  return (
    <>
      <path d="M20 46 Q10 42 8 52 M80 46 Q90 42 92 52" stroke={body} strokeWidth="6" fill="none" strokeLinecap="round" />
      <circle cx="50" cy="56" r="26" fill={body} stroke={line} strokeWidth="1" />
      <path d="M50 22 C74 22 78 44 72 56 C66 44 34 44 28 56 C22 44 26 22 50 22 Z" fill="#f4f1ea" stroke="#d8d5cd" strokeWidth="1" />
      <EyesLayer style={eyes} />
      <path d="M38 40 L47 44 M62 40 L53 44" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <path d="M44 52 L56 52 L52 60 Q50 63 48 60 Z" fill="#e0a800" stroke={darken('#e0a800', 0.2)} strokeWidth="0.6" />
      <path d="M48 60 Q50 64 52 60" fill="#e0a800" />
    </>
  )
}

function Octopus({ c, eyes }: { c: string; eyes: string }) {
  const body = c === '#f2ede4' ? '#d6497e' : c
  const line = darken(body, 0.2)
  const cheek = lighten(body, 0.3)
  return (
    <>
      <g fill={body} stroke={line} strokeWidth="0.5">
        <path d="M24 60 C18 76 12 78 10 88 C16 86 20 82 26 74 Z" />
        <path d="M34 66 C30 80 26 86 24 92 C30 88 34 82 38 74 Z" />
        <path d="M50 68 C50 82 48 88 48 94 C52 88 54 82 54 70 Z" />
        <path d="M66 66 C70 80 74 86 76 92 C70 88 66 82 62 74 Z" />
        <path d="M76 60 C82 76 88 78 90 88 C84 86 80 82 74 74 Z" />
      </g>
      <path d="M22 52 C22 28 78 28 78 52 C78 66 66 72 50 72 C34 72 22 66 22 52 Z" fill={body} stroke={line} strokeWidth="1" />
      <circle cx="38" cy="58" r="4" fill={cheek} opacity="0.7" /><circle cx="62" cy="58" r="4" fill={cheek} opacity="0.7" />
      <g transform="translate(0,2)"><EyesLayer style={eyes} /></g>
      <path d="M44 60 Q50 66 56 60" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </>
  )
}

function Alien({ eyes }: { eyes: string }) {
  const c = '#7ec87e'
  const line = darken(c, 0.22)
  return (
    <>
      <path d="M40 20 Q36 10 42 8 M60 20 Q64 10 58 8" stroke={line} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <circle cx="42" cy="7" r="3" fill={c} stroke={line} strokeWidth="0.6" />
      <circle cx="58" cy="7" r="3" fill={c} stroke={line} strokeWidth="0.6" />
      <path d="M50 22 C74 22 76 46 68 62 C62 74 54 78 50 78 C46 78 38 74 32 62 C24 46 26 22 50 22 Z" fill={c} stroke={line} strokeWidth="1" />
      <ellipse cx="39" cy="48" rx="7" ry="11" fill="#12131a" transform="rotate(18 39 48)" />
      <ellipse cx="61" cy="48" rx="7" ry="11" fill="#12131a" transform="rotate(-18 61 48)" />
      <circle cx="41" cy="44" r="1.8" fill="#fff" /><circle cx="59" cy="44" r="1.8" fill="#fff" />
      {void eyes}
      <path d="M45 66 Q50 69 55 66" stroke={line} strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </>
  )
}

function Robot({ c }: { c: string }) {
  const metal = c === '#f2ede4' ? '#b8c0cc' : c
  const line = darken(metal, 0.28)
  const dark = darken(metal, 0.16)
  return (
    <>
      <line x1="50" y1="24" x2="50" y2="14" stroke={line} strokeWidth="2" />
      <circle cx="50" cy="12" r="3.5" fill="#e0554f" />
      <rect x="22" y="46" width="6" height="12" rx="2" fill={dark} />
      <rect x="72" y="46" width="6" height="12" rx="2" fill={dark} />
      <rect x="26" y="26" width="48" height="48" rx="12" fill={metal} stroke={line} strokeWidth="1.5" />
      <rect x="32" y="38" width="36" height="18" rx="6" fill="#1a2230" />
      <circle cx="42" cy="47" r="5" fill="#5cd6e0" /><circle cx="58" cy="47" r="5" fill="#5cd6e0" />
      <circle cx="42" cy="47" r="2" fill="#0b3a40" /><circle cx="58" cy="47" r="2" fill="#0b3a40" />
      <g stroke={line} strokeWidth="1.4">
        <line x1="38" y1="64" x2="62" y2="64" /><line x1="43" y1="61" x2="43" y2="67" /><line x1="50" y1="61" x2="50" y2="67" /><line x1="57" y1="61" x2="57" y2="67" />
      </g>
    </>
  )
}
