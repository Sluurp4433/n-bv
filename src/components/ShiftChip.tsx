import { Avatar } from './Avatar'
import { cn } from './ui'
import { memberColor } from '../lib/memberColor'
import { formatTime } from '../lib/format'
import type { ShiftWithBookings } from '../lib/shifts'
import type { Profile } from '../types/database.types'

export function ShiftChip({
  shift,
  map,
  userId,
  onClick,
  avatarSize = 34,
  dense,
}: {
  shift: ShiftWithBookings
  map: Record<string, Profile>
  userId: string | undefined
  onClick: () => void
  avatarSize?: number
  dense?: boolean
}) {
  const booked = shift.bookings.map((id) => map[id]).filter(Boolean) as Profile[]
  const mine = !!userId && shift.bookings.includes(userId)
  const time = `${formatTime(shift.starts_at)}–${formatTime(shift.ends_at)}`
  const free = shift.capacity - shift.bookings.length
  const shown = booked.slice(0, 4)
  const extra = booked.length - shown.length
  const names = booked.map((p) => p.name || p.email).join(', ') || 'Inga bokade'
  const overlap = Math.round(avatarSize * 0.32)
  const guard = shift.uses_guard_car

  return (
    <button
      onClick={onClick}
      title={`${time} · ${names}${guard ? ' · Vaktbilen' : ''}`}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors',
        guard ? 'bg-red-50 hover:bg-red-100' : mine ? 'bg-brand-50' : 'bg-white hover:bg-slate-50'
      )}
      style={mine && userId ? { borderColor: memberColor(map[userId]), borderWidth: 2 } : undefined}
    >
      <div className="flex shrink-0 items-center">
        {shown.length === 0 ? (
          <span
            className="flex items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-slate-300"
            style={{ width: avatarSize, height: avatarSize }}
          >
            +
          </span>
        ) : (
          shown.map((p, i) => (
            <span key={p.id} style={{ marginLeft: i === 0 ? 0 : -overlap, zIndex: shown.length - i }}>
              <Avatar config={p.avatar} size={avatarSize} ring={memberColor(p)} title={p.name || p.email || ''} />
            </span>
          ))
        )}
        {extra > 0 && (
          <span
            className="ml-1 inline-flex items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600"
            style={{ width: avatarSize * 0.7, height: avatarSize * 0.7 }}
          >
            +{extra}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn('truncate font-semibold text-slate-800', dense ? 'text-xs' : 'text-sm')}>{time}</div>
        <div className={cn('truncate', dense ? 'text-[11px]' : 'text-xs')}>
          {mine ? (
            <span className="font-medium text-brand-700">Mitt pass</span>
          ) : booked.length === 1 ? (
            <span className="text-slate-500">{booked[0].name || booked[0].email}</span>
          ) : booked.length === 0 ? (
            <span className="text-slate-400">Lediga platser</span>
          ) : (
            <span className="text-slate-500">{booked.length}/{shift.capacity} bokade</span>
          )}
        </div>
      </div>
      {free <= 0 && <span className="shrink-0 rounded bg-slate-100 px-1 text-[10px] font-medium text-slate-500">Fullt</span>}
    </button>
  )
}
