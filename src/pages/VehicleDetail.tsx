import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { useProfiles, creatorName } from '../lib/hooks'
import { useToast } from '../components/Toast'
import { Modal, ConfirmDialog } from '../components/Modal'
import { Lightbox } from '../components/Lightbox'
import { BackLink } from '../components/BackLink'
import { VEHICLE_TYPES } from '../lib/constants'
import {
  uploadVehicleImage,
  vehicleImageUrl,
  deleteVehicleImage,
  removeVehicleImageFiles,
  setVehicleCoverImage,
} from '../lib/vehicles'
import { Badge, Button, Card, EmptyState, Field, Input, LoadingState, Select, Textarea } from '../components/ui'
import { formatDateTime } from '../lib/format'
import type { Observation, Vehicle } from '../types/database.types'

const MAX_PHOTOS = 8

export function VehicleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const { user, isAdmin } = useAuth()
  const { map } = useProfiles()
  const [editOpen, setEditOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [removingPhotoId, setRemovingPhotoId] = useState<string | null>(null)
  const [settingCoverId, setSettingCoverId] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

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
      const { data: imgRows } = await supabase
        .from('vehicle_images')
        .select('id,file_path,caption,is_cover')
        .eq('vehicle_id', id!)
        .order('created_at', { ascending: true })
      const images = await Promise.all(
        (imgRows ?? []).map(async (im) => ({
          id: im.id,
          file_path: im.file_path,
          caption: im.caption,
          is_cover: im.is_cover,
          url: await vehicleImageUrl(im.file_path),
        }))
      )
      return { vehicle, observations, images }
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

  const { vehicle, observations, images } = query.data
  // Samma regel som i databasen (RLS) för att lägga till/ta bort foton:
  // fordonets skapare, eller admin.
  const canManagePhotos = isAdmin || (!!user && vehicle.created_by === user.id)
  // Visar det foto som är markerat som omslagsbild, annars det först tillagda.
  const coverImage = images.find((im) => im.is_cover) ?? images[0]

  async function handleDelete() {
    setDeleting(true)
    const { error } = await supabase.from('vehicles').delete().eq('id', id!)
    setDeleting(false)
    setConfirmOpen(false)
    if (error) {
      toast.error('Kunde inte ta bort fordonet. Ta först bort kopplade observationer.')
      return
    }
    // Databasraderna för fotona följer med automatiskt, men filerna i
    // lagringen måste tas bort separat – annars blir de kvar i onödan.
    await removeVehicleImageFiles(images.map((im) => im.file_path))
    toast.success('Fordonet har tagits bort.')
    qc.invalidateQueries({ queryKey: ['vehicles'] })
    navigate('/fordon')
  }

  async function addPhotos(files: FileList | null) {
    if (!files || !user) return
    const list = Array.from(files)
    const room = MAX_PHOTOS - images.length
    if (room <= 0) {
      toast.error(`Max ${MAX_PHOTOS} foton per fordon.`)
      return
    }
    const toUpload = list.slice(0, room)
    const skipped = list.length - toUpload.length
    setUploadingPhoto(true)
    let failed = 0
    for (const file of toUpload) {
      const { error } = await uploadVehicleImage(vehicle.id, file, '', user.id)
      if (error) failed++
    }
    setUploadingPhoto(false)
    qc.invalidateQueries({ queryKey: ['vehicle', id] })
    qc.invalidateQueries({ queryKey: ['vehicles'] })
    if (failed) toast.error(`${failed} foto${failed > 1 ? 'n' : ''} kunde inte laddas upp (fel filtyp?).`)
    else toast.success(toUpload.length > 1 ? 'Fotona har lagts till.' : 'Fotot har lagts till.')
    if (skipped) toast.error(`Max ${MAX_PHOTOS} foton per fordon – ${skipped} lades inte till.`)
  }

  async function removePhoto(imgId: string, filePath: string) {
    setRemovingPhotoId(imgId)
    await deleteVehicleImage(imgId, filePath)
    setRemovingPhotoId(null)
    qc.invalidateQueries({ queryKey: ['vehicle', id] })
    qc.invalidateQueries({ queryKey: ['vehicles'] })
  }

  async function setCover(imgId: string) {
    setSettingCoverId(imgId)
    try {
      await setVehicleCoverImage(imgId)
      qc.invalidateQueries({ queryKey: ['vehicle', id] })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
    } catch {
      toast.error('Kunde inte ändra omslagsbild.')
    } finally {
      setSettingCoverId(null)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4">
        <BackLink to="/fordon" label="Tillbaka till fordon" />
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {coverImage?.url && (
              <button type="button" onClick={() => setLightboxUrl(coverImage.url)} aria-label="Visa foto större">
                <img
                  src={coverImage.url}
                  alt=""
                  className="h-16 w-24 flex-shrink-0 rounded-lg border border-slate-200 object-cover"
                />
              </button>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-brand-800">{vehicle.registration_number}</h1>
              <p className="mt-1 text-slate-600">
                {[vehicle.make, vehicle.model, vehicle.color, vehicle.year_model ? String(vehicle.year_model) : null, vehicle.owner_name]
                  .filter(Boolean)
                  .join(' · ') || 'Inga fordonsdetaljer registrerade'}
              </p>
            </div>
          </div>
          <Badge color="blue">{observations.length} observationer</Badge>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Detail label="Märke" value={vehicle.make} />
          <Detail label="Modell" value={vehicle.model} />
          <Detail label="Färg" value={vehicle.color} />
          <Detail label="Fordonstyp" value={vehicle.vehicle_type} />
          <Detail label="Årsmodell" value={vehicle.year_model ? String(vehicle.year_model) : null} />
          <Detail label="Ägare" value={vehicle.owner_name} />
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

      {/* Foton */}
      <div className="mt-6">
        <h2 className="mb-2 font-semibold text-brand-800">Foton</h2>

        {canManagePhotos && (
          <label className="mb-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            {uploadingPhoto ? 'Laddar upp…' : '+ Lägg till foto'}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploadingPhoto}
              onChange={(e) => { addPhotos(e.target.files); e.target.value = '' }}
            />
          </label>
        )}

        {images.length === 0 ? (
          <p className="text-sm text-slate-400">Inga foton tillagda.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((im) => {
              const isCover = im.id === coverImage?.id
              return (
                <div key={im.id} className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                  {im.url && (
                    <button type="button" onClick={() => setLightboxUrl(im.url)} className="block w-full" aria-label="Visa foto större">
                      <img src={im.url} alt={im.caption ?? ''} className="aspect-[4/3] w-full object-cover" />
                    </button>
                  )}
                  {canManagePhotos && (
                    <>
                      <label className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-white/90 px-1.5 py-0.5 text-[11px] text-slate-600 shadow">
                        <input
                          type="checkbox"
                          checked={isCover}
                          disabled={isCover || settingCoverId === im.id}
                          onChange={() => setCover(im.id)}
                        />
                        Omslagsbild
                      </label>
                      <button
                        type="button"
                        onClick={() => removePhoto(im.id, im.file_path)}
                        disabled={removingPhotoId === im.id}
                        className="absolute right-1 top-1 rounded-full bg-white/90 px-1.5 py-0.5 text-xs text-slate-500 shadow hover:text-red-600"
                        aria-label="Ta bort foto"
                      >
                        ✕
                      </button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

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

      <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
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
  year_model: string
  owner_name: string
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
      year_model: vehicle.year_model != null ? String(vehicle.year_model) : '',
      owner_name: vehicle.owner_name ?? '',
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
        year_model: values.year_model ? Number(values.year_model) : null,
        owner_name: values.owner_name || null,
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
          <Field label="Årsmodell" htmlFor="e-year">
            <Input id="e-year" type="number" inputMode="numeric" {...register('year_model')} />
          </Field>
          <Field label="Ägare" htmlFor="e-owner">
            <Input id="e-owner" {...register('owner_name')} />
          </Field>
        </div>
        <Field label="Övrigt" htmlFor="e-notes">
          <Textarea id="e-notes" rows={2} {...register('notes')} />
        </Field>
      </div>
    </Modal>
  )
}
