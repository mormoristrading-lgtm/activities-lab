/**
 * Downscale + re-encode an image File to keep IndexedDB small (progress photos
 * can be multi-MB straight from a phone camera). Falls back to the original on
 * any failure.
 */
export class UnsupportedImageError extends Error {}

export async function compressImage(file: File, maxDim = 1280, quality = 0.8): Promise<Blob> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    // Couldn't decode the input (e.g. HEIC on an engine without HEIC support).
    // Don't silently store an unrenderable blob — let the caller report it.
    throw new UnsupportedImageError('unsupported image format')
  }
  try {
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file // decodable; storing the original is fine
    ctx.drawImage(bitmap, 0, 0, w, h)
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', quality))
    return blob ?? file
  } catch {
    return file
  } finally {
    bitmap.close()
  }
}
