// ─────────────────────────────────────────────
// Image Service
// Télécharge et convertit les images en base64
// ─────────────────────────────────────────────

const MAX_IMAGE_SIZE = 500 * 1024; // 500KB max pour les covers
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface ImageResult {
  base64: string;
  mimeType: string;
  size: number;
}

/**
 * Télécharge une image et la convertit en base64
 * @param url - URL de l'image
 * @returns Image en base64 avec son type MIME
 */
export async function downloadImageAsBase64(url: string): Promise<ImageResult | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'OurMusic/1.0',
        Accept: 'image/*',
      },
    });

    if (!response.ok) {
      console.warn(`[Image] Impossible de télécharger: ${url} (${response.status})`);
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const mimeType = (contentType.split(';')[0] ?? 'image/jpeg').trim();

    if (!SUPPORTED_TYPES.includes(mimeType)) {
      console.warn(`[Image] Type non supporté: ${mimeType}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const size = arrayBuffer.byteLength;

    if (size > MAX_IMAGE_SIZE) {
      console.warn(`[Image] Image trop grande: ${size} bytes (max: ${MAX_IMAGE_SIZE})`);
      // On pourrait implémenter une compression ici
      // Pour l'instant, on accepte quand même mais on log
    }

    // Convertir en base64
    const uint8Array = new Uint8Array(arrayBuffer);
    const base64 = btoa(String.fromCharCode(...uint8Array));

    return {
      base64: `data:${mimeType};base64,${base64}`,
      mimeType,
      size,
    };
  } catch (error) {
    console.error(`[Image] Erreur lors du téléchargement de ${url}:`, error);
    return null;
  }
}

/**
 * Vérifie si une URL d'image est accessible
 * @param url - URL de l'image
 */
export async function isImageAccessible(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'OurMusic/1.0',
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}
