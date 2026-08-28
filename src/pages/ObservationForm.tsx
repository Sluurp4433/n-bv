import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { useToast } from '../components/Toast'
import {
  clearVehicleLinks,
  deleteObservationImage,
  linkVehicle,
  observationImageUrl,
  uploadObservationImage,
  upsertVehicle,
} from '../lib/observations'
import { clearPersonLinks, createPerson, linkPersonObservation, linkPersonVehicle, personHasData, personName } from '../lib/persons'
import { OBSERVATION_CATEGORIES, OBSERVATION_TYPES, PRIORITIES, VEHICLE_TYPES, GENDERS } from '../lib/constants'
import { toDatetimeLocal, normalizeRegnr } from '../lib/format'
import { Alert, Button, Card, Field, Input, LoadingState, Textarea } from '../components/ui'
import { ChipSelect, TagInput } from '../components/inputs'

const strOpts = (arr: readonly string[]) => arr.map((v) => ({ value: v, label: v }))

type NewImage = { file: File; caption: string; url: string }
type ExistingImage = { id: string; file_path: string; caption: string | null; url: string | null }

type VehicleDraft = { regnr: string; make: string; model: string; color: string; vehicleType: string; yearModel: string }

type NewPersonDraft = {
  kind: 'new'
  firstName: string
  lastName: string
  gender: string
  aliases: string[]
  signalement: string
  address: string
  city: string
  connections: string
  personRegnrs: string[]
}
type ExistingPersonDraft = { kind: 'existing'; id: string; name: string }
type PersonDraft = NewPersonDraft | ExistingPersonDraft

function personDraftLabel(p: PersonDraft): string {
  if (p.kind === 'existing') return p.name
  return [p.firstName, p.lastName].filter(Boolean).join(' ') || p.aliases[0] || 'Ny person'
}

