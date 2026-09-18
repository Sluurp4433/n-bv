import { supabase } from './supabase'
import { safeImageContentType } from './observations'
import { compressImage } from './images'

// ---- Foton på fordon (samma lagringsyta som observations-/loggboks-/personbilder) ----
const IMG_BUCKET = 'observation-images'

/** Laddar upp ett foto på ett fordon med sökbar bildtext. */
export async function uploadVehicleImage(
  vehicleId: string,
  file: File,
  caption: string,
  userId: string
): Promise<{ error?: string }> {
  if (!safeImageContentType(file.name)) return { error: 'Filtypen stöds inte. Tillåtna format: JPG, PNG, WEBP, GIF.' }
  const compressed = await compressImage(file)
  const contentType = safeImageContentType(compressed.name)
  if (!contentType) return { error: 'Filtypen stöds inte. Tillåtna format: JPG, PNG, WEBP, GIF.' }
  const safe = compressed.name.replace(/[^\w.\-]+/g, '_')
  const path = `vehicle/${vehicleId}/${crypto.randomUUID()}-${safe}`
  const up = await supabase.storage.from(IMG_BUCKET).upload(path, compressed, {
    upsert: false,
    contentType,
  })
  if (up.error) return { error: 'Kunde inte ladda upp bilden.' }
  const { error } = await supabase.from('vehicle_images').insert({
    vehicle_id: vehicleId,
    file_path: path,
    caption: caption || null,
    uploaded_by: userId,
  })
  if (error) {
    await supabase.storage.from(IMG_BUCKET).remove([path])
    return { error: 'Kunde inte spara bilden.' }
  }
  return {}
}

export async function vehicleImageUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(IMG_BUCKET).createSignedUrl(path, 3600)
  if (error || !data) return null
  return data.signedUrl
}

/** Tar bort fotot. Filen raderas ur lagringen först när databasraden faktiskt
 *  tagits bort (behörigheten avgörs av databasen) – returnerar false annars. */
export async function deleteVehicleImage(id: string, filePath: string): Promise<boolean> {
  const { data } = await supabase.from('vehicle_images').delete().eq('id', id).select('id')
  if (!data || data.length === 0) return false
  await supabase.storage.from(IMG_BUCKET).remove([filePath])
  return true
}

/** Tar bort fordonsfilerna ur lagringen (t.ex. när hela fordonet raderats – databasraderna
 *  följer med automatiskt, men själva filerna gör det inte). */
export async function removeVehicleImageFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  await supabase.storage.from(IMG_BUCKET).remove(paths)
}

/** Väljer vilket foto som ska visas som omslagsbild (miniatyr/rubrikbild) för fordonet. */
export async function setVehicleCoverImage(imageId: string): Promise<void> {
  const { error } = await supabase.rpc('set_vehicle_cover_image', { p_image_id: imageId })
  if (error) throw error
}
