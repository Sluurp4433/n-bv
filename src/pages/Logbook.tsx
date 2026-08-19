import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useProfiles, creatorName } from '../lib/hooks'
import { Badge, Button, Card, EmptyState, Field, Input, LoadingState, Select } from '../components/ui'
import { formatDateTime } from '../lib/format'
import { priorityLabel } from '../lib/constants'

const PAGE_SIZE = 20
const FETCH_LIMIT = 150

const DATE_FILTERS = [
  { value: 'all', label: 'Alla datum' },
  { value: '1', label: 'Senaste 24 timmarna' },
  { value: '7', label: 'Senaste 7 dagarna' },
  { value: '30', label: 'Senaste 30 dagarna' },
]

const TYPE_FILTERS = [
  { value: 'alla', label: 'Allt' },
  { value: 'log', label: 'Loggbok' },
  { value: 'obs', label: 'Observationer' },
]

type FeedItem = {
  kind: 'log' | 'obs'
  id: string
  title: string
  snippet: string
  location: string | null
  date: string
  created_by: string | null
  priority?: string | null
}

export function Logbook() {
  const { map } = useProfiles()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('alla')
  const [dateFilter, setDateFilter] = useState('all')
  const [page, setPage] = useState(0)

  const sinceISO = dateFilter !== 'all' ? new Date(Date.now() - Number(dateFilter) * 86400000).toISOString() : null

  const result = useQuery({
    queryKey: ['feed', query, typeFilter, dateFilter],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<FeedItem[]> => {
      const items: FeedItem[] = []

      if (typeFilter !== 'obs') {
        let q = supabase.from('logbook_entries').select('id,title,content,entry_at,location,created_by').order('entry_at', { ascending: false }).limit(FETCH_LIMIT)
        if (query.trim()) q = q.textSearch('search', query.trim(), { type: 'websearch', config: 'swedish' })
        if (sinceISO) q = q.gte('entry_at', sinceISO)
        const { data, error } = await q
        if (error) throw error
        for (const l of data ?? []) {
          items.push({ kind: 'log', id: l.id, title: l.title, snippet: l.content ?? '', location: l.location, date: l.entry_at, created_by: l.created_by })
        }
      }

      if (typeFilter !== 'log') {
        let q = supabase.from('observations').select('id,type,category,description,observed_at,location,priority,created_by').order('observed_at', { ascending: false }).limit(FETCH_LIMIT)
        if (query.trim()) q = q.textSearch('search', query.trim(), { type: 'websearch', config: 'swedish' })
        if (sinceISO) q = q.gte('observed_at', sinceISO)
        const { data, error } = await q
        if (error) throw error
        for (const o of data ?? []) {
          items.push({ kind: 'obs', id: o.id, title: o.type || o.category || 'Observation', snippet: o.description ?? '', location: o.location, date: o.observed_at, created_by: o.created_by, priority: o.priority })
        }
      }

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      return items
    },
  })

  function applySearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(0)
    setQuery(search)
  }

  const all = result.data ?? []
  const total = all.length
  const pages = Math.ceil(total / PAGE_SIZE)
  const shown = useMemo(() => all.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE), [all, page])

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Loggbok</h1>
          <p className="mt-1 text-sm text-slate-500">Loggboksinlägg och observationer.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/loggbok/ny"><Button variant="secondary">+ Nytt inlägg</Button></Link>
          <Link to="/observation/ny"><Button>+ Ny observation</Button></Link>
        </div>
      </div>

      <Card className="mb-4 p-4">
        <form onSubmit={applySearch} className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field label="Sök" htmlFor="feed-search">
            <Input id="feed-search" placeholder="Sök på rubrik, plats, regnr eller fritext…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </Field>
          <div className="flex items-end"><Button type="submit" className="w-full sm:w-auto">Sök</Button></div>
        </form>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Visa" htmlFor="feed-type">
            <Select id="feed-type" value={typeFilter} onChange={(e) => { setPage(0); setTypeFilter(e.target.value) }}>
              {TYPE_FILTERS.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
            </Select>
          </Field>
          <Field label="Tidsperiod" htmlFor="feed-date">
            <Select id="feed-date" value={dateFilter} onChange={(e) => { setPage(0); setDateFilter(e.target.value) }}>
              {DATE_FILTERS.map((d) => (<option key={d.value} value={d.value}>{d.label}</option>))}
            </Select>
          </Field>
        </div>
      </Card>

      {result.isLoading ? (
        <LoadingState />
      ) : total === 0 ? (
        <EmptyState title="Inget hittades" description={query ? 'Inga träffar på din sökning.' : 'Skapa ett inlägg eller en observation.'} />
      ) : (
        <>
          <p className="mb-2 text-sm text-slate-500">{query ? `${total} träff${total === 1 ? '' : 'ar'} hittades.` : `${total} poster`}</p>
          <div className="space-y-2">
            {shown.map((item) => (
              <Link key={`${item.kind}-${item.id}`} to={item.kind === 'log' ? `/loggbok/${item.id}` : `/observation/${item.id}`}>
                <Card className="p-4 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.kind === 'log' ? <Badge color="slate">Loggbok</Badge> : <Badge color="blue">Observation</Badge>}
                        <h3 className="truncate font-semibold text-slate-800">{item.title}</h3>
                        {item.kind === 'obs' && item.priority === 'hog' && <Badge color="red">{priorityLabel(item.priority)}</Badge>}
                      </div>
                      {item.snippet && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{item.snippet}</p>}
                      <div className="mt-2 text-xs text-slate-500">
                        {formatDateTime(item.date)}{item.location ? ` · ${item.location}` : ''} · {creatorName(map, item.created_by)}
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

export function Pagination({
  page,
  pages,
  onChange,
  loading,
}: {
  page: number
  pages: number
  onChange: (p: number) => void
  loading?: boolean
}) {
  return (
    <div className="mt-4 flex items-center justify-center gap-3">
      <Button variant="secondary" disabled={page === 0 || loading} onClick={() => onChange(page - 1)}>Föregående</Button>
      <span className="text-sm text-slate-500">Sida {page + 1} av {pages}</span>
      <Button variant="secondary" disabled={page >= pages - 1 || loading} onClick={() => onChange(page + 1)}>Nästa</Button>
    </div>
  )
}
