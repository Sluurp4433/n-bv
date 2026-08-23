import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { useProfiles } from '../lib/hooks'
import { fetchFeed } from '../lib/feed'
import { FeedCard } from '../components/FeedCard'
import { WeekView } from '../components/WeekView'
import { AnnouncementsBox } from '../components/AnnouncementsBox'
import { FuelGauge } from '../components/FuelGauge'
import { fromState } from '../components/BackLink'
import { Card, LoadingState } from '../components/ui'

const QUICK_LINKS = [
  { to: '/observation/ny', emoji: '➕', title: 'Ny observation' },
  { to: '/loggbok', emoji: '📖', title: 'Loggbok' },
  { to: '/sok', emoji: '🔎', title: 'Sök' },
  { to: '/fordon', emoji: '🚗', title: 'Fordon' },
]

export function Dashboard() {
  const { profile } = useAuth()
  const { map } = useProfiles()
  const loc = useLocation()

  const feed = useQuery({
    queryKey: ['dashboard_feed'],
    queryFn: () => fetchFeed({ perTableLimit: 5 }),
  })

  const recent = (feed.data ?? []).slice(0, 5)

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-brand-800">
          Välkommen{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}
        </h1>
      </div>

      {/* Driftinfo */}
      <AnnouncementsBox />

      {/* 1. Kalendern – körpass denna vecka (vaktbilen syns ljusröd) */}
      <div className="mb-6">
        <WeekView />
      </div>

      {/* 2. Senaste noteringar (loggbok + observationer i ett flöde) */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-800">Senaste noteringar</h2>
          <Link to="/loggbok" className="text-sm text-brand-600 hover:underline">Visa alla</Link>
        </div>
        {feed.isLoading ? (
          <LoadingState />
        ) : recent.length === 0 ? (
          <Card className="p-6 text-center text-sm text-slate-400">Inga inlägg eller observationer ännu.</Card>
        ) : (
          <div className="space-y-3">
            {recent.map((item) => (
              <FeedCard key={`${item.kind}-${item.id}`} item={item} map={map} linkState={fromState(loc, 'Tillbaka till startsidan')} />
            ))}
          </div>
        )}
      </div>

      {/* Snabblänkar */}
      <div className="mb-6 grid grid-cols-4 gap-2 sm:gap-3">
        {QUICK_LINKS.map((q) => (
          <Link key={q.to} to={q.to}>
            <Card className="flex flex-col items-center gap-1 p-3 text-center transition-shadow hover:shadow-md">
              <div className="text-2xl">{q.emoji}</div>
              <div className="text-xs font-medium text-slate-600">{q.title}</div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Tankmätare */}
      <FuelGauge />
    </div>
  )
}
