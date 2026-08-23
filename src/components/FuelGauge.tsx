import { useEffect, useRef, useState } from 'react'
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

/**
 * Räknar om en skärmpunkt till en nivå 0-100, relativt mätarens SVG.
 * Följer bara pekarens horisontella position (E till vänster, F till höger) —
 * inte vinkeln från mittpunkten. En vinkelberäkning (atan2) fastnar i praktiken
 * så fort fingret glider under mätarens mittlinje.
 */
function levelFromPoint(clientX: number, svg: SVGSVGElement): number {
  const rect = svg.getBoundingClientRect()
  const scaleX = 200 / rect.width
  const x = (clientX - rect.left) * scaleX
  const level = ((x - (CX - R)) / (2 * R)) * 100
  return Math.round(Math.min(100, Math.max(0, level)))
}

export function FuelGauge() {
  const { user } = useAuth()
  const { map } = useProfiles()
  const fuel = useFuelGauge()
  const setFuelLevel = useSetFuelLevel()
  const svgRef = useRef<SVGSVGElement>(null)
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
    e.preventDefault()
    const svg = svgRef.current
    if (!svg) return
    setDragging(true)
    setDragLevel(levelFromPoint(e.clientX, svg))
  }

  // Lyssnare på window (inte på handtaget) medan man drar — handtaget flyttar sig
  // varje frame, och att låta träffytan själv hänga med i draget gjorde att grepp
  // ibland tappades halvvägs (särskilt på mobil). Window-lyssnare kan inte tappas.
  useEffect(() => {
    if (!dragging || !user) return

    function onMove(e: PointerEvent) {
      const svg = svgRef.current
      if (!svg) return
      setDragLevel(levelFromPoint(e.clientX, svg))
    }

    async function onUp(e: PointerEvent) {
      setDragging(false)
      const svg = svgRef.current
      const finalLevel = svg ? levelFromPoint(e.clientX, svg) : level
      setDragLevel(finalLevel)
      setEditing(false)
      if (user) await setFuelLevel(finalLevel, user.id)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, user])

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
      <svg ref={svgRef} viewBox="0 0 200 120" className="mx-auto w-full max-w-xs select-none">
        <path d={progressArcPath(100)} fill="none" stroke="#e2e8f0" strokeWidth={14} strokeLinecap="round" />
        <path d={progressArcPath(level)} fill="none" stroke={levelColor(level)} strokeWidth={14} strokeLinecap="round" />
        <text x={16} y={112} className="fill-slate-500" fontSize={12} fontWeight={600}>E</text>
        <text x={178} y={112} className="fill-slate-500" fontSize={12} fontWeight={600}>F</text>
        <line x1={CX} y1={CY} x2={needleTip.x} y2={needleTip.y} stroke="#1e293b" strokeWidth={3} strokeLinecap="round" />
        <circle cx={CX} cy={CY} r={7} fill="#1e293b" />
        {editing && (
          <g className="touch-none" style={{ cursor: 'grab' }} onPointerDown={handlePointerDown}>
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
