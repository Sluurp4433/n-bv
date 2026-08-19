import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { useProfiles, creatorName } from '../lib/hooks'
import { Avatar } from '../components/Avatar'
import { memberColor } from '../lib/memberColor'
import { useToast } from '../components/Toast'
import { Modal } from '../components/Modal'
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  Input,
  LoadingState,
  PageHeader,
  Select,
  Textarea,
} from '../components/ui'
import { formatDateTime } from '../lib/format'
import { ANNOUNCEMENT_LEVELS, levelLabel, useAllAnnouncements } from '../lib/announcements'
import { Pagination } from './Logbook'
import type { AuditLog, Profile, Announcement } from '../types/database.types'

type Tab = 'medlemmar' | 'driftinfo' | 'audit' | 'gdpr'

async function invokeFunction<T>(
  name: string,
  body: Record<string, unknown>
): Promise<{ data?: T; error?: string }> {
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) {
    let msg = 'Något gick fel.'
    try {
      const j = await (error as any).context?.json()
      if (j?.error) msg = j.error
    } catch {
      /* ignore */
    }
    return { error: msg }
  }
  return { data: data as T }
}

export function Admin() {
  const [tab, setTab] = useState<Tab>('medlemmar')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'medlemmar', label: 'Medlemmar' },
    { id: 'driftinfo', label: 'Driftinfo' },
    { id: 'audit', label: 'Ändringslogg' },
    { id: 'gdpr', label: 'GDPR & gallring' },
  ]

  return (
    <div>
      <PageHeader title="Administration" description="Hantera medlemmar, historik och datalagring." />

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              'whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ' +
              (tab === t.id
                ? 'border-brand-700 text-brand-800'
                : 'border-transparent text-slate-500 hover:text-slate-700')
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'medlemmar' && <MembersTab />}
      {tab === 'driftinfo' && <AnnouncementsTab />}
      {tab === 'audit' && <AuditTab />}
      {tab === 'gdpr' && <GdprTab />}
    </div>
  )
}

