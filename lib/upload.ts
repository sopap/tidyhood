import { getServiceClient } from './db'

/**
 * Generate a signed URL for uploading a photo to Supabase Storage
 */
export async function getUploadSignedUrl(
  bucket: string,
  filePath: string,
  expiresIn: number = 300 // 5 minutes
): Promise<string> {
  const db = getServiceClient()
  
  const { data, error } = await db.storage
    .from(bucket)
    .createSignedUploadUrl(filePath)
  
  if (error) {
    throw new Error(`Failed to generate upload URL: ${error.message}`)
  }
  
  return data.signedUrl
}

/**
 * Generate a public URL for viewing an uploaded photo
 */
export function getPublicUrl(bucket: string, filePath: string): string {
  const db = getServiceClient()
  
  const { data } = db.storage
    .from(bucket)
    .getPublicUrl(filePath)
  
  return data.publicUrl
}

/**
 * Generate a unique file path for photo uploads
 */
export function generatePhotoPath(
  orderId: string,
  type: 'bag' | 'checklist',
  filename: string
): string {
  const timestamp = Date.now()
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `${orderId}/${type}/${timestamp}-${sanitizedFilename}`
}

/**
 * Delete a photo from storage
 */
export async function deletePhoto(bucket: string, filePath: string): Promise<void> {
  const db = getServiceClient()
  
  const { error } = await db.storage
    .from(bucket)
    .remove([filePath])
  
  if (error) {
    throw new Error(`Failed to delete photo: ${error.message}`)
  }
}
