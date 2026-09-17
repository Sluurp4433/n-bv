import { useEffect } from 'react'

/** Enkel bildvisare i förstoring – klicka på bakgrunden, tryck Escape eller
 *  ✕ för att stänga. `url` null/undefined döljer den. */
export function Lightbox({ url, onClose }: { url: string | null | undefined; onClose: () => void }) {
  useEffect(() => {
    if (!url) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [url, onClose])

  if (!url) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Förstorat foto"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-2xl leading-none text-white hover:bg-white/20"
        aria-label="Stäng"
      >
        ✕
      </button>
      <img
        src={url}
        alt=""
        className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
