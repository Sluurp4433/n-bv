import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, startOfMonth, startOfWeek, startOfYear, subMonths, subWeeks } from 'date-fns'
import { sv } from 'date-fns/locale'
import { supabase } from '../lib/supabase'
import { Card, LoadingState, PageHeader } from '../components/ui'
import type { SearchLeaderboardRow } from '../types/database.types'

type ShiftRow = { starts_at: string; ends_at: string; uses_guard_car: boolean }
type PostRow = { at: string }

const MIN_SHIFT_HOURS = 2

function useSearchLeaderboard() {
  return useQuery({
    queryKey: ['search_leaderboard'],
    queryFn: async (): Promise<SearchLeaderboardRow[]> => {
      const { data, error } = await supabase.rpc('search_leaderboard', { limit_n: 8 })
      if (error) throw error
      return data ?? []
    },
  })
}

/**
 * Slår ihop levande pass (kommande + ännu ej inlåsta) med den permanenta
 * historiken (public.shift_history) — pass vars sluttid passerat låses in där
 * automatiskt och kan inte försvinna ur statistiken även om själva passet
 * raderas i efterhand. Om ett pass finns i båda källorna vinner den levande
 * versionen (t.ex. om det redigerats efter att det låstes in).
 */
function useShifts() {
  return useQuery({
    queryKey: ['stats_shifts'],
    queryFn: async (): Promise<ShiftRow[]> => {
      const [live, history] = await Promise.all([
        supabase.from('shifts').select('id, starts_at, ends_at, uses_guard_car'),
        supabase.from('shift_history').select('shift_id, starts_at, ends_at, uses_guard_car'),
      ])
      if (live.error) throw live.error
      if (history.error) throw history.error
      const byId = new Map<string, ShiftRow>()
      for (const h of history.data ?? []) {
        byId.set(h.shift_id, { starts_at: h.starts_at, ends_at: h.ends_at, uses_guard_car: h.uses_guard_car })
      }
      for (const s of live.data ?? []) {
        byId.set(s.id, { starts_at: s.starts_at, ends_at: s.ends_at, uses_guard_car: s.uses_guard_car })
      }
      return Array.from(byId.values())
    },
  })
}

/** Ett bokat pass räknas i statistiken oavsett hur många som är bokade på det —
 * kravet är bara att passet är minst MIN_SHIFT_HOURS långt. */
function qualifyingShifts(shifts: ShiftRow[]) {
  return shifts.filter((s) => {
    const hours = (new Date(s.ends_at).getTime() - new Date(s.starts_at).getTime()) / 3_600_000
    return hours >= MIN_SHIFT_HOURS
  })
}

function usePosts() {
  return useQuery({
    queryKey: ['stats_posts'],
    queryFn: async (): Promise<PostRow[]> => {
      const [obs, log] = await Promise.all([
        supabase.from('observations').select('observed_at'),
        supabase.from('logbook_entries').select('entry_at'),
      ])
      if (obs.error) throw obs.error
      if (log.error) throw log.error
      return [
        ...(obs.data ?? []).map((o) => ({ at: o.observed_at })),
        ...(log.data ?? []).map((l) => ({ at: l.entry_at })),
      ]
    },
  })
}

/** Genererar de senaste N bucket-nycklarna (äldst först) enligt startOf-funktionen. */
function recentBuckets(n: number, startOf: (d: Date) => Date, sub: (d: Date, n: number) => Date, keyFmt: string) {
  const now = new Date()
  const keys: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    keys.push(format(startOf(sub(now, i)), keyFmt, { locale: sv }))
  }
  return keys
}

function bucketKeyMonth(d: Date) {
  return format(startOfMonth(d), 'yyyy-MM')
}
function bucketKeyWeek(d: Date) {
  return format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd')
}
function bucketKeyYear(d: Date) {
  return format(startOfYear(d), 'yyyy')
}

