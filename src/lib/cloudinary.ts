/**
 * Cloudinary image upload & optimization helper.
 *
 * Provides signed/direct image uploads with automatic format (f_auto)
 * and automatic quality compression (q_auto) to shrink 10MB+ phone camera
 * photos down to ~150KB without visual quality loss.
 */

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export function getCloudinaryUrl(publicIdOrUrl: string, options: { width?: number; height?: number } = {}): string {
  if (!publicIdOrUrl) return '';
  // If it's already a full URL, add transformation flags if Cloudinary
  if (publicIdOrUrl.startsWith('https://res.cloudinary.com/')) {
    if (!publicIdOrUrl.includes('/f_auto,q_auto/')) {
      return publicIdOrUrl.replace('/upload/', '/upload/f_auto,q_auto/');
    }
    return publicIdOrUrl;
  }
  return publicIdOrUrl;
}

/**
 * Upload an image buffer or file directly to Cloudinary.
 */
export async function uploadToCloudinary(
  fileBuffer: ArrayBuffer,
  folder = 'autonegypt/cars',
  cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'autonegypt',
  uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'cars_preset',
): Promise<{ url: string; secure_url: string; public_id: string }> {
  const formData = new FormData();
  const blob = new Blob([fileBuffer]);
  formData.append('file', blob);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', folder);

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const res = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Cloudinary upload failed: ${errText}`);
  }

  const data = (await res.json()) as { url: string; secure_url: string; public_id: string };
  // Inject f_auto,q_auto for optimal mobile performance
  const optimizedUrl = data.secure_url.replace('/upload/', '/upload/f_auto,q_auto/');
  return { ...data, secure_url: optimizedUrl };
}
