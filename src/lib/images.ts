// Förminskar bilder i webbläsaren innan uppladdning, så att mobilfoton
// (som ofta är flera MB styck) inte fyller lagringsutrymmet i onödan.
// Körs automatiskt vid alla foto-uppladdningar från medlemmar (personer,
// observationer, loggbok) – gäller inte föreningens logga/sponsorbilder,
// som behöver full kvalitet och kan behöva genomskinlighet.
const MAX_DIMENSION = 1920
const JPEG_QUALITY = 0.82

/**
 * Skalar ner en bild till max `MAX_DIMENSION` bildpunkter på längsta sidan
 * och komprimerar den som JPEG. Rör inte GIF (skulle tappa animationen).
 * Om förminskningen av någon anledning inte gör filen mindre, eller om
 * något går fel (t.ex. en bildkodning webbläsaren inte kan läsa), används
 * originalfilen istället – uppladdningen ska aldrig blockeras av det här.
 */
export async function compressImage(file: File): Promise<File> {
  if (file.type === 'image/gif') return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
    if (!blob || blob.size >= file.size) return file

    const newName = file.name.replace(/\.[^./]+$/, '') + '.jpg'
    return new File([blob], newName, { type: 'image/jpeg' })
  } catch {
    return file
  }
}
