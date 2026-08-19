import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { useToast } from './Toast'
import { Modal } from './Modal'
import { MemberPicker } from './MemberPicker'
import { Button, Field, Input, Textarea, Alert } from './ui'
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

  const { register, handleSubmit, setError, reset, formState } = useForm<FormValues>({
    defaultValues: {
      starts_at: times.start,
      ends_at: times.end,
      capacity: 2,
      title: '',
      location: '',
      notes: '',
      bookSelf: true,
    },
  })

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
