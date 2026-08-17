import { useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useProfiles, creatorName } from '../lib/hooks'
import { LOGBOOK_CATEGORIES } from '../lib/constants'
import { Badge, Button, Card, EmptyState, Field, Input, LoadingState, Select } from '../components/ui'
import { formatDateTime } from '../lib/format'
import type { LogbookEntry } from '../types/database.types'

const PAGE_SIZE = 20

const DATE_FILTERS = [
  { value: 'all', label: 'Alla datum' },
  { value: '1', label: 'Senaste 24 timmarna' },
  { value: '7', label: 'Senaste 7 dagarna' },
  { value: '30', label: 'Senaste 30 dagarna' },
]

export function Logbook() {
  const { map } = useProfiles()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [dateFilter, setDateFilter] = useState('all')
  const [page, setPage] = useState(0)

  const result = useQuery({
    queryKey: ['logbook', query, category, dateFilter, page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let q = supabase
        .from('logbook_entries')
        .select('*', { count: 'exact' })
        .order('entry_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

      if (query.trim()) {
        q = q.textSearch('search', query.trim(), { type: 'websearch', config: 'swedish' })
      }
      if (category) q = q.eq('category', category)
      if (dateFilter !== 'all') {
        const since = new Date(Date.now() - Number(dateFilter) * 86400000).toISOString()
        q = q.gte('entry_at', since)
      }

      const { data, error, count } = await q
      if (error) throw error
      return { rows: (data ?? []) as LogbookEntry[], count: count ?? 0 }
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
          <h1 className="text-2xl font-bold text-brand-800">Loggbok</h1>
          <p className="mt-1 text-sm text-slate-500">Föreningens interna logg över händelser.</p>
        </div>
        <Link to="/loggbok/ny">
          <Button size="lg">+ Nytt inlägg</Button>
        </Link>
      </div>

      <Card className="mb-4 p-4">
        <form onSubmit={applySearch} className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field label="Sök i loggboken" htmlFor="log-search">
            <Input
              id="log-search"
              placeholder="Sök på rubrik, plats, regnr eller fritext…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="w-full sm:w-auto">
              Sök
            </Button>
          </div>
        </form>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Kategori" htmlFor="log-cat">
            <Select
              id="log-cat"
              value={category}
              onChange={(e) => {
                setPage(0)
                setCategory(e.target.value)
              }}
            >
              <option value="">Alla kategorier</option>
              {LOGBOOK_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tidsperiod" htmlFor="log-date">
            <Select
              id="log-date"
              value={dateFilter}
              onChange={(e) => {
                setPage(0)
                setDateFilter(e.target.value)
              }}
            >
              {DATE_FILTERS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      {result.isLoading ? (
        <LoadingState />
      ) : result.isError ? (
        <EmptyState title="Kunde inte hämta loggboken" description="Försök igen om en stund." />
      ) : total === 0 ? (
        <EmptyState
          title="Inga inlägg hittades"
          description={query ? 'Inga träffar på din sökning.' : 'Skapa det första inlägget i loggboken.'}
          action={
            <Link to="/loggbok/ny">
              <Button>+ Nytt inlägg</Button>
            </Link>
          }
        />
      ) : (
        <>
          <p className="mb-2 text-sm text-slate-500">
            {query ? `${total} träff${total === 1 ? '' : 'ar'} hittades.` : `${total} inlägg`}
          </p>
          <div className="space-y-2">
            {result.data!.rows.map((l) => (
              <Link key={l.id} to={`/loggbok/${l.id}`}>
                <Card className="p-4 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold text-slate-800">{l.title}</h3>
                        {l.category && <Badge>{l.category}</Badge>}
                      </div>
                      {l.content && (
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{l.content}</p>
                      )}
                      <div className="mt-2 text-xs text-slate-500">
                        {formatDateTime(l.entry_at)}
                        {l.location ? ` · ${l.location}` : ''} · {creatorName(map, l.created_by)}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {pages > 1 && (
            <Pagination page={page} pages={pages} onChange={setPage} loading={result.isFetching} />
          )}
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
      <Button variant="secondary" disabled={page === 0 || loading} onClick={() => onChange(page - 1)}>
        Föregående
      </Button>
      <span className="text-sm text-slate-500">
        Sida {page + 1} av {pages}
      </span>
      <Button
        variant="secondary"
        disabled={page >= pages - 1 || loading}
        onClick={() => onChange(page + 1)}
      >
        Nästa
      </Button>
    </div>
  )
}