export function Stats() {
  const leaderboard = useSearchLeaderboard()
  const shifts = useShifts()
  const posts = usePosts()

  const searchByCategory = useMemo(() => {
    const rows = leaderboard.data ?? []
    return {
      person: rows.filter((r) => r.category === 'person'),
      fordon: rows.filter((r) => r.category === 'fordon'),
      omrade: rows.filter((r) => r.category === 'omrade'),
    }
  }, [leaderboard.data])

  const shiftMonthly = useMemo(() => {
    const keys = recentBuckets(12, startOfMonth, subMonths, 'yyyy-MM')
    const map = new Map<string, { guard: number; own: number }>(keys.map((k) => [k, { guard: 0, own: 0 }]))
    for (const s of qualifyingShifts(shifts.data ?? [])) {
      const key = bucketKeyMonth(new Date(s.starts_at))
      const bucket = map.get(key)
      if (!bucket) continue
      if (s.uses_guard_car) bucket.guard++
      else bucket.own++
    }
    return keys.map((k) => ({ key: k, ...map.get(k)! }))
  }, [shifts.data])

  const shiftYearly = useMemo(() => {
    const map = new Map<string, { guard: number; own: number }>()
    for (const s of qualifyingShifts(shifts.data ?? [])) {
      const key = bucketKeyYear(new Date(s.starts_at))
      const bucket = map.get(key) ?? { guard: 0, own: 0 }
      if (s.uses_guard_car) bucket.guard++
      else bucket.own++
      map.set(key, bucket)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, v]) => ({ key, ...v }))
  }, [shifts.data])

  const postsWeekly = useMemo(() => {
    const keys = recentBuckets(8, (d) => startOfWeek(d, { weekStartsOn: 1 }), subWeeks, 'yyyy-MM-dd')
    const map = new Map<string, number>(keys.map((k) => [k, 0]))
    for (const p of posts.data ?? []) {
      const key = bucketKeyWeek(new Date(p.at))
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1)
    }
    return keys.map((k) => ({ key: k, count: map.get(k) ?? 0 }))
  }, [posts.data])

  const postsMonthly = useMemo(() => {
    const keys = recentBuckets(12, startOfMonth, subMonths, 'yyyy-MM')
    const map = new Map<string, number>(keys.map((k) => [k, 0]))
    for (const p of posts.data ?? []) {
      const key = bucketKeyMonth(new Date(p.at))
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1)
    }
    return keys.map((k) => ({ key: k, count: map.get(k) ?? 0 }))
  }, [posts.data])

  const postsYearly = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of posts.data ?? []) {
      const key = bucketKeyYear(new Date(p.at))
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, count]) => ({ key, count }))
  }, [posts.data])

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Körpass" description="Statistik över körpass, inlägg och sökningar." />

      {/* Mest sökta */}
      <div className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-brand-800">Mest sökta</h2>
        {leaderboard.isLoading ? (
          <LoadingState />
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <LeaderboardCard title="Personer" rows={searchByCategory.person} />
            <LeaderboardCard title="Fordon (regnr)" rows={searchByCategory.fordon} />
            <LeaderboardCard title="Områden" rows={searchByCategory.omrade} />
          </div>
        )}
      </div>

      {/* Körpass */}
      <div className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-brand-800">Körpass</h2>
        <p className="mb-3 text-sm text-slate-500">
          Räknar antal bokade pass (inte antal bokade personer) — pass under {MIN_SHIFT_HOURS} timmar räknas inte.
        </p>
        {shifts.isLoading ? (
          <LoadingState />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <ShiftTable title="Senaste 12 månaderna" rows={shiftMonthly} formatKey={(k) => format(new Date(k + '-01'), 'MMM yyyy', { locale: sv })} />
            <ShiftTable title="Per år" rows={shiftYearly} formatKey={(k) => k} />
          </div>
        )}
      </div>

      {/* Inlägg */}
      <div className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-brand-800">Inlägg (observationer + loggbok)</h2>
        {posts.isLoading ? (
          <LoadingState />
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <PostTable title="Senaste 8 veckorna" rows={postsWeekly} formatKey={(k) => format(new Date(k), 'd MMM', { locale: sv })} />
            <PostTable title="Senaste 12 månaderna" rows={postsMonthly} formatKey={(k) => format(new Date(k + '-01'), 'MMM yyyy', { locale: sv })} />
            <PostTable title="Per år" rows={postsYearly} formatKey={(k) => k} />
          </div>
        )}
      </div>
    </div>
  )
}

function LeaderboardCard({ title, rows }: { title: string; rows: SearchLeaderboardRow[] }) {
  return (
    <Card className="p-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">Inga sökningar ännu.</p>
      ) : (
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="py-1.5 text-slate-700">{r.label}</td>
                <td className="py-1.5 text-right font-medium text-brand-700">{r.hits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}

function ShiftTable({
  title,
  rows,
  formatKey,
}: {
  title: string
  rows: { key: string; guard: number; own: number }[]
  formatKey: (key: string) => string
}) {
  return (
    <Card className="p-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">Inga körpass ännu.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr>
              <th className="py-1 text-left">Period</th>
              <th className="py-1 text-right">Vaktbil</th>
              <th className="py-1 text-right">Egen bil</th>
              <th className="py-1 text-right">Totalt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="py-1.5 capitalize text-slate-700">{formatKey(r.key)}</td>
                <td className="py-1.5 text-right">{r.guard}</td>
                <td className="py-1.5 text-right">{r.own}</td>
                <td className="py-1.5 text-right font-medium text-brand-700">{r.guard + r.own}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}

function PostTable({
  title,
  rows,
  formatKey,
}: {
  title: string
  rows: { key: string; count: number }[]
  formatKey: (key: string) => string
}) {
  return (
    <Card className="p-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">Inga inlägg ännu.</p>
      ) : (
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="py-1.5 capitalize text-slate-700">{formatKey(r.key)}</td>
                <td className="py-1.5 text-right font-medium text-brand-700">{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}
