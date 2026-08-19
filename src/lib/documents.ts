import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { DocumentRow } from '../types/database.types'

export const DOCUMENT_CATEGORIES = [
  'Stadgar',
  'Protokoll – årsmöte',
  'Protokoll – månadsmöte',
  'Protokoll – styrelsemöte',
  'Övrigt',
] as const

const BUCKET = 'documents'

export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: async (): Promise<DocumentRow[]> => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export type UploadInput = {
  file: File
  title: string
  category: string
  description?: string
}

export async function uploadDocument(input: UploadInput, userId: string): Promise<{ error?: string }> {
  const safeName = input.file.name.replace(/[^\w.\-() ]+/g, '_')
  const path = `${crypto.randomUUID()}/${safeName}`

  const up = await supabase.storage.from(BUCKET).upload(path, input.file, {
    upsert: false,
    contentType: input.file.type || undefined,
  })
  if (up.error) return { error: 'Kunde inte ladda upp filen. Du kanske saknar behörighet.' }

  const { error } = await supabase.from('documents').insert({
    title: input.title,
    category: input.category || null,
    description: input.description || null,
    file_path: path,
    file_name: input.file.name,
    mime_type: input.file.type || null,
    size_bytes: input.file.size,
    uploaded_by: userId,
  })
  if (error) {
    // Rulla tillbaka den uppladdade filen om databasraden misslyckades
    await supabase.storage.from(BUCKET).remove([path])
    return { error: 'Kunde inte spara dokumentet.' }
  }
  return {}
}

export async function getDownloadUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
  if (error || !data) return null
  return data.signedUrl
}

export async function deleteDocument(doc: DocumentRow): Promise<{ error?: string }> {
  const del = await supabase.from('documents').delete().eq('id', doc.id)
  if (del.error) return { error: 'Kunde inte ta bort dokumentet.' }
  await supabase.storage.from(BUCKET).remove([doc.file_path])
  return {}
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} kB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
