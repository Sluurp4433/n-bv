import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { clearVehicleLinks, linkVehicle, upsertVehicle } from '../lib/observations'
import {
  OBSERVATION_CATEGORIES,
  OBSERVATION_TYPES,
  PRIORITIES,
  VEHICLE_TYPES,
} from '../lib/constants'
import { toDatetimeLocal } from '../lib/format'
import { Alert, Button, Card, Field, Input, LoadingState, Select, Textarea } from '../components/ui'

const schema = z.object({
  observed_at: z.string().min(1, 'Ange datum och tid'),
  location: z.string().optional(),
  type: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  priority: z.string().default('normal'),
  notes: z.string().optional(),
  registration_number: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  vehicle_type: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function ObservationForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()

  const existing = useQuery({
    queryKey: ['observation-edit', id],
    enabled: isEdit,
    queryFn: async () => {
      const { data: obs, error } = await supabase.from('observations').select('*').eq('id', id!).single()
      if (error) throw error
      const { data: link } = await supabase
        .from('observation_vehicles')
        .select('vehicle_id, vehicles(*)')
        .eq('observation_id', id!)
        .limit(1)
        .maybeSingle()
      return { obs, vehicle: (link?.vehicles as any) ?? null }
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
    defaultValues: { observed_at: toDatetimeLocal(new Date()), priority: 'normal' },
  })

  useEffect(() => {
    if (existing.data) {
      const { obs, vehicle } = existing.data
      reset({
        observed_at: toDatetimeLocal(obs.observed_at),
        location: obs.location ?? '',
        type: obs.type ?? '',
        category: obs.category ?? '',
        description: obs.description ?? '',
        priority: obs.priority ?? 'normal',
        notes: obs.notes ?? '',
        registration_number: vehicle?.registration_number ?? '',
        make: vehicle?.make ?? '',
        model: vehicle?.model ?? '',
        color: vehicle?.color ?? '',
        vehicle_type: vehicle?.vehicle_type ?? '',
      })
    }
  }, [existing.data, reset])

  async function onSubmit(values: FormValues) {
    const obsPayload = {
      observed_at: new Date(values.observed_at).toISOString(),
      location: values.location || null,
      type: values.type || null,
      category: values.category || null,
      description: values.description || null,
      priority: values.priority || 'normal',
      notes: values.notes || null,
    }

    try {
      let observationId = id
      if (isEdit) {
        const { error } = await supabase.from('observations').update(obsPayload).eq('id', id!)
        if (error) throw error
        await clearVehicleLinks(id!)
      } else {
        const { data, error } = await supabase.from('observations').insert(obsPayload).select('id').single()
        if (error || !data) throw error ?? new Error('insert failed')
        observationId = data.id
      }

      const vehicleId = await upsertVehicle({
        registration_number: values.registration_number,
        make: values.make,
        model: values.model,
        color: values.color,
        vehicle_type: values.vehicle_type,
      })
      if (vehicleId && observationId) await linkVehicle(observationId, vehicleId)

      qc.invalidateQueries({ queryKey: ['observations'] })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      toast.success(isEdit ? 'Observationen har uppdaterats.' : 'Observationen har sparats.')
      navigate(`/observation/${observationId}`)
    } catch {
      setError('root', {
        message: isEdit
          ? 'Kunde inte spara. Du kan bara redigera dina egna observationer inom tillåten tid.'
          : 'Kunde inte spara observationen. Kontrollera uppgifterna och försök igen.',
      })
    }
  }

  if (isEdit && existing.isLoading) return <LoadingState />

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4">
        <Link to="/hem" className="text-sm text-brand-600 hover:underline">
          ← Tillbaka
        </Link>
      </div>
      <h1 className="mb-1 text-2xl font-bold text-brand-800">
        {isEdit ? 'Redigera observation' : 'Ny observation'}
      </h1>
      <p className="mb-4 text-sm text-slate-500">
        Registrera bara uppgifter som är relevanta och nödvändiga.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {errors.root && <Alert variant="error">{errors.root.message}</Alert>}

        {/* Händelse */}
        <Card className="p-5">
          <h2 className="mb-4 font-semibold text-brand-800">Händelse</h2>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Datum och tid" htmlFor="observed_at" error={errors.observed_at?.message}>
                <Input id="observed_at" type="datetime-local" {...register('observed_at')} />
              </Field>
              <Field label="Plats" htmlFor="location">
                <Input id="location" {...register('location')} placeholder="Gata, område" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Typ av observation" htmlFor="type">
                <Select id="type" {...register('type')}>
                  <option value="">Välj typ…</option>
                  {OBSERVATION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Kategori" htmlFor="category">
                <Select id="category" {...register('category')}>
                  <option value="">Välj kategori…</option>
                  {OBSERVATION_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Beskrivning" htmlFor="description">
              <Textarea id="description" rows={4} {...register('description')} placeholder="Vad observerades?" />
            </Field>
          </div>
        </Card>

        {/* Fordon */}
        <Card className="p-5">
          <h2 className="mb-1 font-semibold text-brand-800">Fordon</h2>
          <p className="mb-4 text-sm text-slate-500">
            Fyll i om ett fordon var inblandat. Samma fordon återanvänds automatiskt via
            registreringsnumret.
          </p>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Registreringsnummer" htmlFor="registration_number">
                <Input
                  id="registration_number"
                  {...register('registration_number')}
                  placeholder="ABC123"
                  className="uppercase"
                  autoCapitalize="characters"
                />
              </Field>
              <Field label="Fordonstyp" htmlFor="vehicle_type">
                <Select id="vehicle_type" {...register('vehicle_type')}>
                  <option value="">Välj typ…</option>
                  {VEHICLE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Märke" htmlFor="make">
                <Input id="make" {...register('make')} placeholder="Volvo" />
              </Field>
              <Field label="Modell" htmlFor="model">
                <Input id="model" {...register('model')} placeholder="V70" />
              </Field>
              <Field label="Färg" htmlFor="color">
                <Input id="color" {...register('color')} placeholder="Svart" />
              </Field>
            </div>
          </div>
        </Card>

        {/* Övrigt */}
        <Card className="p-5">
          <h2 className="mb-4 font-semibold text-brand-800">Övrig information</h2>
          <div className="space-y-4">
            <Field label="Prioritet" htmlFor="priority">
              <Select id="priority" {...register('priority')}>
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Kommentar" htmlFor="notes">
              <Textarea id="notes" rows={3} {...register('notes')} placeholder="Övriga anteckningar" />
            </Field>
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Avbryt
          </Button>
          <Button type="submit" size="lg" loading={isSubmitting}>
            {isEdit ? 'Spara ändringar' : 'Spara observation'}
          </Button>
        </div>
      </form>
    </div>
  )
}
