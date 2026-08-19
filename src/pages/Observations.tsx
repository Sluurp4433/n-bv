import { useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useProfiles, creatorName } from '../lib/hooks'
import { OBSERVATION_CATEGORIES, priorityLabel } from '../lib/constants'
import { Badge, Button, Card, EmptyState, Field, Input, LoadingState, Select } from '../components/ui'
import { formatDateTime } from '../lib/format'
import { Pagination } from './Logbook'
import type { Observation } from '../types/database.types'

const PAGE_SIZE = 20
const DATE_FILTERS = [
  { value: 'all', label: 'Alla datum' },
  { value: '1', label: 'Senaste 24 timmarna' },
  { value: '7', label: 'Senaste 7 dagarna' },
  { value: '30', label: 'Senaste 30 dagarna' },
]

export function Observations() {
  const { map } = useProfiles()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [dateFilter, setDateFilter] = useState('all')
  const [page, setPage] = useState(0)

  const result = useQuery({
    queryKey: ['observations', query, category, dateFilter, page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let q = supabase
        .from('observations')
        .select('*', { count: 'exact' })
        .order('observed_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
      if (query.trim()) q = q.textSearch('search', query.trim(), { type: 'websearch', config: 'swedish' })
      if (category) q = q.eq('category', category)
      if (dateFilter !== 'all') {
        const since = new Date(Date.now() - Number(dateFilter) * 86400000).toISOString()
        q = q.gte('observed_at', since)
      }
      const { data, error, count } = await q
      if (error) throw error
      return { rows: (data ?? []) as Observation[], count: count ?? 0 }
    },
  })

  function applySearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(0)
    setQuery(search)
  }

  const total = result.data?.count ?? 0
  const pages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Observationer</h1>
          <p className="mt-1 text-sm text-slate-500">Alla registrerade observationer.</p>
        </div>
        <Link to="/observation/ny"><Button size="lg">+ Ny observation</Button></Link>
      </div>

      <Card className="mb-4 p-4">
        <form onSubmit={applySearch} className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field label="Sök i observationer" htmlFor="obs-search">
            <Input id="obs-search" placeholder="Sök på plats, regnr, fritext…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </Field>
          <div className="flex items-end"><Button type="submit" className="w-full sm:w-auto">Sök</Button></div>
        </form>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Kategori" htmlFor="obs-cat">
            <Select id="obs-cat" value={category} onChange={(e) => { setPage(0); setCategory(e.target.value) }}>
              <option value="">Alla kategorier</option>
              {OBSERVATION_CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
            </Select>
          </Field>
          <Field label="Tidsperiod" htmlFor="obs-date">
            <Select id="obs-date" value={dateFilter} onChange={(e) => { setPage(0); setDateFilter(e.target.value) }}>
              {DATE_FILTERS.map((d) => (<option key={d.value} value={d.value}>{d.label}</option>))}
            </Select>
          </Field>
        </div>
      </Card>

      {result.isLoading ? (
        <LoadingState />
      ) : total === 0 ? (
        <EmptyState title="Inga observationer hittades" description={query ? 'Inga träffar på din sökning.' : 'Registrera den första observationen.'} action={<Link to="/observation/ny"><Button>+ Ny observation</Button></Link>} />
      ) : (
        <>
          <p className="mb-2 text-sm text-slate-500">{query ? `${total} träff${total === 1 ? '' : 'ar'} hittades.` : `${total} observationer`}</p>
          <div className="space-y-2">
            {result.data!.rows.map((o) => (
              <Link key={o.id} to={`/observation/${o.id}`}>
                <Card className="p-4 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold text-slate-800">{o.type || o.category || 'Observation'}</h3>
                        <Badge color={o.priority === 'hog' ? 'red' : o.priority === 'lag' ? 'slate' : 'blue'}>{priorityLabel(o.priority)}</Badge>
                        {o.category && <Badge>{o.category}</Badge>}
                      </div>
                      {o.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{o.description}</p>}
                      <div className="mt-2 text-xs text-slate-500">
                        {formatDateTime(o.observed_at)}{o.location ? ` · ${o.location}` : ''} · {creatorName(map, o.created_by)}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
          {pages > 1 && <Pagination page={page} pages={pages} onChange={setPage} loading={result.isFetching} />}
        </>
      )}
    </div>
  )
}
