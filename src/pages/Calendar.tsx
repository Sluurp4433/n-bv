import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { sv } from 'date-fns/locale'
import { useAuth } from '../auth/AuthProvider'
import { useProfiles } from '../lib/hooks'
import { useShiftsInRange, type ShiftWithBookings } from '../lib/shifts'
import { memberColor } from '../lib/memberColor'
import { Avatar } from '../components/Avatar'
import { ShiftForm } from '../components/ShiftForm'
import { Button, Card, LoadingState, Select, cn } from '../components/ui'
import { formatTime } from '../lib/format'
import type { Profile } from '../types/database.types'

const WEEKDAYS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']

export function Calendar() {
  const { user } = useAuth()
  const { profiles, map } = useProfiles()
  const navigate = useNavigate()

  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()))
  const [createOpen, setCreateOpen] = useState(false)
  const [createDay, setCreateDay] = useState<Date | undefined>(undefined)
  const [memberFilter, setMemberFilter] = useState('')
  const [onlyMine, setOnlyMine] = useState(false)

  const gridStart = startOfWeek(startOfMonth(monthCursor), { weekStartsOn: 1 })
  const gridEnd = endOfWeek(endOfMonth(monthCursor), { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const shiftsQuery = useShiftsInRange(gridStart.toISOString(), addDays(gridEnd, 1).toISOString())

  const effectiveFilter = onlyMine ? user?.id ?? null : memberFilter || null

  const byDay = useMemo(() => {
    const m = new Map<string, ShiftWithBookings[]>()
    for (const s of shiftsQuery.data ?? []) {
      if (effectiveFilter && !s.bookings.includes(effectiveFilter)) continue
      const key = format(new Date(s.starts_at), 'yyyy-MM-dd')
      const arr = m.get(key) ?? []
      arr.push(s)
      m.set(key, arr)
    }
    return m
  }, [shiftsQuery.data, effectiveFilter])

  const monthTitle = format(monthCursor, 'LLLL yyyy', { locale: sv })

  function openCreate(day?: Date) {
    setCreateDay(day)
    setCreateOpen(true)
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Kalender</h1>
          <p className="mt-1 text-sm text-slate-500">Körpass – skapa egna pass och boka in dig.</p>
        </div>
        <Button size="lg" onClick={() => openCreate()}>
          + Nytt pass
        </Button>
      </div>

      {/* Kontroller */}
      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <Button variant="secondary" onClick={() => setMonthCursor(addMonths(monthCursor, -1))} aria-label="Föregående månad">
              ‹
            </Button>
            <span className="min-w-[9rem] text-center font-semibold capitalize text-brand-800">{monthTitle}</span>
            <Button variant="secondary" onClick={() => setMonthCursor(addMonths(monthCursor, 1))} aria-label="Nästa månad">
              ›
            </Button>
            <Button variant="ghost" onClick={() => setMonthCursor(startOfMonth(new Date()))}>
              Idag
            </Button>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Select
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
              disabled={onlyMine}
              className="w-48"
              aria-label="Filtrera på medlem"
            >
              <option value="">Alla medlemmar</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.email}
                </option>
              ))}
            </Select>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" className="h-4 w-4" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
              Endast mina pass
            </label>
          </div>
        </div>
      </Card>

      {shiftsQuery.isLoading ? (
        <LoadingState />
      ) : (
        <>
          {/* Månadsvy (desktop) */}
          <Card className="hidden overflow-hidden md:block">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-medium uppercase text-slate-500">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const key = format(day, 'yyyy-MM-dd')
                const dayShifts = byDay.get(key) ?? []
                const inMonth = isSameMonth(day, monthCursor)
                const isToday = isSameDay(day, new Date())
                return (
                  <div
                    key={key}
                    className={cn(
                      'min-h-[104px] border-b border-r border-slate-100 p-1.5 align-top',
                      !inMonth && 'bg-slate-50/60'
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span
                        className={cn(
                          'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                          isToday ? 'bg-brand-700 font-semibold text-white' : 'text-slate-500',
                          !inMonth && 'text-slate-300'
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                      <button
                        onClick={() => openCreate(day)}
                        className="text-slate-300 hover:text-brand-600"
                        aria-label="Lägg till pass"
                      >
                        +
                      </button>
                    </div>
                    <div className="space-y-1">
                      {dayShifts.map((s) => (
                        <ShiftChip key={s.id} shift={s} map={map} userId={user?.id} onClick={() => navigate(`/kalender/pass/${s.id}`)} compact />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Agenda (mobil) */}
          <div className="space-y-4 md:hidden">
            {days.filter((d) => isSameMonth(d, monthCursor) && (byDay.get(format(d, 'yyyy-MM-dd'))?.length ?? 0) > 0).length === 0 ? (
              <Card className="p-6 text-center text-sm text-slate-400">Inga pass den här månaden.</Card>
            ) : (
              days
                .filter((d) => isSameMonth(d, monthCursor) && (byDay.get(format(d, 'yyyy-MM-dd'))?.length ?? 0) > 0)
                .map((day) => {
                  const key = format(day, 'yyyy-MM-dd')
                  return (
                    <div key={key}>
                      <h3 className="mb-2 text-sm font-semibold capitalize text-slate-600">
                        {format(day, 'EEEE d MMMM', { locale: sv })}
                      </h3>
                      <div className="space-y-2">
                        {(byDay.get(key) ?? []).map((s) => (
                          <ShiftChip key={s.id} shift={s} map={map} userId={user?.id} onClick={() => navigate(`/kalender/pass/${s.id}`)} />
                        ))}
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        </>
      )}

      <ShiftForm
        open={createOpen}
        day={createDay}
        onClose={() => setCreateOpen(false)}
        onCreated={() => setCreateOpen(false)}
      />
    </div>
  )
}

function ShiftChip({
  shift,
  map,
  userId,
  onClick,
  compact,
}: {
  shift: ShiftWithBookings
  map: Record<string, Profile>
  userId: string | undefined
  onClick: () => void
  compact?: boolean
}) {
  const booked = shift.bookings.map((id) => map[id]).filter(Boolean) as Profile[]
  const mine = !!userId && shift.bookings.includes(userId)
  const time = `${formatTime(shift.starts_at)}–${formatTime(shift.ends_at)}`
  const free = shift.capacity - shift.bookings.length
  const shown = booked.slice(0, 3)
  const extra = booked.length - shown.length
  const names = booked.map((p) => p.name || p.email).join(', ') || 'Inga bokade'
  const avatarSize = compact ? 20 : 28

  return (
    <button
      onClick={onClick}
      title={`${time} · ${names}`}
      className={cn(
        'flex w-full items-center gap-1.5 rounded-md border px-1.5 py-1 text-left transition-colors',
        mine ? 'bg-brand-50' : 'bg-white hover:bg-slate-50'
      )}
      style={mine && userId ? { borderColor: memberColor(map[userId]), borderWidth: 2 } : undefined}
    >
      <div className="flex shrink-0 items-center">
        {shown.length === 0 ? (
          <span className="text-slate-300">○</span>
        ) : (
          shown.map((p, i) => (
            <span key={p.id} style={{ marginLeft: i === 0 ? 0 : -6 }}>
              <Avatar config={p.avatar} size={avatarSize} ring={memberColor(p)} title={p.name || p.email || ''} />
            </span>
          ))
        )}
        {extra > 0 && <span className="ml-0.5 text-xs font-medium text-slate-500">+{extra}</span>}
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn('truncate font-medium text-slate-700', compact ? 'text-[11px]' : 'text-sm')}>
          {time}
        </div>
        {!compact && (
          <div className="truncate text-xs text-slate-500">
            {mine ? 'Mitt pass' : booked.length === 1 ? booked[0].name || booked[0].email : `${booked.length}/${shift.capacity} bokade`}
          </div>
        )}
        {compact && mine && <div className="truncate text-[10px] font-medium text-brand-700">Mitt pass</div>}
        {compact && !mine && booked.length === 1 && (
          <div className="truncate text-[10px] text-slate-500">{booked[0].name || booked[0].email}</div>
        )}
      </div>
      {free <= 0 && <span className="shrink-0 text-[10px] font-medium text-slate-400">Fullt</span>}
    </button>
  )
}
