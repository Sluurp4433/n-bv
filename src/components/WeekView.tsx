import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { addDays, addWeeks, eachDayOfInterval, endOfWeek, format, isSameDay, startOfWeek } from 'date-fns'
import { sv } from 'date-fns/locale'
import { useAuth } from '../auth/AuthProvider'
import { useProfiles } from '../lib/hooks'
import { useShiftsInRange, type ShiftWithBookings } from '../lib/shifts'
import { ShiftForm } from './ShiftForm'
import { ShiftChip } from './ShiftChip'
import { Button, Card, cn } from './ui'

export function WeekView() {
  const { user } = useAuth()
  const { map } = useProfiles()
  const navigate = useNavigate()

  const [weekCursor, setWeekCursor] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [createOpen, setCreateOpen] = useState(false)
  const [createDay, setCreateDay] = useState<Date | undefined>(undefined)

  const weekEnd = endOfWeek(weekCursor, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekCursor, end: weekEnd })
  const q = useShiftsInRange(weekCursor.toISOString(), addDays(weekEnd, 1).toISOString())

  const byDay = useMemo(() => {
    const m = new Map<string, ShiftWithBookings[]>()
    for (const s of q.data ?? []) {
      const key = format(new Date(s.starts_at), 'yyyy-MM-dd')
      const arr = m.get(key) ?? []
      arr.push(s)
      m.set(key, arr)
    }
    return m
  }, [q.data])

  const title = `${format(weekCursor, 'd MMM', { locale: sv })}–${format(weekEnd, 'd MMM', { locale: sv })}`

  function openCreate(day: Date) {
    setCreateDay(day)
    setCreateOpen(true)
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-brand-800">Körpass denna vecka</h2>
          <span className="text-sm text-slate-400">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="secondary" onClick={() => setWeekCursor(addWeeks(weekCursor, -1))} aria-label="Föregående vecka">‹</Button>
          <Button variant="ghost" onClick={() => setWeekCursor(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Idag</Button>
          <Button variant="secondary" onClick={() => setWeekCursor(addWeeks(weekCursor, 1))} aria-label="Nästa vecka">›</Button>
          <Link to="/kalender" className="ml-2 text-sm text-brand-600 hover:underline">Hela kalendern →</Link>
        </div>
      </div>

      {/* Desktop: 7 kolumner */}
      <div className="hidden grid-cols-7 gap-2 lg:grid">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayShifts = byDay.get(key) ?? []
          const isToday = isSameDay(day, new Date())
          return (
            <div key={key} className="min-h-[120px] rounded-lg border border-slate-100 p-1.5">
              <div className="mb-1 flex items-center justify-between">
                <span className={cn('text-xs font-medium capitalize', isToday ? 'text-brand-700' : 'text-slate-500')}>
                  {format(day, 'EEE d', { locale: sv })}
                </span>
                <button onClick={() => openCreate(day)} className="text-slate-300 hover:text-brand-600" aria-label="Lägg till pass">+</button>
              </div>
              <div className="space-y-1">
                {dayShifts.map((s) => (
                  <ShiftChip key={s.id} shift={s} map={map} userId={user?.id} avatarSize={28} dense onClick={() => navigate(`/kalender/pass/${s.id}`)} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobil/surfplatta: lista per dag */}
      <div className="space-y-3 lg:hidden">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayShifts = byDay.get(key) ?? []
          const isToday = isSameDay(day, new Date())
          return (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between">
                <span className={cn('text-sm font-semibold capitalize', isToday ? 'text-brand-700' : 'text-slate-600')}>
                  {format(day, 'EEEE d MMMM', { locale: sv })}
                </span>
                <button onClick={() => openCreate(day)} className="text-sm text-brand-600">+ pass</button>
              </div>
              {dayShifts.length === 0 ? (
                <p className="pl-1 text-xs text-slate-300">Inga pass</p>
              ) : (
                <div className="space-y-2">
                  {dayShifts.map((s) => (
                    <ShiftChip key={s.id} shift={s} map={map} userId={user?.id} avatarSize={40} onClick={() => navigate(`/kalender/pass/${s.id}`)} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <ShiftForm open={createOpen} day={createDay} onClose={() => setCreateOpen(false)} onCreated={() => setCreateOpen(false)} />
    </Card>
  )
}
