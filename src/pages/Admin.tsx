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
  cn,
} from '../components/ui'
import { formatDateTime } from '../lib/format'
import { ANNOUNCEMENT_LEVELS, levelLabel, useAllAnnouncements } from '../lib/announcements'
import { publicAssetUrl, removePublicAsset, uploadPublicAsset, useSiteSettings, useSponsors } from '../lib/site'
import { Pagination } from './Logbook'
import type { AuditLog, Profile, Announcement, Sponsor } from '../types/database.types'

type Tab = 'medlemmar' | 'startsida' | 'driftinfo' | 'audit' | 'gdpr'

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
    { id: 'startsida', label: 'Startsida' },
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
      {tab === 'startsida' && <SiteTab />}
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

      {/* Desktop: tabell */}
      <Card className="hidden overflow-hidden md:block">
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

      {/* Mobil: kort */}
      <div className="space-y-2 md:hidden">
        {profiles.map((p) => {
          const isSelf = p.id === user?.id
          return (
            <Card key={p.id} className="p-4">
              <div className="flex items-center gap-3">
                <Avatar config={p.avatar} size={40} ring={memberColor(p)} title={p.name || p.email || ''} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-slate-800">{p.name || '(namn saknas)'}</div>
                  <div className="truncate text-xs text-slate-500">{p.email}</div>
                </div>
                <Badge color={p.active ? 'green' : 'red'}>{p.active ? 'Aktiv' : 'Inaktiv'}</Badge>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Select
                  value={p.role}
                  disabled={isSelf}
                  onChange={(e) => updateProfile(p.id, { role: e.target.value as Profile['role'] })}
                  className="flex-1"
                >
                  <option value="medlem">Medlem</option>
                  <option value="styrelse">Styrelse</option>
                  <option value="admin">Administratör</option>
                </Select>
                {!isSelf && (
                  <Button variant="secondary" onClick={() => updateProfile(p.id, { active: !p.active })}>
                    {p.active ? 'Inaktivera' : 'Aktivera'}
                  </Button>
                )}
              </div>
            </Card>
          )
        })}
      </div>

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
              <option value="styrelse">Styrelse</option>
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
    shifts: 'körpass',
    shift_bookings: 'passbokning',
    announcements: 'meddelande',
    documents: 'dokument',
    sponsors: 'sponsor',
    persons: 'person',
    observation_images: 'bild',
  }

  if (result.isLoading) return <LoadingState />

  const total = result.data?.count ?? 0
  const pages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      {/* Desktop: tabell */}
      <Card className="hidden overflow-hidden md:block">
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

      {/* Mobil: lista */}
      <div className="space-y-2 md:hidden">
        {result.data!.rows.map((a) => (
          <Card key={a.id} className="p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-slate-800">
                {actionLabel[a.action] ?? a.action} {tableLabel[a.table_name] ?? a.table_name}
              </span>
              <span className="shrink-0 text-xs text-slate-400">{formatDateTime(a.created_at)}</span>
            </div>
            <div className="mt-0.5 text-xs text-slate-500">{creatorName(map, a.user_id)}</div>
          </Card>
        ))}
      </div>
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
  orphan_persons: number
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
              <strong>{preview.orphan_vehicles}</strong>, personer utan observationer:{' '}
              <strong>{preview.orphan_persons}</strong>.
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

