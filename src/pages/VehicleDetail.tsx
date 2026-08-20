import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { useProfiles, creatorName } from '../lib/hooks'
import { useToast } from '../components/Toast'
import { Modal, ConfirmDialog } from '../components/Modal'
import { BackLink } from '../components/BackLink'
import { VEHICLE_TYPES } from '../lib/constants'
import { Badge, Button, Card, EmptyState, Field, Input, LoadingState, Select, Textarea } from '../components/ui'
import { formatDateTime } from '../lib/format'
import type { Observation, Vehicle } from '../types/database.types'

export function VehicleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const { isAdmin } = useAuth()
  const { map } = useProfiles()
  const [editOpen, setEditOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const query = useQuery({
    queryKey: ['vehicle', id],
    queryFn: async () => {
      const { data: vehicle, error } = await supabase.from('vehicles').select('*').eq('id', id!).single()
      if (error) throw error
      const { data: links } = await supabase
        .from('observation_vehicles')
        .select('observations(*)')
        .eq('vehicle_id', id!)
      const observations = (links ?? [])
        .map((l) => l.observations as unknown as Observation)
        .filter(Boolean)
        .sort((a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime())
      return { vehicle, observations }
    },
  })

  if (query.isLoading) return <LoadingState />
  if (query.isError || !query.data)
    return (
      <EmptyState
        title="Fordonet hittades inte"
        action={
          <Link to="/fordon">
            <Button variant="secondary">Till fordonslistan</Button>
          </Link>
        }
      />
    )

  const { vehicle, observations } = query.data

  async function handleDelete() {
    setDeleting(true)
    const { error } = await supabase.from('vehicles').delete().eq('id', id!)
    setDeleting(false)
    setConfirmOpen(false)
    if (error) {
      toast.error('Kunde inte ta bort fordonet. Ta först bort kopplade observationer.')
      return
    }
    toast.success('Fordonet har tagits bort.')
    qc.invalidateQueries({ queryKey: ['vehicles'] })
    navigate('/fordon')
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4">
        <BackLink to="/fordon" label="Tillbaka till fordon" />
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-brand-800">{vehicle.registration_number}</h1>
            <p className="mt-1 text-slate-600">
              {[vehicle.make, vehicle.model, vehicle.color].filter(Boolean).join(' · ') ||
                'Inga fordonsdetaljer registrerade'}
            </p>
          </div>
          <Badge color="blue">{observations.length} observationer</Badge>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Detail label="Märke" value={vehicle.make} />
          <Detail label="Modell" value={vehicle.model} />
          <Detail label="Färg" value={vehicle.color} />
          <Detail label="Fordonstyp" value={vehicle.vehicle_type} />
        </dl>

        {vehicle.notes && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-slate-700">Övrigt</h3>
            <p className="mt-1 whitespace-pre-wrap text-slate-700">{vehicle.notes}</p>
          </div>
        )}

        {isAdmin && (
          <div className="mt-5 flex gap-2">
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              Redigera fordon
            </Button>
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              Ta bort
            </Button>
          </div>
        )}
      </Card>

      {/* Historik */}
      <div className="mt-6">
        <h2 className="mb-2 font-semibold text-brand-800">Fordonets historik</h2>
        {observations.length === 0 ? (
          <EmptyState title="Inga observationer" description="Fordonet är inte kopplat till någon observation ännu." />
        ) : (
          <div className="space-y-2">
            {observations.map((o) => (
              <Link key={o.id} to={`/observation/${o.id}`}>
                <Card className="p-4 transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-800">{o.type || o.category || 'Observation'}</span>
                    <span className="text-xs text-slate-400">{formatDateTime(o.observed_at)}</span>
                  </div>
                  {o.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{o.description}</p>}
                  <div className="mt-2 text-xs text-slate-500">
                    {o.location ? `${o.location} · ` : ''}
                    {creatorName(map, o.created_by)}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {isAdmin && (
        <VehicleEditModal
          open={editOpen}
          vehicle={vehicle}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false)
            qc.invalidateQueries({ queryKey: ['vehicle', id] })
            qc.invalidateQueries({ queryKey: ['vehicles'] })
            toast.success('Fordonet har uppdaterats.')
          }}
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Ta bort fordon"
        message="Vill du ta bort fordonet? Detta går bara om inga observationer är kopplade till det."
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

type EditValues = {
  registration_number: string
  make: string
  model: string
  color: string
  vehicle_type: string
  notes: string
}

function VehicleEditModal({
  open,
  vehicle,
  onClose,
  onSaved,
}: {
  open: boolean
  vehicle: Vehicle
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const { register, handleSubmit, formState } = useForm<EditValues>({
    defaultValues: {
      registration_number: vehicle.registration_number,
      make: vehicle.make ?? '',
      model: vehicle.model ?? '',
      color: vehicle.color ?? '',
      vehicle_type: vehicle.vehicle_type ?? '',
      notes: vehicle.notes ?? '',
    },
  })

  async function onSubmit(values: EditValues) {
    const { error } = await supabase
      .from('vehicles')
      .update({
        registration_number: values.registration_number.trim(),
        make: values.make || null,
        model: values.model || null,
        color: values.color || null,
        vehicle_type: values.vehicle_type || null,
        notes: values.notes || null,
      })
      .eq('id', vehicle.id)
    if (error) {
      toast.error('Kunde inte spara. Registreringsnumret kan redan finnas.')
      return
    }
    onSaved()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Redigera fordon"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Avbryt
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={formState.isSubmitting}>
            Spara
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Registreringsnummer" htmlFor="e-reg">
          <Input id="e-reg" className="uppercase" {...register('registration_number')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Märke" htmlFor="e-make">
            <Input id="e-make" {...register('make')} />
          </Field>
          <Field label="Modell" htmlFor="e-model">
            <Input id="e-model" {...register('model')} />
          </Field>
          <Field label="Färg" htmlFor="e-color">
            <Input id="e-color" {...register('color')} />
          </Field>
          <Field label="Fordonstyp" htmlFor="e-type">
            <Select id="e-type" {...register('vehicle_type')}>
              <option value="">Välj typ…</option>
              {VEHICLE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Övrigt" htmlFor="e-notes">
          <Textarea id="e-notes" rows={2} {...register('notes')} />
        </Field>
      </div>
    </Modal>
  )
}
