import { supabase } from '../config/supabase.js';
import crypto from 'crypto';

export class SupabaseStorageService {
  /**
   * Uploads a base64 image string to Supabase Storage and returns the public URL.
   * If the input is already a URL or empty, it returns it directly.
   * Returns '' (empty string) on any upload failure so part saves still succeed.
   *
   * @param {string} base64String - The base64 string (e.g., 'data:image/png;base64,iVBORw0...')
   * @returns {Promise<string>} The public URL of the uploaded image, or '' on failure
   */
  async uploadBase64Image(base64String) {
    if (!base64String) return '';

    // If it's already an HTTP URL (from a previous upload), just return it
    if (base64String.startsWith('http://') || base64String.startsWith('https://')) {
      return base64String;
    }

    // Match the mime type and the base64 data
    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      console.warn('[SupabaseStorage] Invalid base64 format — skipping image upload.');
      return '';
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Determine extension
    let ext = 'jpg';
    if (mimeType === 'image/png') ext = 'png';
    else if (mimeType === 'image/webp') ext = 'webp';
    else if (mimeType === 'image/gif') ext = 'gif';
    const fileName = `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from('parts-images')
      .upload(fileName, buffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      // ponytail: graceful fallback — log and continue without image rather than killing the part save
      console.error(
        `[SupabaseStorage] Upload failed: ${error.message}. ` +
        `Ensure the 'parts-images' bucket exists, is public, and SUPABASE_SERVICE_ROLE_KEY is valid.`
      );
      return '';
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('parts-images')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  }
}

export const supabaseStorageService = new SupabaseStorageService();
