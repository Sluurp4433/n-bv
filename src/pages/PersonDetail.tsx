import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { useProfiles, useSettings, creatorName, canEditOwn } from '../lib/hooks'
import { useToast } from '../components/Toast'
import { Modal, ConfirmDialog } from '../components/Modal'
import { ChipSelect, TagInput } from '../components/inputs'
import { personName } from '../lib/persons'
import { GENDERS, genderLabel } from '../lib/constants'
import { Badge, Button, Card, EmptyState, Field, Input, LoadingState, Textarea } from '../components/ui'
import { formatDateTime } from '../lib/format'
import type { Observation, Person, Vehicle } from '../types/database.types'

export function PersonDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const { user, isAdmin } = useAuth()
  const { map } = useProfiles()
  const { data: settings } = useSettings()
  const [editOpen, setEditOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const query = useQuery({
    queryKey: ['person', id],
    queryFn: async () => {
      const { data: person, error } = await supabase.from('persons').select('*').eq('id', id!).single()
      if (error) throw error
      const { data: obsLinks } = await supabase.from('observation_persons').select('observations(*)').eq('person_id', id!)
      const observations = (obsLinks ?? [])
        .map((l) => l.observations as unknown as Observation)
        .filter(Boolean)
        .sort((a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime())
      const { data: vehLinks } = await supabase.from('person_vehicles').select('vehicles(*)').eq('person_id', id!)
      const vehicles = (vehLinks ?? []).map((l) => l.vehicles as unknown as Vehicle).filter(Boolean)
      return { person, observations, vehicles }
    },
  })

  if (query.isLoading) return <LoadingState />
  if (query.isError || !query.data)
    return <EmptyState title="Personen hittades inte" action={<Link to="/personer"><Button variant="secondary">Till personlistan</Button></Link>} />

  const { person, observations, vehicles } = query.data
  const canManage = canEditOwn(person.created_by, person.created_at, user?.id, isAdmin, settings?.edit_window_hours)

  async function handleDelete() {
    setDeleting(true)
    const { error } = await supabase.from('persons').delete().eq('id', id!)
    setDeleting(false)
    setConfirmOpen(false)
    if (error) return toast.error('Kunde inte ta bort personen (kräver admin).')
    toast.success('Personen har tagits bort.')
    qc.invalidateQueries({ queryKey: ['persons'] })
    navigate('/personer')
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4">
        <Link to="/personer" className="text-sm text-brand-600 hover:underline">← Tillbaka till personer</Link>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-brand-800">{personName(person)}</h1>
          {person.gender && <Badge>{genderLabel(person.gender)}</Badge>}
        </div>
        {(person.aliases?.length ?? 0) > 0 && <p className="mt-1 text-sm text-slate-500">Även: {person.aliases.join(', ')}</p>}

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Detail label="Adress" value={person.address} />
          <Detail label="Ort" value={person.city} />
        </dl>
        {person.description && <Block label="Signalement" value={person.description} />}
        {person.connections && <Block label="Kopplingar" value={person.connections} />}
        {person.notes && <Block label="Övrigt" value={person.notes} />}

        <div className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-400">
          Tillagd av {creatorName(map, person.created_by)} · {formatDateTime(person.created_at)}
        </div>

        {(canManage || isAdmin) && (
          <div className="mt-5 flex gap-2">
            {canManage && <Button variant="secondary" onClick={() => setEditOpen(true)}>Redigera</Button>}
            {isAdmin && <Button variant="danger" onClick={() => setConfirmOpen(true)}>Ta bort</Button>}
          </div>
        )}
      </Card>

      {/* Relaterade fordon */}
      <div className="mt-6">
        <h2 className="mb-2 font-semibold text-brand-800">Relaterade fordon</h2>
        {vehicles.length === 0 ? (
          <p className="text-sm text-slate-400">Inga fordon kopplade.</p>
        ) : (
          <div className="space-y-2">
            {vehicles.map((v) => (
              <Link key={v.id} to={`/fordon/${v.id}`}>
                <Card className="flex items-center justify-between p-4 transition-shadow hover:shadow-md">
                  <div>
                    <div className="font-semibold text-brand-700">{v.registration_number}</div>
                    <div className="text-sm text-slate-500">{[v.make, v.model, v.color].filter(Boolean).join(' · ') || 'Inga detaljer'}</div>
                  </div>
                  <span className="text-slate-400">›</span>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Observationer */}
      <div className="mt-6">
        <h2 className="mb-2 font-semibold text-brand-800">Observationer</h2>
        {observations.length === 0 ? (
          <p className="text-sm text-slate-400">Inga observationer kopplade.</p>
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
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {canManage && (
        <PersonEditModal
          open={editOpen}
          person={person}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false)
            qc.invalidateQueries({ queryKey: ['person', id] })
            qc.invalidateQueries({ queryKey: ['persons'] })
            toast.success('Personen har uppdaterats.')
          }}
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Ta bort person"
        message="Vill du ta bort personen? Kopplingar till observationer och fordon tas bort."
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
function Block({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-slate-700">{label}</h3>
      <p className="mt-1 whitespace-pre-wrap text-slate-700">{value}</p>
    </div>
  )
}

function PersonEditModal({ open, person, onClose, onSaved }: { open: boolean; person: Person; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [firstName, setFirstName] = useState(person.first_name ?? '')
  const [lastName, setLastName] = useState(person.last_name ?? '')
  const [gender, setGender] = useState(person.gender ?? '')
  const [aliases, setAliases] = useState<string[]>(person.aliases ?? [])
  const [description, setDescription] = useState(person.description ?? '')
  const [address, setAddress] = useState(person.address ?? '')
  const [city, setCity] = useState(person.city ?? '')
  const [connections, setConnections] = useState(person.connections ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const { error } = await supabase
      .from('persons')
      .update({
        first_name: firstName || null,
        last_name: lastName || null,
        gender: gender || null,
        aliases,
        description: description || null,
        address: address || null,
        city: city || null,
        connections: connections || null,
      })
      .eq('id', person.id)
    setSaving(false)
    if (error) return toast.error('Kunde inte spara.')
    onSaved()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Redigera person"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Avbryt</Button>
          <Button onClick={save} loading={saving}>Spara</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Förnamn" htmlFor="e-fn"><Input id="e-fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></Field>
          <Field label="Efternamn" htmlFor="e-ln"><Input id="e-ln" value={lastName} onChange={(e) => setLastName(e.target.value)} /></Field>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Kön</p>
          <ChipSelect value={gender} onChange={setGender} options={GENDERS} />
        </div>
        <Field label="Andra namn / smeknamn" htmlFor="e-al"><TagInput value={aliases} onChange={setAliases} placeholder="Lägg till namn…" /></Field>
        <Field label="Signalement" htmlFor="e-desc"><Textarea id="e-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Adress" htmlFor="e-addr"><Input id="e-addr" value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
          <Field label="Ort" htmlFor="e-city"><Input id="e-city" value={city} onChange={(e) => setCity(e.target.value)} /></Field>
        </div>
        <Field label="Kopplingar" htmlFor="e-conn"><Textarea id="e-conn" rows={2} value={connections} onChange={(e) => setConnections(e.target.value)} /></Field>
      </div>
    </Modal>
  )
}
