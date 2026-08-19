import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useAuth } from '../auth/AuthProvider'
import { useProfiles, creatorName } from '../lib/hooks'
import { useToast } from '../components/Toast'
import { ConfirmDialog } from '../components/Modal'
import {
  DOCUMENT_CATEGORIES,
  deleteDocument,
  formatBytes,
  getDownloadUrl,
  uploadDocument,
  useDocuments,
} from '../lib/documents'
import { Alert, Button, Card, EmptyState, Field, Input, LoadingState, PageHeader, Select, Textarea } from '../components/ui'
import { formatDate } from '../lib/format'
import type { DocumentRow } from '../types/database.types'

export function Information() {
  const { user, profile } = useAuth()
  const { map } = useProfiles()
  const toast = useToast()
  const qc = useQueryClient()
  const docs = useDocuments()
  const [toDelete, setToDelete] = useState<DocumentRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const canManage = !!profile?.active && (profile?.role === 'admin' || profile?.role === 'styrelse')

  async function handleDownload(doc: DocumentRow) {
    const url = await getDownloadUrl(doc.file_path)
    if (!url) return toast.error('Kunde inte hämta filen.')
    window.open(url, '_blank', 'noopener')
  }

  async function handleDelete() {
    if (!toDelete) return
    setDeleting(true)
    const res = await deleteDocument(toDelete)
    setDeleting(false)
    setToDelete(null)
    if (res.error) return toast.error(res.error)
    toast.success('Dokumentet har tagits bort.')
    qc.invalidateQueries({ queryKey: ['documents'] })
  }

  const grouped = DOCUMENT_CATEGORIES.map((cat) => ({
    cat,
    items: (docs.data ?? []).filter((d) => (d.category ?? 'Övrigt') === cat),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Föreningsinformation" description="Stadgar, protokoll och annan information till medlemmarna." />

      {canManage && (
        <UploadCard
          userId={user!.id}
          onUploaded={() => {
            qc.invalidateQueries({ queryKey: ['documents'] })
            toast.success('Dokumentet har laddats upp.')
          }}
        />
      )}

      {docs.isLoading ? (
        <LoadingState />
      ) : (docs.data?.length ?? 0) === 0 ? (
        <EmptyState title="Inga dokument ännu" description={canManage ? 'Ladda upp det första dokumentet ovan.' : 'Här dyker föreningens dokument upp.'} icon="📄" />
      ) : (
        <div className="space-y-6">
          {grouped.map((g) => (
            <section key={g.cat}>
              <h2 className="mb-2 font-semibold text-brand-800">{g.cat}</h2>
              <div className="space-y-2">
                {g.items.map((d) => (
                  <Card key={d.id} className="flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-lg">📄</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-slate-800">{d.title}</div>
                      {d.description && <div className="truncate text-sm text-slate-500">{d.description}</div>}
                      <div className="mt-0.5 text-xs text-slate-400">
                        {d.file_name} {d.size_bytes ? `· ${formatBytes(d.size_bytes)}` : ''} · {formatDate(d.created_at)} · {creatorName(map, d.uploaded_by)}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="secondary" onClick={() => handleDownload(d)}>Öppna</Button>
                      {canManage && (
                        <Button variant="ghost" onClick={() => setToDelete(d)} aria-label="Ta bort">✕</Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Ta bort dokument"
        message={`Vill du ta bort "${toDelete?.title ?? ''}"? Filen raderas permanent.`}
        confirmLabel="Ta bort"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}

type UploadValues = { title: string; category: string; description: string }

function UploadCard({ userId, onUploaded }: { userId: string; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, reset, formState } = useForm<UploadValues>({
    defaultValues: { title: '', category: DOCUMENT_CATEGORIES[0], description: '' },
  })

  async function onSubmit(values: UploadValues) {
    setError(null)
    if (!file) {
      setError('Välj en fil att ladda upp.')
      return
    }
    const res = await uploadDocument({ file, title: values.title || file.name, category: values.category, description: values.description }, userId)
    if (res.error) {
      setError(res.error)
      return
    }
    setFile(null)
    reset({ title: '', category: values.category, description: '' })
    onUploaded()
  }

  return (
    <Card className="mb-6 p-5">
      <h2 className="mb-3 font-semibold text-brand-800">Ladda upp dokument</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
        {error && <Alert variant="error">{error}</Alert>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Titel" htmlFor="d-title">
            <Input id="d-title" {...register('title')} placeholder="T.ex. Årsmötesprotokoll 2026" />
          </Field>
          <Field label="Kategori" htmlFor="d-cat">
            <Select id="d-cat" {...register('category')}>
              {DOCUMENT_CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
            </Select>
          </Field>
        </div>
        <Field label="Beskrivning (valfritt)" htmlFor="d-desc">
          <Textarea id="d-desc" rows={2} {...register('description')} />
        </Field>
        <Field label="Fil" htmlFor="d-file" hint="PDF, Word, bilder m.m.">
          <input
            id="d-file"
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-800"
          />
        </Field>
        {file && <p className="text-xs text-slate-500">Vald fil: {file.name} ({formatBytes(file.size)})</p>}
        <div className="flex justify-end">
          <Button type="submit" loading={formState.isSubmitting}>Ladda upp</Button>
        </div>
      </form>
    </Card>
  )
}
