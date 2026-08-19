import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { Avatar } from '../components/Avatar'
import { Button, Card, cn } from '../components/ui'
import { memberColor } from '../lib/memberColor'
import {
  BROW_STYLES,
  CLOTHING_COLORS,
  EYE_STYLES,
  EYEWEAR_STYLES,
  FACE_SHAPES,
  HAIR_COLORS,
  HAIR_STYLES,
  HEADWEAR_STYLES,
  MOUTH_STYLES,
  NECKWEAR_STYLES,
  SKIN_TONES,
  TOP_STYLES,
  randomAvatar,
  sanitizeAvatar,
  type AvatarConfig,
} from '../lib/avatar/config'

type Tab = 'ansikte' | 'har' | 'klader' | 'accessoarer'

const TABS: { id: Tab; label: string }[] = [
  { id: 'ansikte', label: 'Ansikte' },
  { id: 'har', label: 'Hår' },
  { id: 'klader', label: 'Kläder' },
  { id: 'accessoarer', label: 'Accessoarer' },
]

export function AvatarEditor() {
  const { user, profile, refreshProfile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const saved = sanitizeAvatar(profile?.avatar)
  const [cfg, setCfg] = useState<AvatarConfig>(saved)
  const [tab, setTab] = useState<Tab>('ansikte')
  const [saving, setSaving] = useState(false)

  const ring = memberColor(profile)

  async function handleSave() {
    if (!user) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ avatar: cfg }).eq('id', user.id)
    setSaving(false)
    if (error) {
      toast.error('Kunde inte spara avataren.')
      return
    }
    await refreshProfile()
    qc.invalidateQueries({ queryKey: ['profiles'] })
    toast.success('Avataren har sparats.')
    navigate('/profil')
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <Link to="/profil" className="text-sm text-brand-600 hover:underline">
          ← Tillbaka till profilen
        </Link>
      </div>
      <h1 className="mb-1 text-2xl font-bold text-brand-800">Redigera avatar</h1>
      <p className="mb-4 text-sm text-slate-500">Bygg din egen figur. Ändringarna syns direkt.</p>

      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        {/* Live-preview + knappar */}
        <div className="md:sticky md:top-4 md:self-start">
          <Card className="flex flex-col items-center p-5">
            <Avatar config={cfg} size={168} ring={ring} title="Din avatar" />
            <div className="mt-4 flex w-full flex-col gap-2">
              <Button variant="secondary" onClick={() => setCfg(randomAvatar())}>
                🎲 Slumpa avatar
              </Button>
              <Button variant="ghost" onClick={() => setCfg(sanitizeAvatar(profile?.avatar))}>
                Återställ
              </Button>
              <Button onClick={handleSave} loading={saving}>
                Spara avatar
              </Button>
            </div>
          </Card>
        </div>

        {/* Val */}
        <div>
          <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                  tab === t.id
                    ? 'border-brand-700 text-brand-800'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'ansikte' && (
            <div className="space-y-5">
              <ColorPicker label="Hudton" field="skin" colors={SKIN_TONES} cfg={cfg} setCfg={setCfg} />
              <PartPicker label="Ansiktsform" field="face" options={FACE_SHAPES} cfg={cfg} setCfg={setCfg} />
              <PartPicker label="Ögon" field="eyes" options={EYE_STYLES} cfg={cfg} setCfg={setCfg} />
              <PartPicker label="Ögonbryn" field="brows" options={BROW_STYLES} cfg={cfg} setCfg={setCfg} />
              <PartPicker label="Mun" field="mouth" options={MOUTH_STYLES} cfg={cfg} setCfg={setCfg} />
            </div>
          )}

          {tab === 'har' && (
            <div className="space-y-5">
              <PartPicker label="Frisyr" field="hair" options={HAIR_STYLES} cfg={cfg} setCfg={setCfg} />
              <ColorPicker label="Hårfärg" field="hairColor" colors={HAIR_COLORS} cfg={cfg} setCfg={setCfg} />
            </div>
          )}

          {tab === 'klader' && (
            <div className="space-y-5">
              <PartPicker label="Plagg" field="top" options={TOP_STYLES} cfg={cfg} setCfg={setCfg} />
              <ColorPicker label="Klädfärg" field="topColor" colors={CLOTHING_COLORS} cfg={cfg} setCfg={setCfg} />
            </div>
          )}

          {tab === 'accessoarer' && (
            <div className="space-y-5">
              <PartPicker label="Glasögon" field="eyewear" options={EYEWEAR_STYLES} cfg={cfg} setCfg={setCfg} />
              <PartPicker label="Huvudbonad" field="headwear" options={HEADWEAR_STYLES} cfg={cfg} setCfg={setCfg} />
              <ColorPicker label="Färg på huvudbonad" field="headwearColor" colors={CLOTHING_COLORS} cfg={cfg} setCfg={setCfg} />
              <PartPicker label="Halsduk" field="neckwear" options={NECKWEAR_STYLES} cfg={cfg} setCfg={setCfg} />
              <ColorPicker label="Färg på halsduk" field="neckwearColor" colors={CLOTHING_COLORS} cfg={cfg} setCfg={setCfg} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PartPicker({
  label,
  field,
  options,
  cfg,
  setCfg,
}: {
  label: string
  field: keyof AvatarConfig
  options: readonly string[]
  cfg: AvatarConfig
  setCfg: (c: AvatarConfig) => void
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-700">{label}</p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {options.map((opt) => {
          const selected = cfg[field] === opt
          return (
            <button
              key={opt}
              onClick={() => setCfg({ ...cfg, [field]: opt })}
              className={cn(
                'flex items-center justify-center rounded-lg border-2 bg-white p-1 transition-colors',
                selected ? 'border-brand-600' : 'border-slate-200 hover:border-slate-300'
              )}
              aria-pressed={selected}
              aria-label={`${label}: ${opt}`}
            >
              <Avatar config={{ ...cfg, [field]: opt }} size={48} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ColorPicker({
  label,
  field,
  colors,
  cfg,
  setCfg,
}: {
  label: string
  field: keyof AvatarConfig
  colors: Record<string, string>
  cfg: AvatarConfig
  setCfg: (c: AvatarConfig) => void
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-700">{label}</p>
      <div className="flex flex-wrap gap-2">
        {Object.entries(colors).map(([key, hex]) => {
          const selected = cfg[field] === key
          return (
            <button
              key={key}
              onClick={() => setCfg({ ...cfg, [field]: key })}
              className={cn(
                'h-9 w-9 rounded-full border-2 transition-transform',
                selected ? 'border-brand-700 scale-110' : 'border-white shadow'
              )}
              style={{ backgroundColor: hex }}
              aria-pressed={selected}
              aria-label={`${label}: ${key}`}
            />
          )
        })}
      </div>
    </div>
  )
}
