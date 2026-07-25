import { API_BASE_URL } from '../utils/config';
import * as m from '@/paraglide/messages.js';

interface ShareTrackInput {
  title: string;
  artist: string;
  url: string;
}

export async function shareTrack({
  title,
  artist,
  url,
}: ShareTrackInput): Promise<'shared' | 'copied'> {
  const text = m.share_text({ title, artist });
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: 'AubeSonore', text, url });
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) throw err;
    }
    return 'shared';
  }
  await navigator.clipboard.writeText(`${text} ${url}`);
  return 'copied';
}

export function getRadioShareUrl(title: string, artist: string): string {
  return `${API_BASE_URL}/t?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`;
}