/* ---------------- Startsida & sponsorer ---------------- */
function SiteTab() {
  const toast = useToast()
  const qc = useQueryClient()
  const site = useSiteSettings()
  const sponsors = useSponsors(false)
  const [logoBusy, setLogoBusy] = useState(false)
  const [spName, setSpName] = useState('')
  const [spFile, setSpFile] = useState<File | null>(null)
  const [spBusy, setSpBusy] = useState(false)

  const { register, handleSubmit, reset, formState } = useForm<{ display_name: string; tagline: string; tip_phone: string }>()

  useEffect(() => {
    if (site.data) {
      reset({
        display_name: site.data.display_name ?? 'N-BV',
        tagline: site.data.tagline ?? '',
        tip_phone: site.data.tip_phone ?? '',
      })
    }
  }, [site.data, reset])

  async function saveSettings(v: { display_name: string; tagline: string; tip_phone: string }) {
    const { error } = await supabase
      .from('site_settings')
      .update({ display_name: v.display_name || 'N-BV', tagline: v.tagline || null, tip_phone: v.tip_phone || null })
      .eq('id', 1)
    if (error) return toast.error('Kunde inte spara.')
    qc.invalidateQueries({ queryKey: ['site_settings'] })
    toast.success('Startsidan har uppdaterats.')
  }

  async function onLogoChange(file: File | null) {
    if (!file) return
    setLogoBusy(true)
    const up = await uploadPublicAsset(file, 'logo')
    if (up.error || !up.path) {
      setLogoBusy(false)
      return toast.error(up.error ?? 'Kunde inte ladda upp loggan.')
    }
    const old = site.data?.logo_path
    const { error } = await supabase.from('site_settings').update({ logo_path: up.path }).eq('id', 1)
    setLogoBusy(false)
    if (error) return toast.error('Kunde inte spara loggan.')
    if (old) await removePublicAsset(old)
    qc.invalidateQueries({ queryKey: ['site_settings'] })
    toast.success('Loggan har uppdaterats.')
  }

  async function addSponsor() {
    if (!spName.trim() || !spFile) return toast.error('Ange namn och välj en logga.')
    setSpBusy(true)
    const up = await uploadPublicAsset(spFile, 'sponsors')
    if (up.error || !up.path) {
      setSpBusy(false)
      return toast.error(up.error ?? 'Kunde inte ladda upp.')
    }
    const { error } = await supabase.from('sponsors').insert({ name: spName.trim(), logo_path: up.path })
    setSpBusy(false)
    if (error) {
      await removePublicAsset(up.path)
      return toast.error('Kunde inte spara sponsorn.')
    }
    setSpName('')
    setSpFile(null)
    qc.invalidateQueries({ queryKey: ['sponsors'] })
    toast.success('Sponsorn har lagts till.')
  }

  async function toggleSponsor(s: Sponsor) {
    const { error } = await supabase.from('sponsors').update({ active: !s.active }).eq('id', s.id)
    if (error) return toast.error('Kunde inte uppdatera.')
    qc.invalidateQueries({ queryKey: ['sponsors'] })
  }

  async function removeSponsor(s: Sponsor) {
    const { error } = await supabase.from('sponsors').delete().eq('id', s.id)
    if (error) return toast.error('Kunde inte ta bort.')
    await removePublicAsset(s.logo_path)
    qc.invalidateQueries({ queryKey: ['sponsors'] })
    toast.success('Sponsorn har tagits bort.')
  }

  const logoUrl = publicAssetUrl(site.data?.logo_path)

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="font-semibold text-brand-800">Startsidans innehåll</h2>
        <p className="mt-1 text-sm text-slate-500">Visas publikt på inloggningssidan.</p>

        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
            {logoUrl ? <img src={logoUrl} alt="Logga" className="h-full w-full object-contain p-1" /> : <span className="text-xs text-slate-400">Ingen logga</span>}
          </div>
          <label className="cursor-pointer">
            <span className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
              {logoBusy ? 'Laddar upp…' : 'Byt logga'}
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onLogoChange(e.target.files?.[0] ?? null)} />
          </label>
        </div>

        <form onSubmit={handleSubmit(saveSettings)} className="mt-4 space-y-3">
          <Field label="Föreningsnamn" htmlFor="s-name">
            <Input id="s-name" {...register('display_name')} placeholder="N-BV" />
          </Field>
          <Field label="Undertext" htmlFor="s-tag">
            <Input id="s-tag" {...register('tagline')} placeholder="Tryggare tillsammans." />
          </Field>
          <Field label="Tipstelefon" htmlFor="s-tip" hint="Visas stort på inloggningssidan.">
            <Input id="s-tip" {...register('tip_phone')} placeholder="070-123 45 67" />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" loading={formState.isSubmitting}>Spara</Button>
          </div>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-brand-800">Sponsorer</h2>
        <p className="mt-1 text-sm text-slate-500">Logga + namn. Visas på inloggningssidan.</p>

        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <Field label="Namn" htmlFor="sp-name">
            <Input id="sp-name" value={spName} onChange={(e) => setSpName(e.target.value)} placeholder="Sponsorns namn" />
          </Field>
          <Field label="Logga" htmlFor="sp-file">
            <input id="sp-file" type="file" accept="image/*" onChange={(e) => setSpFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-2 file:text-sm" />
          </Field>
          <Button onClick={addSponsor} loading={spBusy}>Lägg till</Button>
        </div>

        {sponsors.isLoading ? (
          <LoadingState />
        ) : (sponsors.data?.length ?? 0) === 0 ? (
          <p className="mt-4 text-sm text-slate-400">Inga sponsorer ännu.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {sponsors.data!.map((s) => {
              const url = publicAssetUrl(s.logo_path)
              return (
                <div key={s.id} className={cn('rounded-lg border p-2 text-center', s.active ? 'border-slate-200' : 'border-slate-200 opacity-50')}>
                  {url ? <img src={url} alt={s.name} className="mx-auto h-12 w-full object-contain" /> : <div className="h-12" />}
                  <div className="mt-1 line-clamp-1 text-xs font-medium text-slate-700">{s.name}</div>
                  <div className="mt-1 flex justify-center gap-1">
                    <Button variant="ghost" onClick={() => toggleSponsor(s)}>{s.active ? 'Dölj' : 'Visa'}</Button>
                    <Button variant="ghost" onClick={() => removeSponsor(s)}>✕</Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
