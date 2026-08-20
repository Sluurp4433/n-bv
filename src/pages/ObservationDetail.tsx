import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { useProfiles, useSettings, creatorName, canEditOwn } from '../lib/hooks'
import { useToast } from '../components/Toast'
import { ConfirmDialog } from '../components/Modal'
import { BackLink } from '../components/BackLink'
import { Badge, Button, Card, EmptyState, LoadingState } from '../components/ui'
import { formatDateTime } from '../lib/format'
import { priorityLabel } from '../lib/constants'
import { observationImageUrl } from '../lib/observations'
import { personName } from '../lib/persons'
import type { Person, Vehicle } from '../types/database.types'

export function ObservationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const { user, isAdmin } = useAuth()
  const { map } = useProfiles()
  const { data: settings } = useSettings()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const query = useQuery({
    queryKey: ['observation', id],
    queryFn: async () => {
      const { data: obs, error } = await supabase.from('observations').select('*').eq('id', id!).single()
      if (error) throw error
      const { data: links } = await supabase
        .from('observation_vehicles')
        .select('vehicles(*)')
        .eq('observation_id', id!)
      const vehicles = (links ?? []).map((l) => l.vehicles as unknown as Vehicle).filter(Boolean)

      const { data: plinks } = await supabase
        .from('observation_persons')
        .select('persons(*)')
        .eq('observation_id', id!)
      const persons = (plinks ?? []).map((l) => l.persons as unknown as Person).filter(Boolean)

      const { data: imgRows } = await supabase
        .from('observation_images')
        .select('id,file_path,caption')
        .eq('observation_id', id!)
      const images = await Promise.all(
        (imgRows ?? []).map(async (im) => ({ id: im.id, caption: im.caption, url: await observationImageUrl(im.file_path) }))
      )
      return { obs, vehicles, persons, images }
    },
  })

  if (query.isLoading) return <LoadingState />
  if (query.isError || !query.data)
    return (
      <EmptyState
        title="Observationen hittades inte"
        action={
          <Link to="/hem">
            <Button variant="secondary">Till startsidan</Button>
          </Link>
        }
      />
    )

  const { obs, vehicles, persons, images } = query.data
  const canEdit = canEditOwn(obs.created_by, obs.created_at, user?.id, isAdmin, settings?.edit_window_hours)
  const priorityColor = obs.priority === 'hog' ? 'red' : obs.priority === 'lag' ? 'slate' : 'blue'

  async function handleDelete() {
    setDeleting(true)
    const { error } = await supabase.from('observations').delete().eq('id', id!)
    setDeleting(false)
    setConfirmOpen(false)
    if (error) {
      toast.error('Kunde inte ta bort observationen.')
      return
    }
    toast.success('Observationen har tagits bort.')
    qc.invalidateQueries({ queryKey: ['observations'] })
    navigate('/hem')
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4">
        <BackLink to="/loggbok" label="Tillbaka till loggboken" />
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-brand-800">{obs.type || 'Observation'}</h1>
          <Badge color={priorityColor}>Prioritet: {priorityLabel(obs.priority)}</Badge>
          {obs.category && <Badge>{obs.category}</Badge>}
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <Detail label="Datum och tid" value={formatDateTime(obs.observed_at)} />
          <Detail label="Plats" value={obs.location} />
        </dl>

        {obs.description && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-slate-700">Beskrivning</h3>
            <p className="mt-1 whitespace-pre-wrap text-slate-700">{obs.description}</p>
          </div>
        )}

        {obs.notes && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-slate-700">Kommentar</h3>
            <p className="mt-1 whitespace-pre-wrap text-slate-700">{obs.notes}</p>
          </div>
        )}

        <div className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-400">
          Skapad av {creatorName(map, obs.created_by)} · {formatDateTime(obs.created_at)}
          {obs.updated_at !== obs.created_at && ` · Senast ändrad ${formatDateTime(obs.updated_at)}`}
        </div>

        {(canEdit || isAdmin) && (
          <div className="mt-5 flex gap-2">
            {canEdit && (
              <Link to={`/observation/${obs.id}/redigera`}>
                <Button variant="secondary">Redigera</Button>
              </Link>
            )}
            {isAdmin && (
              <Button variant="danger" onClick={() => setConfirmOpen(true)}>
                Ta bort
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Relaterade fordon */}
      <div className="mt-6">
        <h2 className="mb-2 font-semibold text-brand-800">Relaterade fordon</h2>
        {vehicles.length === 0 ? (
          <p className="text-sm text-slate-400">Inget fordon kopplat till observationen.</p>
        ) : (
          <div className="space-y-2">
            {vehicles.map((v) => (
              <Link key={v.id} to={`/fordon/${v.id}`}>
                <Card className="flex items-center justify-between p-4 transition-shadow hover:shadow-md">
                  <div>
                    <div className="font-semibold text-brand-700">{v.registration_number}</div>
                    <div className="text-sm text-slate-500">
                      {[v.make, v.model, v.color].filter(Boolean).join(' · ') || 'Inga fordonsdetaljer'}
                    </div>
                  </div>
                  <span className="text-slate-400">›</span>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Relaterade personer */}
      <div className="mt-6">
        <h2 className="mb-2 font-semibold text-brand-800">Relaterade personer</h2>
        {persons.length === 0 ? (
          <p className="text-sm text-slate-400">Ingen person kopplad till observationen.</p>
        ) : (
          <div className="space-y-2">
            {persons.map((p) => (
              <Link key={p.id} to={`/personer/${p.id}`}>
                <Card className="flex items-center justify-between p-4 transition-shadow hover:shadow-md">
                  <div>
                    <div className="font-semibold text-brand-700">{personName(p)}</div>
                    <div className="text-sm text-slate-500">
                      {[p.city, p.description].filter(Boolean).join(' · ') || 'Inga detaljer'}
                    </div>
                  </div>
                  <span className="text-slate-400">›</span>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Bilder */}
      {images.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 font-semibold text-brand-800">Bilder</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((im) => (
              <a key={im.id} href={im.url ?? undefined} target="_blank" rel="noopener" className="block rounded-lg border border-slate-200 p-2">
                {im.url ? <img src={im.url} alt={im.caption ?? ''} className="h-28 w-full rounded object-cover" /> : <div className="h-28 rounded bg-slate-100" />}
                {im.caption && <div className="mt-1 truncate text-xs text-slate-600">{im.caption}</div>}
              </a>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Ta bort observation"
        message="Är du säker på att du vill ta bort den här observationen? Åtgärden kan inte ångras."
        confirmLabel="Ta bort"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="font-medium text-slate-500">{label}</dt>
      <dd className="text-slate-800">{value || '–'}</dd>
    </div>
  )
}
