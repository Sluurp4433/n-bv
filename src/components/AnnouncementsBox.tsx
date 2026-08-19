import { Alert } from './ui'
import { useActiveAnnouncements } from '../lib/announcements'
import { formatRelative } from '../lib/format'

export function AnnouncementsBox() {
  const q = useActiveAnnouncements()
  if (!q.data || q.data.length === 0) return null
  return (
    <div className="mb-6 space-y-2">
      {q.data.map((a) => {
        const variant = a.level === 'critical' ? 'error' : a.level === 'warning' ? 'warning' : 'info'
        return (
          <Alert key={a.id} variant={variant}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{a.title}</div>
                {a.body && <div className="mt-0.5 whitespace-pre-wrap text-sm">{a.body}</div>}
              </div>
              <span className="shrink-0 text-xs opacity-70">{formatRelative(a.created_at)}</span>
            </div>
          </Alert>
        )
      })}
    </div>
  )
}
