import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { useToast } from '../components/Toast'
import { deleteLogbookImage, observationImageUrl, uploadLogbookImage } from '../lib/observations'
import { LOGBOOK_CATEGORIES } from '../lib/constants'
import { toDatetimeLocal } from '../lib/format'
import { Alert, Button, Card, Field, Input, LoadingState, Textarea } from '../components/ui'
import { ChipSelect } from '../components/inputs'

const catOpts = LOGBOOK_CATEGORIES.map((c) => ({ value: c, label: c }))

type NewImage = { file: File; caption: string; url: string }
type ExistingImage = { id: string; file_path: string; caption: string | null; url: string | null }

export function LogbookForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const { user } = useAuth()

  const [entryAt, setEntryAt] = useState(toDatetimeLocal(new Date()))
  const [showTime, setShowTime] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('')
  const [newImages, setNewImages] = useState<NewImage[]>([])
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const existing = useQuery({
    queryKey: ['logbook', id],
    enabled: isEdit,
    queryFn: async () => {
      const { data, error } = await supabase.from('logbook_entries').select('*').eq('id', id!).single()
      if (error) throw error
      const { data: imgs } = await supabase.from('logbook_images').select('id,file_path,caption').eq('logbook_entry_id', id!)
      return { entry: data, images: imgs ?? [] }
    },
  })

  useEffect(() => {
    if (!existing.data) return
    const { entry, images } = existing.data
    setTitle(entry.title)
    setContent(entry.content ?? '')
    setLocation(entry.location ?? '')
    setCategory(entry.category ?? '')
    setEntryAt(toDatetimeLocal(entry.entry_at))
    ;(async () => {
      const resolved: ExistingImage[] = await Promise.all(
        (images as any[]).map(async (im) => ({ id: im.id, file_path: im.file_path, caption: im.caption, url: await observationImageUrl(im.file_path) }))
      )
      setExistingImages(resolved)
    })()
  }, [existing.data])

  function addImages(files: FileList | null) {
    if (!files) return
    const additions: NewImage[] = []
    for (const f of Array.from(files)) {
      if (newImages.length + additions.length >= 8) break
      additions.push({ file: f, caption: '', url: URL.createObjectURL(f) })
    }
    setNewImages((prev) => [...prev, ...additions])
  }

  async function removeExistingImage(img: ExistingImage) {
    await deleteLogbookImage(img.id, img.file_path)
    setExistingImages((prev) => prev.filter((x) => x.id !== img.id))
  }

  async function onSubmit() {
    setError(null)
    if (!title.trim()) {
      setError('Ange en rubrik.')
      return
    }
    if (!user) return
    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        entry_at: new Date(entryAt).toISOString(),
        category: category || null,
        location: location || null,
        content: content || null,
      }
      let entryId = id
      if (isEdit) {
        const { error: e } = await supabase.from('logbook_entries').update(payload).eq('id', id!)
        if (e) throw e
      } else {
        const { data, error: e } = await supabase.from('logbook_entries').insert(payload).select('id').single()
        if (e || !data) throw e ?? new Error('insert failed')
        entryId = data.id
      }
      if (!entryId) throw new Error('no id')

      for (const img of newImages) {
        await uploadLogbookImage(entryId, img.file, img.caption, user.id)
      }

      qc.invalidateQueries({ queryKey: ['feed'] })
      qc.invalidateQueries({ queryKey: ['dashboard_feed'] })
      toast.success(isEdit ? 'Inlägget har uppdaterats.' : 'Inlägget har sparats.')
      navigate(`/loggbok/${entryId}`)
    } catch {
      setError('Kunde inte spara. Du kan bara redigera dina egna inlägg inom tillåten tid.')
    } finally {
      setSaving(false)
    }
  }

  if (isEdit && existing.isLoading) return <LoadingState />

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4">
        <Link to="/loggbok" className="text-sm text-brand-600 hover:underline">← Tillbaka till loggboken</Link>
      </div>
      <h1 className="mb-1 text-2xl font-bold text-brand-800">{isEdit ? 'Redigera inlägg' : 'Nytt inlägg'}</h1>
      <p className="mb-4 text-sm text-slate-500">Skriv ett inlägg i loggboken – lägg gärna till bild.</p>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="mt-4 space-y-4">
        <Card className="p-5">
          <Field label="Rubrik" htmlFor="title">
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Kort rubrik" autoFocus={!isEdit} />
          </Field>
          <div className="mt-4">
            <Field label="Innehåll" htmlFor="content">
              <Textarea id="content" rows={5} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Vad vill du skriva?" />
            </Field>
          </div>
          <div className="mt-4">
            <p className="mb-1.5 text-sm font-medium text-slate-700">Kategori</p>
            <ChipSelect value={category} onChange={setCategory} options={catOpts} />
          </div>
          <div className="mt-4">
            <Field label="Plats" htmlFor="location">
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="T.ex. gata, område" />
            </Field>
          </div>
          <div className="mt-4">
            {showTime ? (
              <Field label="Datum och tid" htmlFor="entry_at">
                <Input id="entry_at" type="datetime-local" value={entryAt} onChange={(e) => setEntryAt(e.target.value)} />
              </Field>
            ) : (
              <button type="button" onClick={() => setShowTime(true)} className="text-sm text-brand-600 hover:underline">
                Ändra tid (nu som standard)
              </button>
            )}
          </div>
        </Card>

        {/* Bilder */}
        <Card className="p-5">
          <h2 className="mb-1 font-semibold text-brand-800">Bilder</h2>
          <p className="mb-3 text-sm text-slate-500">Lägg till foton. Bildtexten blir sökbar.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {existingImages.map((img) => (
              <div key={img.id} className="rounded-lg border border-slate-200 p-2">
                {img.url ? <img src={img.url} alt={img.caption ?? ''} className="h-24 w-full rounded object-cover" /> : <div className="h-24 rounded bg-slate-100" />}
                <div className="mt-1 truncate text-xs text-slate-500">{img.caption}</div>
                <button type="button" onClick={() => removeExistingImage(img)} className="mt-1 text-xs text-red-600 hover:underline">Ta bort</button>
              </div>
            ))}
            {newImages.map((img, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-2">
                <img src={img.url} alt="" className="h-24 w-full rounded object-cover" />
                <Input className="mt-1 text-xs" placeholder="Bildtext" value={img.caption} onChange={(e) => setNewImages((prev) => prev.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))} />
                <button type="button" onClick={() => setNewImages((prev) => prev.filter((_, j) => j !== i))} className="mt-1 text-xs text-red-600 hover:underline">Ta bort</button>
              </div>
            ))}
          </div>
          {newImages.length + existingImages.length < 8 && (
            <label className="mt-3 inline-block cursor-pointer">
              <span className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">📷 Lägg till bild</span>
              <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => { addImages(e.target.files); e.target.value = '' }} />
            </label>
          )}
        </Card>

        <div className="flex justify-end gap-2 pb-4">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Avbryt</Button>
          <Button type="button" size="lg" onClick={onSubmit} loading={saving}>
            {isEdit ? 'Spara ändringar' : 'Spara inlägg'}
          </Button>
        </div>
      </div>
    </div>
  )
}
