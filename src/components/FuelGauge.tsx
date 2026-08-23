import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useProfiles, creatorName } from '../lib/hooks'
import { useFuelGauge, useSetFuelLevel } from '../lib/fuel'
import { formatDateTime } from '../lib/format'
import { Button, Card, LoadingState } from './ui'

const CX = 100
const CY = 100
const R = 78
const HANDLE_R = 14
const HANDLE_HIT_R = 22

function angleFor(level: number) {
  return 180 * (1 - level / 100)
}

function pointAt(angleDeg: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY - r * Math.sin(rad) }
}

function progressArcPath(level: number) {
  const start = pointAt(180, R)
  const end = pointAt(angleFor(level), R)
  const sweepDeg = (level / 100) * 180
  const largeArc = sweepDeg > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${R} ${R} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

function levelColor(level: number) {
  if (level <= 15) return '#dc2626'
  if (level <= 35) return '#d98a2b'
  return '#1f7a4d'
}

/** Räknar om en skärmpunkt till en nivå 0-100, relativt mätarens SVG. */
function levelFromPoint(clientX: number, clientY: number, svg: SVGSVGElement): number {
  const rect = svg.getBoundingClientRect()
  const scaleX = 200 / rect.width
  const scaleY = 120 / rect.height
  const x = (clientX - rect.left) * scaleX
  const y = (clientY - rect.top) * scaleY
  const dx = x - CX
  const dy = CY - y
  let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
  if (angleDeg < 0) angleDeg = dx >= 0 ? 0 : 180
  angleDeg = Math.min(180, Math.max(0, angleDeg))
  return Math.round(100 * (1 - angleDeg / 180))
}

export function FuelGauge() {
  const { user } = useAuth()
  const { map } = useProfiles()
  const fuel = useFuelGauge()
  const setFuelLevel = useSetFuelLevel()
  const [editing, setEditing] = useState(false)
  const [dragLevel, setDragLevel] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)

  const savedLevel = fuel.data?.level ?? 50
  const level = dragLevel ?? savedLevel

  function toggleEditing() {
    setDragLevel(null)
    setEditing((e) => !e)
  }

  // Draget hakas bara på själva visarhandtaget, och bara i redigeringsläge —
  // ett oavsiktligt svep över kortet ska inte kunna ändra värdet.
  function handlePointerDown(e: React.PointerEvent<SVGGElement>) {
    if (!user || !editing) return
    const svg = e.currentTarget.ownerSVGElement
    if (!svg) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    setDragLevel(levelFromPoint(e.clientX, e.clientY, svg))
  }

  function handlePointerMove(e: React.PointerEvent<SVGGElement>) {
    if (!dragging) return
    const svg = e.currentTarget.ownerSVGElement
    if (!svg) return
    setDragLevel(levelFromPoint(e.clientX, e.clientY, svg))
  }

  async function handlePointerUp(e: React.PointerEvent<SVGGElement>) {
    if (!dragging || !user) return
    setDragging(false)
    const svg = e.currentTarget.ownerSVGElement
    const finalLevel = svg ? levelFromPoint(e.clientX, e.clientY, svg) : level
    setDragLevel(finalLevel)
    await setFuelLevel(finalLevel, user.id)
    setEditing(false)
  }

  if (fuel.isLoading) {
    return (
      <Card className="p-4">
        <LoadingState label="Laddar tankmätare…" />
      </Card>
    )
  }

  const needleTip = pointAt(angleFor(level), R - 12)
  const handlePos = pointAt(angleFor(level), R)

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold text-brand-800">Tankmätare — vaktbilen</h2>
        <Button variant="secondary" size="md" className="!px-3 !py-1 text-xs" onClick={toggleEditing}>
          {editing ? 'Klar' : 'Ändra'}
        </Button>
      </div>
      <svg viewBox="0 0 200 120" className="mx-auto w-full max-w-xs select-none">
        <path d={progressArcPath(100)} fill="none" stroke="#e2e8f0" strokeWidth={14} strokeLinecap="round" />
        <path d={progressArcPath(level)} fill="none" stroke={levelColor(level)} strokeWidth={14} strokeLinecap="round" />
        <text x={16} y={112} className="fill-slate-500" fontSize={12} fontWeight={600}>E</text>
        <text x={178} y={112} className="fill-slate-500" fontSize={12} fontWeight={600}>F</text>
        <line x1={CX} y1={CY} x2={needleTip.x} y2={needleTip.y} stroke="#1e293b" strokeWidth={3} strokeLinecap="round" />
        <circle cx={CX} cy={CY} r={7} fill="#1e293b" />
        {editing && (
          <g
            className="touch-none"
            style={{ cursor: 'grab' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Osynlig, betydligt större träffyta — den synliga cirkeln är för liten att
                greppa med fingret på mobil, särskilt om handen skakar lite. */}
            <circle cx={handlePos.x} cy={handlePos.y} r={HANDLE_HIT_R} fill="transparent" />
            <circle cx={handlePos.x} cy={handlePos.y} r={HANDLE_R} fill="#fff" stroke="#1e293b" strokeWidth={3} />
          </g>
        )}
        <text x={CX} y={CY + 34} textAnchor="middle" className="fill-brand-800" fontSize={20} fontWeight={700}>
          {level}%
        </text>
      </svg>

      <p className="mt-2 text-center text-xs text-slate-400">
        {editing ? 'Dra i handtaget för att ändra nivån.' : 'Tryck "Ändra" för att uppdatera nivån.'}
      </p>

      {fuel.data && (
        <p className="mt-1 text-center text-xs text-slate-500">
          Senast ändrat: {formatDateTime(fuel.data.updated_at)} av {creatorName(map, fuel.data.updated_by)}
        </p>
      )}
    </Card>
  )
}
