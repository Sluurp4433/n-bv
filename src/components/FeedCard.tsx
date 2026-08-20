import { Link } from 'react-router-dom'
import { Badge, Card } from './ui'
import { formatDateTime } from '../lib/format'
import { priorityLabel } from '../lib/constants'
import { creatorName } from '../lib/hooks'
import type { FeedItem } from '../lib/feed'
import type { Profile } from '../types/database.types'

/** Content-fokuserat flödeskort (gästbok/flöde-känsla). */
export function FeedCard({ item, map, linkState }: { item: FeedItem; map: Record<string, Profile>; linkState?: unknown }) {
  const to = item.kind === 'log' ? `/loggbok/${item.id}` : `/observation/${item.id}`
  return (
    <Link to={to} state={linkState} className="block">
      <Card className="p-4 transition-shadow hover:shadow-md sm:p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {item.kind === 'log' ? <Badge color="slate">Loggbok</Badge> : <Badge color="blue">Observation</Badge>}
          <span className="font-semibold text-brand-800">{item.title}</span>
          {item.kind === 'obs' && item.priority === 'hog' && <Badge color="red">{priorityLabel(item.priority)}</Badge>}
        </div>
        {item.content ? (
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700">{item.content}</p>
        ) : (
          <p className="text-sm italic text-slate-400">(ingen beskrivning)</p>
        )}
        <div className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-400">
          {formatDateTime(item.date)}
          {item.location ? ` · ${item.location}` : ''} · {creatorName(map, item.created_by)}
        </div>
      </Card>
    </Link>
  )
}
