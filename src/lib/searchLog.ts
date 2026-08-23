import { supabase } from './supabase'
import type { SearchResult } from '../types/database.types'

/** Loggar ett klick på ett sökträff-resultat, för "mest sökta"-statistiken. Fire-and-forget. */
export function logSearchClick(query: string, result: SearchResult, userId: string | undefined) {
  if (!userId) return
  const label = result.result_type === 'observation' || result.result_type === 'loggbok'
    ? result.subtitle
    : result.title
  if (!label) return
  supabase
    .from('search_logs')
    .insert({
      searched_by: userId,
      query,
      result_type: result.result_type,
      result_id: result.result_id,
      result_label: label,
    })
    .then(() => {})
}
