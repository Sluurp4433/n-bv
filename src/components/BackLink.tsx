import { Link, useLocation } from 'react-router-dom'

/**
 * Bakåtlänk på detaljsidor. Om man kommit hit från en lista/sökning (via `state.from`)
 * länkas man tillbaka till exakt den filtrerade vyn; annars används fallback (to/label).
 */
export function BackLink({ to, label }: { to: string; label: string }) {
  const loc = useLocation()
  const state = loc.state as { from?: string; backLabel?: string } | null
  const dest = state?.from ?? to
  const text = state?.from ? state.backLabel ?? 'Tillbaka till sökningen' : label
  return (
    <Link to={dest} className="text-sm text-brand-600 hover:underline">
      ← {text}
    </Link>
  )
}

/** Bygger `state`-objektet som list-/söklänkar skickar med till detaljsidan. */
export function fromState(loc: { pathname: string; search: string }, backLabel: string) {
  return { from: `${loc.pathname}${loc.search}`, backLabel }
}