export function ObservationForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const { user } = useAuth()

  // Händelse
  const [observedAt, setObservedAt] = useState(toDatetimeLocal(new Date()))
  const [showTime, setShowTime] = useState(false)
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [type, setType] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState('lag')
  const [notes, setNotes] = useState('')

  // Fordon — lista + inmatningsformulär för ett i taget
  const [vehicles, setVehicles] = useState<VehicleDraft[]>([])
  const [vehicleOpen, setVehicleOpen] = useState(false)
  const [regnr, setRegnr] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [color, setColor] = useState('')
  const [vehicleType, setVehicleType] = useState('')
  const [yearModel, setYearModel] = useState('')

  // Personer — lista (befintliga via sök + nya via formulär, en i taget)
  const [personDrafts, setPersonDrafts] = useState<PersonDraft[]>([])
  const [personQuery, setPersonQuery] = useState('')
  const [personResults, setPersonResults] = useState<{ id: string; name: string }[]>([])
  const [personOpen, setPersonOpen] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [gender, setGender] = useState('')
  const [aliases, setAliases] = useState<string[]>([])
  const [signalement, setSignalement] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [connections, setConnections] = useState('')
  const [personRegnrs, setPersonRegnrs] = useState<string[]>([])

  // Bilder
  const [newImages, setNewImages] = useState<NewImage[]>([])
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([])

  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const existing = useQuery({
    queryKey: ['observation-edit', id],
    enabled: isEdit,
    queryFn: async () => {
      const { data: obs, error } = await supabase.from('observations').select('*').eq('id', id!).single()
      if (error) throw error
      const { data: vlinks } = await supabase
        .from('observation_vehicles')
        .select('vehicles(*)')
        .eq('observation_id', id!)
      const { data: plinks } = await supabase
        .from('observation_persons')
        .select('persons(id,first_name,last_name,aliases)')
        .eq('observation_id', id!)
      const { data: imgs } = await supabase
        .from('observation_images')
        .select('id,file_path,caption')
        .eq('observation_id', id!)
      return {
        obs,
        vehicles: (vlinks ?? []).map((l) => l.vehicles as any).filter(Boolean),
        persons: (plinks ?? []).map((l) => l.persons as any).filter(Boolean),
        images: imgs ?? [],
      }
    },
  })

  useEffect(() => {
    if (!existing.data) return
    const { obs, vehicles: linkedVehicles, persons: linkedPersons, images } = existing.data
    setObservedAt(toDatetimeLocal(obs.observed_at))
    setDescription(obs.description ?? '')
    setLocation(obs.location ?? '')
    setType(obs.type ?? '')
    setCategory(obs.category ?? '')
    setPriority(obs.priority ?? 'normal')
    setNotes(obs.notes ?? '')
    setVehicles(
      linkedVehicles.map((v: any) => ({
        regnr: v.registration_number ?? '',
        make: v.make ?? '',
        model: v.model ?? '',
        color: v.color ?? '',
        vehicleType: v.vehicle_type ?? '',
        yearModel: v.year_model != null ? String(v.year_model) : '',
      }))
    )
    setPersonDrafts(linkedPersons.map((p: any) => ({ kind: 'existing' as const, id: p.id, name: personName(p) })))
    ;(async () => {
      const resolved: ExistingImage[] = await Promise.all(
        (images as any[]).map(async (im) => ({ id: im.id, file_path: im.file_path, caption: im.caption, url: await observationImageUrl(im.file_path) }))
      )
      setExistingImages(resolved)
    })()
  }, [existing.data])

  // Sök befintliga personer medan man skriver (min 2 tecken, liten fördröjning).
  useEffect(() => {
    const q = personQuery.trim()
    if (q.length < 2) {
      setPersonResults([])
      return
    }
    let active = true
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('persons')
        .select('id, first_name, last_name, aliases')
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
        .limit(8)
      if (active) setPersonResults((data ?? []).map((p) => ({ id: p.id, name: personName(p) })))
    }, 250)
    return () => {
      active = false
      clearTimeout(t)
    }
  }, [personQuery])

  function addImages(files: FileList | null) {
    if (!files) return
    const additions: NewImage[] = []
    for (const f of Array.from(files)) {
      if (newImages.length + additions.length >= 8) break
      additions.push({ file: f, caption: '', url: URL.createObjectURL(f) })
    }
    setNewImages((prev) => [...prev, ...additions])
  }

  async function removeExistingImage(img: ExistingImage) {
    await deleteObservationImage(img.id, img.file_path)
    setExistingImages((prev) => prev.filter((x) => x.id !== img.id))
  }

  // ---- Fordon: lägg till/ta bort i listan ----
  function resetVehicleFields() {
    setRegnr('')
    setMake('')
    setModel('')
    setColor('')
    setVehicleType('')
    setYearModel('')
  }
  function currentVehicleDraft(): VehicleDraft | null {
    return regnr.trim() ? { regnr, make, model, color, vehicleType, yearModel } : null
  }
  function addVehicleToList() {
    const d = currentVehicleDraft()
    if (!d) return
    setVehicles((v) => [...v, d])
    resetVehicleFields()
  }
  function removeVehicleFromList(i: number) {
    setVehicles((v) => v.filter((_, j) => j !== i))
  }

  // ---- Personer: lägg till/ta bort i listan ----
  function resetPersonFields() {
    setFirstName('')
    setLastName('')
    setGender('')
    setAliases([])
    setSignalement('')
    setAddress('')
    setCity('')
    setConnections('')
    setPersonRegnrs([])
  }
  function currentNewPersonDraft(): NewPersonDraft | null {
    if (!personHasData({ first_name: firstName, last_name: lastName, aliases })) return null
    return { kind: 'new', firstName, lastName, gender, aliases, signalement, address, city, connections, personRegnrs }
  }
  function addNewPersonToList() {
    const d = currentNewPersonDraft()
    if (!d) return
    setPersonDrafts((p) => [...p, d])
    resetPersonFields()
  }
  function addExistingPersonToList(pid: string, name: string) {
    if (personDrafts.some((p) => p.kind === 'existing' && p.id === pid)) return
    setPersonDrafts((p) => [...p, { kind: 'existing', id: pid, name }])
    setPersonQuery('')
    setPersonResults([])
  }
  function removePersonFromList(i: number) {
    setPersonDrafts((p) => p.filter((_, j) => j !== i))
  }

  async function onSubmit() {
    setError(null)
    const pendingVehicle = currentVehicleDraft()
    const pendingPerson = currentNewPersonDraft()
    const allVehicles = [...vehicles, ...(pendingVehicle ? [pendingVehicle] : [])]
    const allPersons: PersonDraft[] = [...personDrafts, ...(pendingPerson ? [pendingPerson] : [])]

    if (!description.trim() && allVehicles.length === 0 && allPersons.length === 0 && newImages.length === 0) {
      setError('Skriv en kort beskrivning (eller lägg till fordon/person/bild).')
      return
    }
    if (!user) return
    setSaving(true)
    try {
      const payload = {
        observed_at: new Date(observedAt).toISOString(),
        location: location || null,
        type: type || null,
        category: category || null,
        description: description || null,
        priority: priority || 'normal',
        notes: notes || null,
      }

      let obsId = id
      if (isEdit) {
        const { error: e } = await supabase.from('observations').update(payload).eq('id', id!)
        if (e) throw e
        await clearVehicleLinks(id!)
        await clearPersonLinks(id!)
      } else {
        const { data, error: e } = await supabase.from('observations').insert(payload).select('id').single()
        if (e || !data) throw e ?? new Error('insert failed')
        obsId = data.id
      }
      if (!obsId) throw new Error('no id')

      // Fordon
      for (const v of allVehicles) {
        const vehicleId = await upsertVehicle({
          registration_number: v.regnr,
          make: v.make,
          model: v.model,
          color: v.color,
          vehicle_type: v.vehicleType,
          year_model: v.yearModel ? Number(v.yearModel) : null,
        })
        if (vehicleId) await linkVehicle(obsId, vehicleId)
      }

      // Personer (+ ev. fordon kopplade till nya personer)
      for (const p of allPersons) {
        const personId = p.kind === 'existing' ? p.id : await createPerson({
          first_name: p.firstName,
          last_name: p.lastName,
          gender: p.gender,
          aliases: p.aliases,
          description: p.signalement,
          address: p.address,
          city: p.city,
          connections: p.connections,
        })
        if (!personId) continue
        await linkPersonObservation(obsId, personId)
        if (p.kind === 'new') {
          for (const r of p.personRegnrs) {
            const vId = await upsertVehicle({ registration_number: r })
            if (vId) {
              await linkVehicle(obsId, vId)
              await linkPersonVehicle(personId, vId)
            }
          }
        }
      }

      // Bilder
      for (const img of newImages) {
        await uploadObservationImage(obsId, img.file, img.caption, user.id)
      }

      qc.invalidateQueries({ queryKey: ['observations'] })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      qc.invalidateQueries({ queryKey: ['persons'] })
      toast.success(isEdit ? 'Observationen har uppdaterats.' : 'Observationen har sparats.')
      navigate(`/observation/${obsId}`)
    } catch {
      setError('Kunde inte spara. Kontrollera uppgifterna och försök igen.')
    } finally {
      setSaving(false)
    }
  }

  if (isEdit && existing.isLoading) return <LoadingState />

  const visiblePersonResults = personResults.filter((r) => !personDrafts.some((p) => p.kind === 'existing' && p.id === r.id))

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4">
        <button onClick={() => navigate(-1)} className="text-sm text-brand-600 hover:underline">← Tillbaka</button>
      </div>
      <h1 className="mb-1 text-2xl font-bold text-brand-800">{isEdit ? 'Redigera observation' : 'Ny observation'}</h1>
      <p className="mb-4 text-sm text-slate-500">Skriv en kort beskrivning – lägg till fordon, person och bild vid behov.</p>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="mt-4 space-y-4">
        {/* Snabb registrering */}
        <Card className="p-5">
          <Field label="Vad hände?" htmlFor="description">
            <Textarea id="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Beskriv observationen…" autoFocus={!isEdit} />
          </Field>

          <div className="mt-4">
            <Field label="Plats" htmlFor="location">
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Gata, område" />
            </Field>
          </div>

          <div className="mt-4">
            <p className="mb-1.5 text-sm font-medium text-slate-700">Typ</p>
            <ChipSelect value={type} onChange={setType} options={strOpts(OBSERVATION_TYPES)} />
          </div>

          <div className="mt-4">
            <p className="mb-1.5 text-sm font-medium text-slate-700">Prioritet</p>
            <ChipSelect value={priority} onChange={setPriority} options={PRIORITIES} allowClear={false} />
          </div>

          <div className="mt-4">
            <p className="mb-1.5 text-sm font-medium text-slate-700">Kategori</p>
            <ChipSelect value={category} onChange={setCategory} options={strOpts(OBSERVATION_CATEGORIES)} />
          </div>

          <div className="mt-4">
            {showTime ? (
              <Field label="Datum och tid" htmlFor="observed_at">
                <Input id="observed_at" type="datetime-local" value={observedAt} onChange={(e) => setObservedAt(e.target.value)} />
              </Field>
            ) : (
              <button type="button" onClick={() => setShowTime(true)} className="text-sm text-brand-600 hover:underline">
                Ändra tid (nu som standard)
              </button>
            )}
          </div>
        </Card>

        {/* Bilder */}
        <Card className="p-5">
          <h2 className="mb-1 font-semibold text-brand-800">Bilder</h2>
          <p className="mb-3 text-sm text-slate-500">Lägg till foton. Bildtexten blir sökbar.</p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {existingImages.map((img) => (
              <div key={img.id} className="rounded-lg border border-slate-200 p-2">
                {img.url ? <img src={img.url} alt={img.caption ?? ''} className="h-24 w-full rounded object-cover" /> : <div className="h-24 rounded bg-slate-100" />}
                <div className="mt-1 truncate text-xs text-slate-500">{img.caption}</div>
                <button type="button" onClick={() => removeExistingImage(img)} className="mt-1 text-xs text-red-600 hover:underline">Ta bort</button>
              </div>
            ))}
            {newImages.map((img, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-2">
                <img src={img.url} alt="" className="h-24 w-full rounded object-cover" />
                <Input
                  className="mt-1 text-xs"
                  placeholder="Bildtext"
                  value={img.caption}
                  onChange={(e) => setNewImages((prev) => prev.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))}
                />
                <button type="button" onClick={() => setNewImages((prev) => prev.filter((_, j) => j !== i))} className="mt-1 text-xs text-red-600 hover:underline">Ta bort</button>
              </div>
            ))}
          </div>

          {newImages.length + existingImages.length < 8 && (
            <label className="mt-3 inline-block cursor-pointer">
              <span className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">📷 Lägg till bild</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addImages(e.target.files); e.target.value = '' }} />
            </label>
          )}
        </Card>

        {/* Fordon */}
        <Card className="p-5">
          <h2 className="mb-2 font-semibold text-brand-800">Fordon</h2>
          {vehicles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {vehicles.map((v, i) => (
                <span key={i} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white py-1 pl-3 pr-1.5 text-sm">
                  <span className="font-medium text-brand-700">{v.regnr}</span>
                  {(v.make || v.model) && <span className="text-slate-500">{[v.make, v.model].filter(Boolean).join(' ')}</span>}
                  <button type="button" onClick={() => removeVehicleFromList(i)} className="rounded-full p-0.5 text-slate-400 hover:text-red-600" aria-label="Ta bort fordon">✕</button>
                </span>
              ))}
            </div>
          )}
          {!vehicleOpen ? (
            <button type="button" onClick={() => setVehicleOpen(true)} className="font-medium text-brand-700 hover:underline">+ Lägg till fordon</button>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-600">Nytt fordon</h3>
                <button type="button" onClick={() => { setVehicleOpen(false); resetVehicleFields() }} className="text-sm text-slate-400 hover:text-red-600">Avbryt</button>
              </div>
              <div className="space-y-4">
                <Field label="Registreringsnummer" htmlFor="regnr">
                  <Input id="regnr" value={regnr} onChange={(e) => setRegnr(e.target.value)} placeholder="ABC123" className="uppercase" autoCapitalize="characters" />
                </Field>
                <div>
                  <p className="mb-1.5 text-sm font-medium text-slate-700">Fordonstyp</p>
                  <ChipSelect value={vehicleType} onChange={setVehicleType} options={strOpts(VEHICLE_TYPES)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-4">
                  <Field label="Märke" htmlFor="make"><Input id="make" value={make} onChange={(e) => setMake(e.target.value)} placeholder="Volvo" /></Field>
                  <Field label="Modell" htmlFor="model"><Input id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="V70" /></Field>
                  <Field label="Färg" htmlFor="color"><Input id="color" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Svart" /></Field>
                  <Field label="Årsmodell" htmlFor="year-model">
                    <Input
                      id="year-model"
                      type="number"
                      inputMode="numeric"
                      value={yearModel}
                      onChange={(e) => setYearModel(e.target.value)}
                      placeholder="2018"
                    />
                  </Field>
                </div>
                <Button type="button" variant="secondary" onClick={addVehicleToList} disabled={!regnr.trim()}>
                  + Lägg till i listan
                </Button>
              </div>
            </>
          )}
        </Card>

        {/* Person */}
        <Card className="p-5">
          <h2 className="mb-2 font-semibold text-brand-800">Personer</h2>
          {personDrafts.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {personDrafts.map((p, i) => (
                <span key={i} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white py-1 pl-3 pr-1.5 text-sm">
                  <span className="font-medium text-brand-700">{personDraftLabel(p)}</span>
                  {p.kind === 'new' && <span className="text-xs text-slate-400">(ny)</span>}
                  <button type="button" onClick={() => removePersonFromList(i)} className="rounded-full p-0.5 text-slate-400 hover:text-red-600" aria-label="Ta bort person">✕</button>
                </span>
              ))}
            </div>
          )}

          <Field label="Sök befintlig person" htmlFor="person-search" hint="Skriv minst 2 bokstäver för att söka.">
            <Input id="person-search" value={personQuery} onChange={(e) => setPersonQuery(e.target.value)} placeholder="Namn…" />
          </Field>
          {visiblePersonResults.length > 0 && (
            <div className="mt-1.5 space-y-1">
              {visiblePersonResults.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => addExistingPersonToList(r.id, r.name)}
                  className="block w-full rounded-lg border border-slate-200 px-3 py-1.5 text-left text-sm hover:border-brand-400 hover:bg-brand-50"
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}

          <div className="mt-3">
            {!personOpen ? (
              <button type="button" onClick={() => setPersonOpen(true)} className="font-medium text-brand-700 hover:underline">+ Ny person</button>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-600">Ny person</h3>
                  <button type="button" onClick={() => { setPersonOpen(false); resetPersonFields() }} className="text-sm text-slate-400 hover:text-red-600">Avbryt</button>
                </div>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Förnamn" htmlFor="fn"><Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></Field>
                    <Field label="Efternamn" htmlFor="ln"><Input id="ln" value={lastName} onChange={(e) => setLastName(e.target.value)} /></Field>
                  </div>
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-slate-700">Kön</p>
                    <ChipSelect value={gender} onChange={setGender} options={GENDERS} />
                  </div>
                  <Field label="Andra namn / smeknamn" htmlFor="aliases" hint="Skriv och tryck Enter för varje namn.">
                    <TagInput value={aliases} onChange={setAliases} placeholder="Lägg till namn…" />
                  </Field>
                  <Field label="Signalement" htmlFor="sign"><Textarea id="sign" rows={2} value={signalement} onChange={(e) => setSignalement(e.target.value)} placeholder="Utseende, klädsel…" /></Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Adress" htmlFor="addr"><Input id="addr" value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
                    <Field label="Ort" htmlFor="city"><Input id="city" value={city} onChange={(e) => setCity(e.target.value)} /></Field>
                  </div>
                  <Field label="Registreringsnummer" htmlFor="p-regnr" hint="Personens fordon. Skriv och tryck Enter.">
                    <TagInput value={personRegnrs} onChange={setPersonRegnrs} placeholder="ABC123" transform={normalizeRegnr} />
                  </Field>
                  <Field label="Kopplingar" htmlFor="conn" hint="Fritext för att koppla ihop vid sökningar (t.ex. relationer, kända kontakter).">
                    <Textarea id="conn" rows={2} value={connections} onChange={(e) => setConnections(e.target.value)} />
                  </Field>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={addNewPersonToList}
                    disabled={!personHasData({ first_name: firstName, last_name: lastName, aliases })}
                  >
                    + Lägg till i listan
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Kommentar */}
        <Card className="p-5">
          <Field label="Kommentar (valfritt)" htmlFor="notes">
            <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Övriga anteckningar" />
          </Field>
        </Card>

        <div className="flex justify-end gap-2 pb-4">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Avbryt</Button>
          <Button type="button" size="lg" onClick={onSubmit} loading={saving}>
            {isEdit ? 'Spara ändringar' : 'Spara observation'}
          </Button>
        </div>
      </div>
    </div>
  )
}
