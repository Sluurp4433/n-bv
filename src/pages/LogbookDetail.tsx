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
import { observationImageUrl } from '../lib/observations'
import { formatDateTime } from '../lib/format'

export function LogbookDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const { user, isAdmin } = useAuth()
  const { map } = useProfiles()
  const { data: settings } = useSettings()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const entry = useQuery({
    queryKey: ['logbook', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('logbook_entries').select('*').eq('id', id!).single()
      if (error) throw error
      return data
    },
  })

  const images = useQuery({
    queryKey: ['logbook-images', id],
    queryFn: async () => {
      const { data } = await supabase.from('logbook_images').select('id,file_path,caption').eq('logbook_entry_id', id!)
      return Promise.all((data ?? []).map(async (im) => ({ id: im.id, caption: im.caption, url: await observationImageUrl(im.file_path) })))
    },
  })

  if (entry.isLoading) return <LoadingState />
  if (entry.isError || !entry.data)
    return (
      <EmptyState
        title="Inlägget hittades inte"
        action={
          <Link to="/loggbok">
            <Button variant="secondary">Till loggboken</Button>
          </Link>
        }
      />
    )

  const l = entry.data
  const canEdit = canEditOwn(l.created_by, l.created_at, user?.id, isAdmin, settings?.edit_window_hours)

  async function handleDelete() {
    setDeleting(true)
    const { error } = await supabase.from('logbook_entries').delete().eq('id', id!)
    setDeleting(false)
    setConfirmOpen(false)
    if (error) {
      toast.error('Kunde inte ta bort inlägget.')
      return
    }
    toast.success('Inlägget har tagits bort.')
    qc.invalidateQueries({ queryKey: ['logbook'] })
    navigate('/loggbok')
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4">
        <BackLink to="/loggbok" label="Tillbaka till loggboken" />
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-brand-800">{l.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span>{formatDateTime(l.entry_at)}</span>
              {l.category && <Badge>{l.category}</Badge>}
            </div>
          </div>
        </div>

        {l.location && (
          <p className="mt-4 text-sm">
            <span className="font-medium text-slate-700">Plats:</span> {l.location}
          </p>
        )}

        {l.content && (
          <p className="mt-4 whitespace-pre-wrap text-slate-700">{l.content}</p>
        )}

        <div className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-400">
          Skapad av {creatorName(map, l.created_by)} · {formatDateTime(l.created_at)}
          {l.updated_at !== l.created_at && ` · Senast ändrad ${formatDateTime(l.updated_at)}`}
        </div>

        {(canEdit || isAdmin) && (
          <div className="mt-5 flex gap-2">
            {canEdit && (
              <Link to={`/loggbok/${l.id}/redigera`}>
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

      {(images.data?.length ?? 0) > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 font-semibold text-brand-800">Bilder</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.data!.map((im) => (
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
        title="Ta bort inlägg"
        message="Är du säker på att du vill ta bort det här loggboksinlägget? Åtgärden kan inte ångras."
        confirmLabel="Ta bort"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
