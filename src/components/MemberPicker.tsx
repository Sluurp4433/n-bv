import { useProfiles } from '../lib/hooks'
import { Avatar } from './Avatar'
import { Select } from './ui'
import { memberColor } from '../lib/memberColor'

export function MemberPicker({
  value,
  onChange,
  exclude = [],
  label = 'Lägg till medlemmar',
}: {
  value: string[]
  onChange: (ids: string[]) => void
  exclude?: string[]
  label?: string
}) {
  const { profiles, map } = useProfiles()
  const available = profiles.filter(
    (p) => p.active && !value.includes(p.id) && !exclude.includes(p.id)
  )

  return (
    <div>
      <p className="mb-1 block text-sm font-medium text-slate-700">{label}</p>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((id) => {
            const p = map[id]
            return (
              <span key={id} className="flex items-center gap-1 rounded-full border border-slate-200 bg-white py-0.5 pl-0.5 pr-2 text-sm">
                <Avatar config={p?.avatar} size={22} ring={memberColor(p)} />
                <span className="max-w-[9rem] truncate">{p?.name || p?.email || 'Medlem'}</span>
                <button type="button" onClick={() => onChange(value.filter((v) => v !== id))} className="text-slate-400 hover:text-red-600" aria-label="Ta bort">
                  ✕
                </button>
              </span>
            )
          })}
        </div>
      )}
      <Select
        value=""
        onChange={(e) => {
          if (e.target.value) onChange([...value, e.target.value])
        }}
      >
        <option value="">Lägg till medlem…</option>
        {available.map((p) => (
          <option key={p.id} value={p.id}>{p.name || p.email}</option>
        ))}
      </Select>
    </div>
  )
}
