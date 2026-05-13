import { assertSafeUrl } from '../lib/security/urlValidation';

const MAX_IMAGE_SIZE = 500 * 1024; // 500KB
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const FETCH_TIMEOUT_MS = 5_000;
const isProd: boolean = process.env.NODE_ENV === 'production' || process.env.ENV === 'production';

interface ImageResult {
  base64: string;
  mimeType: string;
  size: number;
}

export async function downloadImageAsBase64(url: string): Promise<ImageResult | null> {
  try {
    await assertSafeUrl(url, { requireHttps: isProd });
  } catch (err) {
    console.warn(`[Image] URL rejected: ${(err as Error).message}`);
    return null;
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AubeSonore/1.0',
        Accept: 'image/*',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'error', // prevent redirect-based SSRF bypass
    });

    if (!response.ok) {
      console.warn(`[Image] Cannot download (${response.status})`);
      return null;
    }

    const contentType = response.headers.get('content-type') ?? 'image/jpeg';
    const mimeType = (contentType.split(';')[0] ?? 'image/jpeg').trim();

    if (!SUPPORTED_TYPES.includes(mimeType)) {
      console.warn(`[Image] Unsupported type: ${mimeType}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const size = arrayBuffer.byteLength;

    if (size > MAX_IMAGE_SIZE) {
      console.warn(`[Image] Too large: ${size} bytes (max ${MAX_IMAGE_SIZE})`);
      return null;
    }

    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return {
      base64: `data:${mimeType};base64,${base64}`,
      mimeType,
      size,
    };
  } catch (error) {
    console.error('[Image] Download error:', (error as Error).message);
    return null;
  }
}

export async function isImageAccessible(url: string): Promise<boolean> {
  try {
    await assertSafeUrl(url, { requireHttps: isProd });
    const response = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'AubeSonore/1.0' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'error',
    });
    return response.ok;
  } catch {
    return false;
  }
}
