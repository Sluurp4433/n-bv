import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { useToast } from './Toast'
import { Modal } from './Modal'
import { MemberPicker } from './MemberPicker'
import { Button, Field, Input, Textarea, Alert, cn } from './ui'
import { createShift, bookShift } from '../lib/shifts'
import { toDatetimeLocal } from '../lib/format'

type FormValues = {
  starts_at: string
  ends_at: string
  capacity: number
  title: string
  location: string
  notes: string
  bookSelf: boolean
  usesGuardCar: boolean
}

function defaultTimes(day?: Date) {
  const base = day ? new Date(day) : new Date()
  base.setHours(18, 0, 0, 0)
  const end = new Date(base)
  end.setHours(20, 0, 0, 0)
  return { start: toDatetimeLocal(base), end: toDatetimeLocal(end) }
}

export function ShiftForm({
  open,
  onClose,
  onCreated,
  day,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
  day?: Date
}) {
  const { user } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()
  const times = defaultTimes(day)
  const [others, setOthers] = useState<string[]>([])

  const { register, handleSubmit, setError, reset, watch, setValue, formState } = useForm<FormValues>({
    defaultValues: {
      starts_at: times.start,
      ends_at: times.end,
      capacity: 2,
      title: '',
      location: '',
      notes: '',
      bookSelf: true,
      usesGuardCar: true,
    },
  })
  const usesGuardCar = watch('usesGuardCar')

  async function onSubmit(values: FormValues) {
    if (new Date(values.ends_at) <= new Date(values.starts_at)) {
      setError('ends_at', { message: 'Sluttiden måste vara efter starttiden' })
      return
    }
    if (!user) return
    const needed = (values.bookSelf ? 1 : 0) + others.length
    if (needed > Number(values.capacity)) {
      setError('root', { message: `Antalet inbokade (${needed}) överstiger antal platser (${values.capacity}). Öka platserna eller ta bort medlemmar.` })
      return
    }
    const res = await createShift(
      {
        starts_at: new Date(values.starts_at).toISOString(),
        ends_at: new Date(values.ends_at).toISOString(),
        capacity: Number(values.capacity),
        title: values.title || null,
        location: values.location || null,
        notes: values.notes || null,
        uses_guard_car: values.usesGuardCar,
      },
      values.bookSelf,
      user.id
    )
    if (res.error || !res.id) {
      setError('root', { message: res.error ?? 'Kunde inte skapa passet.' })
      return
    }
    // Boka in övriga valda medlemmar (skaparen får boka andra)
    let failed = 0
    for (const id of others) {
      const r = await bookShift(res.id, id)
      if (r.error) failed++
    }
    qc.invalidateQueries({ queryKey: ['shifts'] })
    toast.success(failed > 0 ? `Passet skapades, men ${failed} medlem(mar) kunde inte bokas.` : 'Körpasset har skapats.')
    reset()
    setOthers([])
    onCreated()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nytt körpass"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Avbryt
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={formState.isSubmitting}>
            Skapa pass
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {formState.errors.root && <Alert variant="error">{formState.errors.root.message}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start" htmlFor="s-start" error={formState.errors.starts_at?.message}>
            <Input id="s-start" type="datetime-local" {...register('starts_at', { required: true })} />
          </Field>
          <Field label="Slut" htmlFor="s-end" error={formState.errors.ends_at?.message}>
            <Input id="s-end" type="datetime-local" {...register('ends_at', { required: true })} />
          </Field>
        </div>
        <Field label="Antal platser" htmlFor="s-cap" hint="Hur många medlemmar som kan boka passet.">
          <Input id="s-cap" type="number" min={1} max={20} {...register('capacity', { valueAsNumber: true })} />
        </Field>
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Bil</p>
          <button
            type="button"
            onClick={() => setValue('usesGuardCar', !usesGuardCar)}
            aria-pressed={usesGuardCar}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors sm:w-auto',
              usesGuardCar ? 'border-red-300 bg-red-50 text-red-800' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
            )}
          >
            <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: usesGuardCar ? '#ef4444' : '#cbd5e1' }} />
            🚗 Vaktbilen{usesGuardCar ? ' – vald' : ''}
          </button>
          <p className="mt-1 text-xs text-slate-500">Vald som standard. Markera bort om du kör egen bil. Passet blir ljusrött i kalendern när vaktbilen används.</p>
        </div>
        <Field label="Rubrik (valfritt)" htmlFor="s-title">
          <Input id="s-title" {...register('title')} placeholder="T.ex. Kvällspatrull" />
        </Field>
        <Field label="Plats (valfritt)" htmlFor="s-loc">
          <Input id="s-loc" {...register('location')} placeholder="Område/rutt" />
        </Field>
        <Field label="Anteckning (valfritt)" htmlFor="s-notes">
          <Textarea id="s-notes" rows={2} {...register('notes')} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" className="h-4 w-4" {...register('bookSelf')} />
          Boka in mig direkt på passet
        </label>
        <MemberPicker
          value={others}
          onChange={setOthers}
          exclude={user ? [user.id] : []}
          label="Boka in andra medlemmar (valfritt)"
        />
      </div>
    </Modal>
  )
}
