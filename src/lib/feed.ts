import { supabase } from './supabase'

export type FeedItem = {
  kind: 'log' | 'obs'
  id: string
  title: string
  content: string
  location: string | null
  date: string
  created_by: string | null
  priority?: string | null
}

/** Hämtar ett sammanslaget flöde av loggboksinlägg + observationer, sorterat på datum (desc). */
export async function fetchFeed(opts: {
  query?: string
  type?: 'alla' | 'log' | 'obs'
  sinceISO?: string | null
  perTableLimit?: number
}): Promise<FeedItem[]> {
  const { query = '', type = 'alla', sinceISO = null, perTableLimit = 150 } = opts
  const items: FeedItem[] = []

  if (type !== 'obs') {
    let q = supabase
      .from('logbook_entries')
      .select('id,title,content,entry_at,location,created_by')
      .order('entry_at', { ascending: false })
      .limit(perTableLimit)
    if (query.trim()) q = q.textSearch('search', query.trim(), { type: 'websearch', config: 'swedish' })
    if (sinceISO) q = q.gte('entry_at', sinceISO)
    const { data, error } = await q
    if (error) throw error
    for (const l of data ?? []) {
      items.push({ kind: 'log', id: l.id, title: l.title, content: l.content ?? '', location: l.location, date: l.entry_at, created_by: l.created_by })
    }
  }

  if (type !== 'log') {
    let q = supabase
      .from('observations')
      .select('id,type,category,description,observed_at,location,priority,created_by')
      .order('observed_at', { ascending: false })
      .limit(perTableLimit)
    if (query.trim()) q = q.textSearch('search', query.trim(), { type: 'websearch', config: 'swedish' })
    if (sinceISO) q = q.gte('observed_at', sinceISO)
    const { data, error } = await q
    if (error) throw error
    for (const o of data ?? []) {
      items.push({ kind: 'obs', id: o.id, title: o.type || o.category || 'Observation', content: o.description ?? '', location: o.location, date: o.observed_at, created_by: o.created_by, priority: o.priority })
    }
  }

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return items
}