/* ---------------- Medlemmar ---------------- */
function MembersTab() {
  const { user } = useAuth()
  const { profiles, isLoading, refetch } = useProfiles()
  const toast = useToast()
  const [createOpen, setCreateOpen] = useState(false)

  async function updateProfile(id: string, patch: Partial<Profile>) {
    const { error } = await supabase.from('profiles').update(patch).eq('id', id)
    if (error) {
      toast.error('Kunde inte uppdatera medlemmen.')
      return
    }
    toast.success('Medlemmen har uppdaterats.')
    refetch()
  }

  if (isLoading) return <LoadingState />

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>+ Ny medlem</Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Namn / e-post</th>
              <th className="px-4 py-3">Roll</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {profiles.map((p) => {
              const isSelf = p.id === user?.id
              return (
                <tr key={p.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar config={p.avatar} size={36} ring={memberColor(p)} title={p.name || p.email || ''} />
                      <div>
                        <div className="font-medium text-slate-800">{p.name || '(namn saknas)'}</div>
                        <div className="text-xs text-slate-500">{p.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={p.role}
                      disabled={isSelf}
                      onChange={(e) => updateProfile(p.id, { role: e.target.value as Profile['role'] })}
                      className="w-32"
                    >
                      <option value="medlem">Medlem</option>
                      <option value="styrelse">Styrelse</option>
                      <option value="admin">Administratör</option>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge color={p.active ? 'green' : 'red'}>{p.active ? 'Aktiv' : 'Inaktiv'}</Badge>
                      {!isSelf && (
                        <Button
                          variant="ghost"
                          onClick={() => updateProfile(p.id, { active: !p.active })}
                        >
                          {p.active ? 'Inaktivera' : 'Aktivera'}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      <p className="mt-3 text-xs text-slate-400">
        Du kan inte ändra din egen roll eller inaktivera ditt eget konto (för att undvika utelåsning).
      </p>

      <CreateMemberModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => refetch()} />
    </div>
  )
}

function CreateMemberModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const toast = useToast()
  const [result, setResult] = useState<{ email: string; tempPassword: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, reset, formState } = useForm<{
    email: string
    name: string
    role: string
  }>({ defaultValues: { role: 'medlem' } })

  async function onSubmit(values: { email: string; name: string; role: string }) {
    setError(null)
    const { data, error } = await invokeFunction<{ tempPassword: string; email: string }>(
      'admin-create-user',
      values
    )
    if (error || !data) {
      setError(error ?? 'Kunde inte skapa medlemmen.')
      return
    }
    setResult({ email: data.email, tempPassword: data.tempPassword })
    toast.success('Medlemmen har skapats.')
    onCreated()
  }

  function close() {
    setResult(null)
    setError(null)
    reset({ email: '', name: '', role: 'medlem' })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Ny medlem"
      footer={
        result ? (
          <Button onClick={close}>Klar</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close}>
              Avbryt
            </Button>
            <Button onClick={handleSubmit(onSubmit)} loading={formState.isSubmitting}>
              Skapa medlem
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="space-y-3">
          <Alert variant="success">Kontot för {result.email} har skapats.</Alert>
          <div>
            <p className="text-sm text-slate-600">
              Dela detta tillfälliga lösenord med medlemmen. Be dem logga in och byta lösenord under
              Min profil.
            </p>
            <div className="mt-2 rounded-lg bg-slate-100 px-3 py-2 font-mono text-sm text-slate-800">
              {result.tempPassword}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {error && <Alert variant="error">{error}</Alert>}
          <Field label="E-postadress" htmlFor="c-email">
            <Input id="c-email" type="email" {...register('email', { required: true })} />
          </Field>
          <Field label="Namn" htmlFor="c-name">
            <Input id="c-name" {...register('name')} />
          </Field>
          <Field label="Roll" htmlFor="c-role">
            <Select id="c-role" {...register('role')}>
              <option value="medlem">Medlem</option>
              <option value="admin">Administratör</option>
            </Select>
          </Field>
        </div>
      )}
    </Modal>
  )
}

/* ---------------- Ändringslogg ---------------- */
const PAGE_SIZE = 25

function AuditTab() {
  const { map } = useProfiles()
  const [page, setPage] = useState(0)

  const result = useQuery({
    queryKey: ['audit', page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
      if (error) throw error
      return { rows: (data ?? []) as AuditLog[], count: count ?? 0 }
    },
  })

  const actionLabel: Record<string, string> = {
    INSERT: 'Skapade',
    UPDATE: 'Ändrade',
    DELETE: 'Tog bort',
  }
  const tableLabel: Record<string, string> = {
    observations: 'observation',
    logbook_entries: 'loggboksinlägg',
    vehicles: 'fordon',
    profiles: 'medlem',
  }

  if (result.isLoading) return <LoadingState />

  const total = result.data?.count ?? 0
  const pages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Tidpunkt</th>
              <th className="px-4 py-3">Åtgärd</th>
              <th className="px-4 py-3">Av</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {result.data!.rows.map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                  {formatDateTime(a.created_at)}
                </td>
                <td className="px-4 py-3 text-slate-800">
                  {actionLabel[a.action] ?? a.action} {tableLabel[a.table_name] ?? a.table_name}
                </td>
                <td className="px-4 py-3 text-slate-600">{creatorName(map, a.user_id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {total === 0 && <p className="mt-4 text-center text-sm text-slate-400">Ingen historik ännu.</p>}
      {pages > 1 && <Pagination page={page} pages={pages} onChange={setPage} loading={result.isFetching} />}
    </div>
  )
}

/* ---------------- GDPR & gallring ---------------- */
type PurgeResult = {
  cutoff: string
  observations: number
  logbook: number
  orphan_vehicles: number
  dry_run: boolean
}

function GdprTab() {
  const toast = useToast()
  const qc = useQueryClient()
  const [preview, setPreview] = useState<PurgeResult | null>(null)

  const settings = useQuery({
    queryKey: ['app_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).single()
      if (error) throw error
      return data
    },
  })

  const { register, handleSubmit, reset, formState } = useForm<{
    retention_months: number
    edit_window_hours: number
  }>()

  useEffect(() => {
    if (settings.data) {
      reset({
        retention_months: settings.data.retention_months,
        edit_window_hours: settings.data.edit_window_hours,
      })
    }
  }, [settings.data, reset])

  async function saveSettings(values: { retention_months: number; edit_window_hours: number }) {
    const { error } = await supabase
      .from('app_settings')
      .update({
        retention_months: Number(values.retention_months),
        edit_window_hours: Number(values.edit_window_hours),
      })
      .eq('id', 1)
    if (error) {
      toast.error('Kunde inte spara inställningar.')
      return
    }
    toast.success('Inställningarna har sparats.')
    qc.invalidateQueries({ queryKey: ['app_settings'] })
  }

  const purge = useMutation({
    mutationFn: async (dryRun: boolean): Promise<PurgeResult> => {
      const { data, error } = await supabase.rpc('gdpr_purge', { dry_run: dryRun })
      if (error) throw error
      return data as unknown as PurgeResult
    },
    onSuccess: (data) => {
      setPreview(data)
      if (!data.dry_run) {
        toast.success('Gallringen har körts.')
        qc.invalidateQueries()
      }
    },
    onError: () => toast.error('Kunde inte köra gallringen.'),
  })

  if (settings.isLoading) return <LoadingState />

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h2 className="font-semibold text-brand-800">Lagringsregler</h2>
        <p className="mt-1 text-sm text-slate-500">
          Anpassa efter föreningens GDPR-rutiner. Gallringstiden styr hur gammal data som tas bort.
        </p>
        <form onSubmit={handleSubmit(saveSettings)} className="mt-4 space-y-4">
          <Field label="Gallringstid (månader)" htmlFor="retention" hint="Data äldre än så här gallras vid körning.">
            <Input id="retention" type="number" min={1} max={120} {...register('retention_months')} />
          </Field>
          <Field label="Redigeringsfönster (timmar)" htmlFor="editwin" hint="Hur länge en medlem får redigera sina egna inlägg.">
            <Input id="editwin" type="number" min={0} max={168} {...register('edit_window_hours')} />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" loading={formState.isSubmitting}>
              Spara inställningar
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-brand-800">Gallring</h2>
        <p className="mt-1 text-sm text-slate-500">
          Ta bort observationer och loggboksinlägg som är äldre än gallringstiden, samt fordon utan
          kvarvarande observationer.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => purge.mutate(true)} loading={purge.isPending}>
            Förhandsgranska
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm('Vill du köra gallringen? Data som gallras kan inte återställas.'))
                purge.mutate(false)
            }}
            loading={purge.isPending}
          >
            Kör gallring
          </Button>
        </div>

        {preview && (
          <div className="mt-4">
            <Alert variant={preview.dry_run ? 'info' : 'success'}>
              {preview.dry_run ? 'Förhandsgranskning: ' : 'Gallring klar. '}
              Observationer: <strong>{preview.observations}</strong>, loggbok:{' '}
              <strong>{preview.logbook}</strong>, fordon utan observationer:{' '}
              <strong>{preview.orphan_vehicles}</strong>.
              <div className="mt-1 text-xs opacity-80">Gräns: {formatDateTime(preview.cutoff)}</div>
            </Alert>
          </div>
        )}
      </Card>
    </div>
  )
}

/* ---------------- Driftinfo / meddelanden ---------------- */
function AnnouncementsTab() {
  const toast = useToast()
  const qc = useQueryClient()
  const q = useAllAnnouncements()
  const { register, handleSubmit, reset, formState } = useForm<{ title: string; body: string; level: string }>({
    defaultValues: { title: '', body: '', level: 'info' },
  })

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['announcements'] })
  }

  async function onCreate(v: { title: string; body: string; level: string }) {
    const { error } = await supabase.from('announcements').insert({
      title: v.title,
      body: v.body || null,
      level: v.level,
      active: true,
    })
    if (error) return toast.error('Kunde inte skapa meddelandet.')
    reset({ title: '', body: '', level: v.level })
    invalidate()
    toast.success('Meddelandet har publicerats.')
  }

  async function toggleActive(a: Announcement) {
    const { error } = await supabase.from('announcements').update({ active: !a.active }).eq('id', a.id)
    if (error) return toast.error('Kunde inte uppdatera.')
    invalidate()
  }

  async function remove(a: Announcement) {
    const { error } = await supabase.from('announcements').delete().eq('id', a.id)
    if (error) return toast.error('Kunde inte ta bort.')
    invalidate()
    toast.success('Meddelandet har tagits bort.')
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h2 className="font-semibold text-brand-800">Nytt meddelande</h2>
        <p className="mt-1 text-sm text-slate-500">Visas i driftinfo-rutan på startsidan för alla medlemmar.</p>
        <form onSubmit={handleSubmit(onCreate)} className="mt-4 space-y-3">
          <Field label="Rubrik" htmlFor="a-title">
            <Input id="a-title" {...register('title', { required: true })} />
          </Field>
          <Field label="Text" htmlFor="a-body">
            <Textarea id="a-body" rows={3} {...register('body')} />
          </Field>
          <Field label="Typ" htmlFor="a-level">
            <Select id="a-level" {...register('level')}>
              {ANNOUNCEMENT_LEVELS.map((l) => (<option key={l.value} value={l.value}>{l.label}</option>))}
            </Select>
          </Field>
          <div className="flex justify-end">
            <Button type="submit" loading={formState.isSubmitting}>Publicera</Button>
          </div>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-semibold text-brand-800">Publicerade meddelanden</h2>
        {q.isLoading ? (
          <LoadingState />
        ) : (q.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-slate-400">Inga meddelanden ännu.</p>
        ) : (
          <div className="space-y-2">
            {q.data!.map((a) => (
              <div key={a.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{a.title}</span>
                      <Badge color={a.level === 'critical' ? 'red' : a.level === 'warning' ? 'amber' : 'blue'}>{levelLabel(a.level)}</Badge>
                      <Badge color={a.active ? 'green' : 'slate'}>{a.active ? 'Aktiv' : 'Dold'}</Badge>
                    </div>
                    {a.body && <p className="mt-1 text-sm text-slate-600">{a.body}</p>}
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button variant="ghost" onClick={() => toggleActive(a)}>{a.active ? 'Dölj' : 'Visa'}</Button>
                  <Button variant="ghost" onClick={() => remove(a)}>Ta bort</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
