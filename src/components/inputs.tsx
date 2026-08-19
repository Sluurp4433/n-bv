import { useState, type KeyboardEvent } from 'react'
import { cn } from './ui'

/** Enkelval via tapp-knappar (ersätter dropdown på mobil). */
export function ChipSelect({
  value,
  onChange,
  options,
  allowClear = true,
}: {
  value: string
  onChange: (v: string) => void
  options: readonly { value: string; label: string }[]
  allowClear?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const selected = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(allowClear && selected ? '' : o.value)}
            aria-pressed={selected}
            className={cn(
              'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
              selected
                ? 'border-brand-700 bg-brand-700 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:border-brand-400'
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** Fler värden via chips (skriv + Enter). För t.ex. smeknamn eller flera regnr. */
export function TagInput({
  value,
  onChange,
  placeholder,
  transform,
  className,
}: {
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
  transform?: (s: string) => string
  className?: string
}) {
  const [draft, setDraft] = useState('')

  function add() {
    const raw = draft.trim()
    if (!raw) return
    const v = transform ? transform(raw) : raw
    if (v && !value.includes(v)) onChange([...value, v])
    setDraft('')
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add()
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1.5 focus-within:ring-2 focus-within:ring-brand-500',
        className
      )}
    >
      {value.map((v) => (
        <span key={v} className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-sm text-brand-800">
          {v}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} className="text-brand-400 hover:text-red-600" aria-label={`Ta bort ${v}`}>
            ✕
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={add}
        placeholder={value.length === 0 ? placeholder : ''}
        className="min-w-[6rem] flex-1 border-0 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-slate-400"
      />
    </div>
  )
}
