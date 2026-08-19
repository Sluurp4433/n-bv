import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { useProfiles, creatorName } from '../lib/hooks'
import { Badge, Card, LoadingState } from '../components/ui'
import { WeekView } from '../components/WeekView'
import { AnnouncementsBox } from '../components/AnnouncementsBox'
import { formatDateTime, formatRelative } from '../lib/format'
import { priorityLabel } from '../lib/constants'
import type { Observation, LogbookEntry } from '../types/database.types'

type Stats = {
  observations_7d: number
  logbook_7d: number
  observations_total: number
  vehicles_total: number
}

const QUICK_LINKS = [
  { to: '/observation/ny', emoji: '➕', title: 'Ny observation', desc: 'Registrera en händelse' },
  { to: '/loggbok', emoji: '📖', title: 'Loggbok', desc: 'Läs och skriv inlägg' },
  { to: '/sok', emoji: '🔎', title: 'Sök', desc: 'Sök i databasen' },
  { to: '/fordon', emoji: '🚗', title: 'Fordon', desc: 'Registrerade fordon' },
]

export function Dashboard() {
  const { profile } = useAuth()
  const { map } = useProfiles()

  const statsQuery = useQuery({
    queryKey: ['dashboard_stats'],
    queryFn: async (): Promise<Stats> => {
      const { data, error } = await supabase.rpc('dashboard_stats')
      if (error) throw error
      return data as unknown as Stats
    },
  })

  const recentObs = useQuery({
    queryKey: ['recent_observations'],
    queryFn: async (): Promise<Observation[]> => {
      const { data, error } = await supabase
        .from('observations')
        .select('*')
        .order('observed_at', { ascending: false })
        .limit(5)
      if (error) throw error
      return data ?? []
    },
  })

  const recentLog = useQuery({
    queryKey: ['recent_logbook'],
    queryFn: async (): Promise<LogbookEntry[]> => {
      const { data, error } = await supabase
        .from('logbook_entries')
        .select('*')
        .order('entry_at', { ascending: false })
        .limit(5)
      if (error) throw error
      return data ?? []
    },
  })

  const stats = statsQuery.data

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-800">
          Välkommen{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-1 text-sm text-slate-500">Här är en översikt över föreningens aktivitet.</p>
      </div>

      {/* Driftinfo / aktuell info */}
      <AnnouncementsBox />

      {/* Veckovy för körpass */}
      <div className="mb-6">
        <WeekView />
      </div>

      {/* Snabblänkar */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {QUICK_LINKS.map((q) => (
          <Link key={q.to} to={q.to}>
            <Card className="h-full p-5 transition-shadow hover:shadow-md">
              <div className="text-3xl">{q.emoji}</div>
              <div className="mt-3 font-semibold text-brand-800">{q.title}</div>
              <div className="text-sm text-slate-500">{q.desc}</div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Statistik */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Observationer (7 dagar)" value={stats?.observations_7d} loading={statsQuery.isLoading} />
        <StatCard label="Nya logginlägg (7 dagar)" value={stats?.logbook_7d} loading={statsQuery.isLoading} />
        <StatCard label="Observationer totalt" value={stats?.observations_total} loading={statsQuery.isLoading} />
        <StatCard label="Fordon i databasen" value={stats?.vehicles_total} loading={statsQuery.isLoading} />
      </div>

      {/* Senaste */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-brand-800">Senaste observationer</h2>
            <Link to="/observationer" className="text-sm text-brand-600 hover:underline">
              Visa alla
            </Link>
          </div>
          {recentObs.isLoading ? (
            <LoadingState />
          ) : (recentObs.data?.length ?? 0) === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Inga observationer ännu.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentObs.data!.map((o) => (
                <li key={o.id}>
                  <Link to={`/observation/${o.id}`} className="block py-3 hover:bg-slate-50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-800">
                        {o.type || o.category || 'Observation'}
                      </span>
                      <PriorityBadge priority={o.priority} />
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {formatDateTime(o.observed_at)}
                      {o.location ? ` · ${o.location}` : ''} · {creatorName(map, o.created_by)}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-brand-800">Senaste aktivitet i loggboken</h2>
            <Link to="/loggbok" className="text-sm text-brand-600 hover:underline">
              Visa alla
            </Link>
          </div>
          {recentLog.isLoading ? (
            <LoadingState />
          ) : (recentLog.data?.length ?? 0) === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Inga logginlägg ännu.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentLog.data!.map((l) => (
                <li key={l.id}>
                  <Link to={`/loggbok/${l.id}`} className="block py-3 hover:bg-slate-50">
                    <div className="font-medium text-slate-800">{l.title}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {formatRelative(l.entry_at)} · {creatorName(map, l.created_by)}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

function StatCard({ label, value, loading }: { label: string; value?: number; loading: boolean }) {
  return (
    <Card className="p-5">
      <div className="text-3xl font-bold text-brand-700">{loading ? '…' : (value ?? 0)}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </Card>
  )
}

function PriorityBadge({ priority }: { priority: string | null }) {
  const color = priority === 'hog' ? 'red' : priority === 'lag' ? 'slate' : 'blue'
  return <Badge color={color}>{priorityLabel(priority)}</Badge>
}
