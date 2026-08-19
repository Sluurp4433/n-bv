import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { SiteSettings, Sponsor } from '../types/database.types'

const BUCKET = 'public-assets'

/** Publik URL till en bild i public-assets-bucketen. */
export function publicAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export function useSiteSettings() {
  return useQuery({
    queryKey: ['site_settings'],
    queryFn: async (): Promise<SiteSettings | null> => {
      const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useSponsors(activeOnly = false) {
  return useQuery({
    queryKey: ['sponsors', activeOnly],
    queryFn: async (): Promise<Sponsor[]> => {
      let q = supabase
        .from('sponsors')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (activeOnly) q = q.eq('active', true)
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
  })
}

/** Laddar upp en bild till public-assets. prefix t.ex. 'logo' eller 'sponsors'. */
export async function uploadPublicAsset(file: File, prefix: string): Promise<{ path?: string; error?: string }> {
  const safe = file.name.replace(/[^\w.\-]+/g, '_')
  const path = `${prefix}/${crypto.randomUUID()}-${safe}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  })
  if (error) return { error: 'Kunde inte ladda upp bilden.' }
  return { path }
}

export async function removePublicAsset(path: string | null | undefined) {
  if (path) await supabase.storage.from(BUCKET).remove([path])
}
