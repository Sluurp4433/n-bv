import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { cn } from './ui'

type ToastVariant = 'success' | 'error' | 'info'
type Toast = { id: number; message: string; variant: ToastVariant }

type ToastContextValue = {
  show: (message: string, variant?: ToastVariant) => void
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

let counter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const show = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = ++counter
      setToasts((t) => [...t, { id, message, variant }])
      window.setTimeout(() => remove(id), 4500)
    },
    [remove]
  )

  const value: ToastContextValue = {
    show,
    success: (m) => show(m, 'success'),
    error: (m) => show(m, 'error'),
  }

  const styles: Record<ToastVariant, string> = {
    success: 'bg-accent-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-brand-700 text-white',
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm shadow-lg',
              styles[t.variant]
            )}
          >
            <span>{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              className="text-white/80 hover:text-white"
              aria-label="Stäng"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast måste användas inom ToastProvider')
  return ctx
}
