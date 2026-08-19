import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

/* ---------- Knapp ---------- */
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, className, children, disabled, ...rest },
  ref
) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  const sizes = { md: 'px-4 py-2 text-sm', lg: 'px-5 py-3 text-base' }
  const variants = {
    primary: 'bg-brand-700 text-white hover:bg-brand-800 focus-visible:ring-brand-500',
    secondary:
      'bg-white text-brand-800 border border-slate-300 hover:bg-slate-50 focus-visible:ring-brand-500',
    ghost: 'text-brand-700 hover:bg-brand-50 focus-visible:ring-brand-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
  }
  return (
    <button
      ref={ref}
      className={cn(base, sizes[size], variants[variant], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  )
})

/* ---------- Kort ---------- */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-xl bg-white shadow-sm border border-slate-200', className)}>
      {children}
    </div>
  )
}

/* ---------- Sidhuvud ---------- */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-brand-800">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}

/* ---------- Formulärfält ---------- */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

const inputBase =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-brand-500 disabled:bg-slate-100'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(inputBase, className)} {...rest} />
  }
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cn(inputBase, 'min-h-[96px]', className)} {...rest} />
  }
)

const chevronSvg =
  "<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>"
const chevronUrl = `url("data:image/svg+xml,${encodeURIComponent(chevronSvg)}")`

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={cn(inputBase, 'appearance-none pr-9', className)}
        {...rest}
        style={{
          backgroundImage: chevronUrl,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0.65rem center',
          ...rest.style,
        }}
      >
        {children}
      </select>
    )
  }
)

/* ---------- Badge ---------- */
export function Badge({
  children,
  color = 'slate',
}: {
  children: ReactNode
  color?: 'slate' | 'green' | 'blue' | 'red' | 'amber'
}) {
  const colors = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-accent-50 text-accent-700',
    blue: 'bg-brand-50 text-brand-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        colors[color]
      )}
    >
      {children}
    </span>
  )
}

/* ---------- Spinner ---------- */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin text-current', className ?? 'h-5 w-5')}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  )
}

export function LoadingState({ label = 'Laddar…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
      <Spinner className="h-6 w-6 text-brand-600" />
      <span>{label}</span>
    </div>
  )
}

/* ---------- Tomt tillstånd ---------- */
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white py-14 px-6 text-center">
      {icon && <div className="mx-auto mb-3 text-4xl">{icon}</div>}
      <h3 className="text-base font-semibold text-slate-700">{title}</h3>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

/* ---------- Alert ---------- */
export function Alert({
  variant = 'info',
  children,
}: {
  variant?: 'info' | 'error' | 'success' | 'warning'
  children: ReactNode
}) {
  const styles = {
    info: 'bg-brand-50 text-brand-800 border-brand-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    success: 'bg-accent-50 text-accent-800 border-accent-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
  }
  return (
    <div className={cn('rounded-lg border px-4 py-3 text-sm', styles[variant])} role="alert">
      {children}
    </div>
  )
}
