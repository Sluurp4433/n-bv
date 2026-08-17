import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { sv } from 'date-fns/locale'

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const d = typeof value === 'string' ? parseISO(value) : value
  return isNaN(d.getTime()) ? null : d
}

/** 17 augusti 2026 */
export function formatDate(value: string | Date | null | undefined): string {
  const d = toDate(value)
  return d ? format(d, 'd MMMM yyyy', { locale: sv }) : '–'
}

/** 17 aug 2026 14:32 */
export function formatDateTime(value: string | Date | null | undefined): string {
  const d = toDate(value)
  return d ? format(d, 'd MMM yyyy HH:mm', { locale: sv }) : '–'
}

/** 14:32 */
export function formatTime(value: string | Date | null | undefined): string {
  const d = toDate(value)
  return d ? format(d, 'HH:mm', { locale: sv }) : '–'
}

/** för ~2 timmar sedan */
export function formatRelative(value: string | Date | null | undefined): string {
  const d = toDate(value)
  return d ? formatDistanceToNow(d, { locale: sv, addSuffix: true }) : '–'
}

/** Värde för <input type="datetime-local"> från ISO-sträng */
export function toDatetimeLocal(value: string | Date | null | undefined): string {
  const d = toDate(value) ?? new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Normaliserar registreringsnummer (versaler, endast bokstäver/siffror) — speglar databasen */
export function normalizeRegnr(input: string): string {
  return (input || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
}
