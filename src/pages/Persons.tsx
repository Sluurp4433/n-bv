import { useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { personName } from '../lib/persons'
import { genderLabel } from '../lib/constants'
import { Badge, Button, Card, EmptyState, Field, Input, LoadingState } from '../components/ui'
import { formatDate } from '../lib/format'
import type { Person } from '../types/database.types'

export function Persons() {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')

  const result = useQuery({
    queryKey: ['persons', query],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<Person[]> => {
      let q = supabase.from('persons').select('*').order('created_at', { ascending: false }).limit(100)
      if (query.trim()) q = q.textSearch('search', query.trim(), { type: 'websearch', config: 'swedish' })
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
  })

  function applySearch(e: React.FormEvent) {
    e.preventDefault()
    setQuery(search)
  }

  const rows = result.data ?? []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-800">Personer</h1>
        <p className="mt-1 text-sm text-slate-500">Personer som förekommer i observationer. Sök på namn, smeknamn, adress eller ort.</p>
      </div>

      <Card className="mb-4 p-4">
        <form onSubmit={applySearch} className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field label="Sök person" htmlFor="p-search">
            <Input id="p-search" placeholder="Namn, smeknamn, ort…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </Field>
          <div className="flex items-end"><Button type="submit" className="w-full sm:w-auto">Sök</Button></div>
        </form>
        <p className="mt-2 text-xs text-slate-400">Tips: sök på registreringsnummer i den universella Sök-vyn för att hitta kopplade personer.</p>
      </Card>

      {result.isLoading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Inga personer hittades"
          description={query ? 'Inga träffar på din sökning.' : 'Personer läggs till när du registrerar observationer.'}
        />
      ) : (
        <div className="space-y-2">
          {rows.map((p) => (
            <Link key={p.id} to={`/personer/${p.id}`}>
              <Card className="p-4 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold text-brand-700">{personName(p)}</h3>
                      {p.gender && <Badge>{genderLabel(p.gender)}</Badge>}
                    </div>
                    {(p.aliases?.length ?? 0) > 0 && (
                      <div className="text-xs text-slate-500">Även: {p.aliases.join(', ')}</div>
                    )}
                    {p.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{p.description}</p>}
                    <div className="mt-2 text-xs text-slate-500">
                      {[p.address, p.city].filter(Boolean).join(', ')}
                      {p.city || p.address ? ' · ' : ''}Tillagd {formatDate(p.created_at)}
                    </div>
                  </div>
                  <span className="text-slate-400">›</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
