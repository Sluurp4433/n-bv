import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { useProfiles, creatorName } from '../lib/hooks'
import { supabase } from '../lib/supabase'
import { useShift, bookShift, unbookShift } from '../lib/shifts'
import { useToast } from '../components/Toast'
import { Modal, ConfirmDialog } from '../components/Modal'
import { Avatar } from '../components/Avatar'
import { memberColor } from '../lib/memberColor'
import { Badge, Button, Card, EmptyState, Field, Input, LoadingState, Select, Textarea, cn } from '../components/ui'
import { formatDate, formatTime, toDatetimeLocal } from '../lib/format'

export function ShiftDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const { user, isAdmin } = useAuth()
  const { profiles, map } = useProfiles()

  const shiftQuery = useShift(id)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['shift', id] })
    qc.invalidateQueries({ queryKey: ['shifts'] })
  }

  if (shiftQuery.isLoading) return <LoadingState />
  if (shiftQuery.isError || !shiftQuery.data)
    return (
      <EmptyState
        title="Passet hittades inte"
        action={
          <Link to="/kalender">
            <Button variant="secondary">Till kalendern</Button>
          </Link>
        }
      />
    )

  const shift = shiftQuery.data
  const mine = !!user && shift.bookings.includes(user.id)
  const full = shift.bookings.length >= shift.capacity
  const free = shift.capacity - shift.bookings.length
  const canManage = isAdmin || shift.created_by === user?.id
  const booked = shift.bookings.map((uid) => map[uid]).filter(Boolean)

  async function handleBook() {
    if (!user) return
    setBusy(true)
    const res = await bookShift(id!, user.id)
    setBusy(false)
    if (res.error) return toast.error(res.error)
    toast.success('Du är nu bokad på passet.')
    invalidate()
  }

  async function handleUnbook(targetUserId: string) {
    setBusy(true)
    const res = await unbookShift(id!, targetUserId)
    setBusy(false)
    if (res.error) return toast.error(res.error)
    toast.success(targetUserId === user?.id ? 'Du har avbokat passet.' : 'Medlemmen har avbokats.')
    invalidate()
  }

  async function handleAddMember(memberId: string) {
    if (!memberId) return
    setBusy(true)
    const res = await bookShift(id!, memberId)
    setBusy(false)
    if (res.error) return toast.error(res.error)
    toast.success('Medlemmen har bokats in.')
    invalidate()
  }

  async function handleDelete() {
    setBusy(true)
    const { error } = await supabase.from('shifts').delete().eq('id', id!)
    setBusy(false)
    setConfirmDelete(false)
    if (error) return toast.error('Kunde inte ta bort passet.')
    toast.success('Passet har tagits bort.')
    qc.invalidateQueries({ queryKey: ['shifts'] })
    navigate('/kalender')
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4">
        <Link to="/kalender" className="text-sm text-brand-600 hover:underline">
          ← Tillbaka till kalendern
        </Link>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-brand-800">{shift.title || 'Körpass'}</h1>
          {full ? <Badge color="slate">Fullbokat</Badge> : <Badge color="green">{shift.capacity - shift.bookings.length} lediga</Badge>}
          {shift.uses_guard_car && <Badge color="red">🚗 Vaktbilen</Badge>}
        </div>
        <p className="mt-2 text-slate-600">
          {formatDate(shift.starts_at)} · {formatTime(shift.starts_at)}–{formatTime(shift.ends_at)}
        </p>
        {shift.location && <p className="mt-1 text-sm text-slate-500">Plats: {shift.location}</p>}
        {shift.notes && <p className="mt-3 whitespace-pre-wrap text-slate-700">{shift.notes}</p>}

        <div className="mt-4 text-xs text-slate-400">
          Skapat av {creatorName(map, shift.created_by)} · {shift.bookings.length}/{shift.capacity} platser bokade
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {mine ? (
            <Button variant="secondary" onClick={() => handleUnbook(user!.id)} loading={busy}>
              Avboka mig
            </Button>
          ) : full ? (
            <Button disabled>Fullbokat</Button>
          ) : (
            <Button onClick={handleBook} loading={busy}>
              Boka pass
            </Button>
          )}
          {canManage && (
            <>
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                Redigera
              </Button>
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Ta bort
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Bokade medlemmar */}
      <div className="mt-6">
        <h2 className="mb-2 font-semibold text-brand-800">Bokade medlemmar</h2>
        {booked.length === 0 ? (
          <p className="text-sm text-slate-400">Ingen har bokat passet ännu.</p>
        ) : (
          <div className="space-y-2">
            {booked.map((p) => (
              <Card key={p.id} className="flex items-center gap-3 p-3">
                <Avatar config={p.avatar} size={44} ring={memberColor(p)} title={p.name || p.email || ''} />
                <div className="flex-1">
                  <div className="font-medium text-slate-800">
                    {p.name || p.email} {p.id === user?.id && <span className="text-brand-600">(du)</span>}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: memberColor(p) }} />
                    Personlig färg
                  </div>
                </div>
                {canManage && p.id !== user?.id && (
                  <Button variant="ghost" onClick={() => handleUnbook(p.id)} disabled={busy}>
                    Ta bort
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}

        {canManage && free > 0 && (
          <div className="mt-3">
            <Select
              value=""
              onChange={(e) => handleAddMember(e.target.value)}
              disabled={busy}
              aria-label="Lägg till medlem"
            >
              <option value="">+ Lägg till medlem…</option>
              {profiles
                .filter((p) => p.active && !shift.bookings.includes(p.id))
                .map((p) => (
                  <option key={p.id} value={p.id}>{p.name || p.email}</option>
                ))}
            </Select>
          </div>
        )}
      </div>

      {canManage && (
        <EditShiftModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false)
            invalidate()
            toast.success('Passet har uppdaterats.')
          }}
          shift={shift}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Ta bort körpass"
        message="Vill du ta bort passet? Alla bokningar på passet tas också bort."
        confirmLabel="Ta bort"
        danger
        loading={busy}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

type EditValues = { starts_at: string; ends_at: string; capacity: number; title: string; location: string; notes: string; usesGuardCar: boolean }

function EditShiftModal({
  open,
  onClose,
  onSaved,
  shift,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  shift: { id: string; starts_at: string; ends_at: string; capacity: number; title: string | null; location: string | null; notes: string | null; uses_guard_car: boolean }
}) {
  const toast = useToast()
  const { register, handleSubmit, setError, watch, setValue, formState } = useForm<EditValues>({
    defaultValues: {
      starts_at: toDatetimeLocal(shift.starts_at),
      ends_at: toDatetimeLocal(shift.ends_at),
      capacity: shift.capacity,
      title: shift.title ?? '',
      location: shift.location ?? '',
      notes: shift.notes ?? '',
      usesGuardCar: shift.uses_guard_car,
    },
  })
  const usesGuardCar = watch('usesGuardCar')

  async function onSubmit(v: EditValues) {
    if (new Date(v.ends_at) <= new Date(v.starts_at)) {
      setError('ends_at', { message: 'Sluttiden måste vara efter starttiden' })
      return
    }
    const { error } = await supabase
      .from('shifts')
      .update({
        starts_at: new Date(v.starts_at).toISOString(),
        ends_at: new Date(v.ends_at).toISOString(),
        capacity: Number(v.capacity),
        title: v.title || null,
        location: v.location || null,
        notes: v.notes || null,
        uses_guard_car: v.usesGuardCar,
      })
      .eq('id', shift.id)
    if (error) {
      toast.error('Kunde inte spara. Du kan bara redigera egna pass inom tillåten tid.')
      return
    }
    onSaved()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Redigera pass"
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start" htmlFor="e-start" error={formState.errors.starts_at?.message}>
            <Input id="e-start" type="datetime-local" {...register('starts_at')} />
          </Field>
          <Field label="Slut" htmlFor="e-end" error={formState.errors.ends_at?.message}>
            <Input id="e-end" type="datetime-local" {...register('ends_at')} />
          </Field>
        </div>
        <Field label="Antal platser" htmlFor="e-cap">
          <Input id="e-cap" type="number" min={1} max={20} {...register('capacity', { valueAsNumber: true })} />
        </Field>
        <button
          type="button"
          onClick={() => setValue('usesGuardCar', !usesGuardCar)}
          aria-pressed={usesGuardCar}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-colors',
            usesGuardCar ? 'border-red-300 bg-red-50 text-red-800' : 'border-slate-300 bg-white text-slate-600'
          )}
        >
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: usesGuardCar ? '#ef4444' : '#cbd5e1' }} />
          🚗 Vaktbilen{usesGuardCar ? ' – vald' : ''}
        </button>
        <Field label="Rubrik" htmlFor="e-title">
          <Input id="e-title" {...register('title')} />
        </Field>
        <Field label="Plats" htmlFor="e-loc">
          <Input id="e-loc" {...register('location')} />
        </Field>
        <Field label="Anteckning" htmlFor="e-notes">
          <Textarea id="e-notes" rows={2} {...register('notes')} />
        </Field>
      </div>
    </Modal>
  )
}
