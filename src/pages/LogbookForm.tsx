import { useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { LOGBOOK_CATEGORIES } from '../lib/constants'
import { toDatetimeLocal } from '../lib/format'
import { Alert, Button, Card, Field, Input, LoadingState, Select, Textarea } from '../components/ui'

const schema = z.object({
  title: z.string().min(1, 'Ange en rubrik'),
  entry_at: z.string().min(1, 'Ange datum och tid'),
  category: z.string().optional(),
  location: z.string().optional(),
  content: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function LogbookForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()

  const existing = useQuery({
    queryKey: ['logbook', id],
    enabled: isEdit,
    queryFn: async () => {
      const { data, error } = await supabase.from('logbook_entries').select('*').eq('id', id!).single()
      if (error) throw error
      return data
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { entry_at: toDatetimeLocal(new Date()) },
  })

  useEffect(() => {
    if (existing.data) {
      reset({
        title: existing.data.title,
        entry_at: toDatetimeLocal(existing.data.entry_at),
        category: existing.data.category ?? '',
        location: existing.data.location ?? '',
        content: existing.data.content ?? '',
      })
    }
  }, [existing.data, reset])

  async function onSubmit(values: FormValues) {
    const payload = {
      title: values.title,
      entry_at: new Date(values.entry_at).toISOString(),
      category: values.category || null,
      location: values.location || null,
      content: values.content || null,
    }

    if (isEdit) {
      const { error } = await supabase.from('logbook_entries').update(payload).eq('id', id!)
      if (error) {
        setError('root', { message: 'Kunde inte spara. Du kan bara redigera dina egna inlägg inom tillåten tid.' })
        return
      }
      toast.success('Inlägget har uppdaterats.')
      qc.invalidateQueries({ queryKey: ['logbook'] })
      navigate(`/loggbok/${id}`)
    } else {
      const { data, error } = await supabase.from('logbook_entries').insert(payload).select('id').single()
      if (error || !data) {
        setError('root', { message: 'Kunde inte spara inlägget. Försök igen.' })
        return
      }
      toast.success('Inlägget har sparats.')
      qc.invalidateQueries({ queryKey: ['logbook'] })
      navigate(`/loggbok/${data.id}`)
    }
  }

  if (isEdit && existing.isLoading) return <LoadingState />

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4">
        <Link to="/loggbok" className="text-sm text-brand-600 hover:underline">
          ← Tillbaka till loggboken
        </Link>
      </div>
      <h1 className="mb-4 text-2xl font-bold text-brand-800">
        {isEdit ? 'Redigera inlägg' : 'Nytt loggboksinlägg'}
      </h1>

      <Card className="p-5 sm:p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {errors.root && <Alert variant="error">{errors.root.message}</Alert>}

          <Field label="Rubrik" htmlFor="title" error={errors.title?.message}>
            <Input id="title" {...register('title')} placeholder="Kort beskrivning av händelsen" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Datum och tid" htmlFor="entry_at" error={errors.entry_at?.message}>
              <Input id="entry_at" type="datetime-local" {...register('entry_at')} />
            </Field>
            <Field label="Kategori" htmlFor="category">
              <Select id="category" {...register('category')}>
                <option value="">Välj kategori…</option>
                {LOGBOOK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Plats" htmlFor="location">
            <Input id="location" {...register('location')} placeholder="T.ex. gata, område" />
          </Field>

          <Field label="Innehåll" htmlFor="content">
            <Textarea id="content" rows={6} {...register('content')} placeholder="Beskriv händelsen…" />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              Avbryt
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Spara ändringar' : 'Spara inlägg'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
