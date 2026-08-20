import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { normalizeRegnr } from '../lib/format'
import { Badge, Button, Card, EmptyState, Field, Input, LoadingState } from '../components/ui'
import { formatDate } from '../lib/format'
import { Pagination } from './Logbook'
import { useUrlParam } from '../lib/useUrlState'
import { fromState } from '../components/BackLink'
import type { VehicleOverview } from '../types/database.types'

const PAGE_SIZE = 20

// Tar bort tecken som annars stör PostgREST .or()-filter
function sanitize(s: string): string {
  return s.replace(/[,()%*]/g, '').trim()
}

export function Vehicles() {
  const loc = useLocation()
  const [query, setQuery] = useUrlParam('q')
  const [pageStr, setPageStr] = useUrlParam('p', '0')
  const page = Number(pageStr) || 0
  const setPage = (n: number) => setPageStr(String(n))
  const [search, setSearch] = useState(query)

  const result = useQuery({
    queryKey: ['vehicles', query, page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let q = supabase
        .from('vehicle_overview')
        .select('*', { count: 'exact' })
        .order('last_observed', { ascending: false, nullsFirst: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

      const raw = sanitize(query)
      if (raw) {
        const norm = normalizeRegnr(query)
        const parts = [
          norm && `registration_normalized.ilike.%${norm}%`,
          `make.ilike.%${raw}%`,
          `model.ilike.%${raw}%`,
          `color.ilike.%${raw}%`,
        ].filter(Boolean) as string[]
        q = q.or(parts.join(','))
      }

      const { data, error, count } = await q
      if (error) throw error
      return { rows: (data ?? []) as VehicleOverview[], count: count ?? 0 }
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-800">Fordon</h1>
        <p className="mt-1 text-sm text-slate-500">
          Registrerade fordon i observationer. Sök på hela eller delar av ett registreringsnummer.
        </p>
      </div>

      <Card className="mb-4 p-4">
        <form onSubmit={applySearch} className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field label="Sök fordon" htmlFor="veh-search">
            <Input
              id="veh-search"
              placeholder="Regnr (t.ex. ABC), märke eller färg…"
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
      </Card>

      {result.isLoading ? (
        <LoadingState />
      ) : total === 0 ? (
        <EmptyState
          title="Inga fordon hittades"
          description={
            query
              ? 'Inga träffar. Prova en kortare del av registreringsnumret.'
              : 'Fordon läggs till automatiskt när du registrerar observationer.'
          }
        />
      ) : (
        <>
          <p className="mb-2 text-sm text-slate-500">
            {query ? `${total} träff${total === 1 ? '' : 'ar'} hittades.` : `${total} fordon`}
          </p>

          {/* Tabell på desktop */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Regnr</th>
                  <th className="px-4 py-3">Märke</th>
                  <th className="px-4 py-3">Modell</th>
                  <th className="px-4 py-3">Färg</th>
                  <th className="px-4 py-3">Senast observerad</th>
                  <th className="px-4 py-3 text-right">Observationer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.data!.rows.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link to={`/fordon/${v.id}`} state={fromState(loc, 'Tillbaka till fordon')} className="font-semibold text-brand-700 hover:underline">
                        {v.registration_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{v.make || '–'}</td>
                    <td className="px-4 py-3 text-slate-700">{v.model || '–'}</td>
                    <td className="px-4 py-3 text-slate-700">{v.color || '–'}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {v.last_observed ? formatDate(v.last_observed) : '–'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge color="blue">{v.observation_count ?? 0}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Kort på mobil */}
          <div className="space-y-2 md:hidden">
            {result.data!.rows.map((v) => (
              <Link key={v.id} to={`/fordon/${v.id}`} state={fromState(loc, 'Tillbaka till fordon')}>
                <Card className="p-4 transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-brand-700">{v.registration_number}</span>
                    <Badge color="blue">{v.observation_count ?? 0} obs.</Badge>
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {[v.make, v.model, v.color].filter(Boolean).join(' · ') || 'Inga detaljer'}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Senast: {v.last_observed ? formatDate(v.last_observed) : '–'}
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
