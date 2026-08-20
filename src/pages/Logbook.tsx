import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useProfiles } from '../lib/hooks'
import { fetchFeed } from '../lib/feed'
import { Button, Card, EmptyState, Field, Input, LoadingState, Select } from '../components/ui'
import { FeedCard } from '../components/FeedCard'

const PAGE_SIZE = 15

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

export function Logbook() {
  const { map } = useProfiles()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'alla' | 'log' | 'obs'>('alla')
  const [dateFilter, setDateFilter] = useState('all')
  const [page, setPage] = useState(0)

  const sinceISO = dateFilter !== 'all' ? new Date(Date.now() - Number(dateFilter) * 86400000).toISOString() : null

  const result = useQuery({
    queryKey: ['feed', query, typeFilter, dateFilter],
    placeholderData: keepPreviousData,
    queryFn: () => fetchFeed({ query, type: typeFilter, sinceISO }),
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
    <div className="mx-auto max-w-2xl">
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
            <Select id="feed-type" value={typeFilter} onChange={(e) => { setPage(0); setTypeFilter(e.target.value as 'alla' | 'log' | 'obs') }}>
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
          {query && <p className="mb-2 text-sm text-slate-500">{total} träff{total === 1 ? '' : 'ar'} hittades.</p>}
          <div className="space-y-3">
            {shown.map((item) => (
              <FeedCard key={`${item.kind}-${item.id}`} item={item} map={map} />
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
