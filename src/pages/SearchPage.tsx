import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Button, Card, EmptyState, Field, Input, LoadingState } from '../components/ui'
import { formatDateTime } from '../lib/format'
import type { SearchResult } from '../types/database.types'

const GROUPS: { type: string; label: string; path: (id: string) => string; emoji: string }[] = [
  { type: 'fordon', label: 'Fordon', path: (id) => `/fordon/${id}`, emoji: '🚗' },
  { type: 'observation', label: 'Observationer', path: (id) => `/observation/${id}`, emoji: '📝' },
  { type: 'loggbok', label: 'Loggbok', path: (id) => `/loggbok/${id}`, emoji: '📖' },
]

export function SearchPage() {
  const [term, setTerm] = useState('')
  const [query, setQuery] = useState('')

  const result = useQuery({
    queryKey: ['search', query],
    enabled: query.trim().length > 0,
    queryFn: async (): Promise<SearchResult[]> => {
      const { data, error } = await supabase.rpc('search_all', { q: query.trim() })
      if (error) throw error
      return (data ?? []) as SearchResult[]
    },
  })

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setQuery(term)
  }

  const rows = result.data ?? []
  const total = rows.length

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-800">Sök</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sök i hela databasen – fordon, observationer och loggbok. Prova t.ex. ett
          registreringsnummer, ett märke eller ett ord.
        </p>
      </div>

      <Card className="mb-4 p-4">
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field label="Sökord" htmlFor="global-search">
            <Input
              id="global-search"
              autoFocus
              placeholder="ABC123, Volvo, plats, fritext…"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="w-full sm:w-auto" disabled={!term.trim()}>
              Sök
            </Button>
          </div>
        </form>
      </Card>

      {!query.trim() ? (
        <EmptyState title="Skriv något att söka efter" icon="🔎" />
      ) : result.isLoading ? (
        <LoadingState label="Söker…" />
      ) : total === 0 ? (
        <EmptyState title="Inga träffar" description={`Sökningen på "${query}" gav inga resultat.`} />
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500">
            {total} träff{total === 1 ? '' : 'ar'} hittades.
          </p>
          <div className="space-y-6">
            {GROUPS.map((g) => {
              const items = rows.filter((r) => r.result_type === g.type)
              if (items.length === 0) return null
              return (
                <section key={g.type}>
                  <h2 className="mb-2 flex items-center gap-2 font-semibold text-brand-800">
                    <span>{g.emoji}</span> {g.label}
                    <span className="text-sm font-normal text-slate-400">({items.length})</span>
                  </h2>
                  <div className="space-y-2">
                    {items.map((r) => (
                      <Link key={`${r.result_type}-${r.result_id}`} to={g.path(r.result_id)}>
                        <Card className="p-4 transition-shadow hover:shadow-md">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-semibold text-brand-700">{r.title}</div>
                              {r.subtitle && (
                                <div className="text-sm text-slate-600">{r.subtitle}</div>
                              )}
                              {r.snippet && (
                                <div className="mt-1 line-clamp-2 text-sm text-slate-500">
                                  {r.snippet}
                                </div>
                              )}
                            </div>
                            {r.occurred_at && (
                              <span className="whitespace-nowrap text-xs text-slate-400">
                                {formatDateTime(r.occurred_at)}
                              </span>
                            )}
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
