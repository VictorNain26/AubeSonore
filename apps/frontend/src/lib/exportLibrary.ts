import type { ClientLikedTrack } from '@aubesonore/shared-types/client';
import { formatAsCSV, formatAsTuneMyMusic, formatAsSonglinkList } from '@aubesonore/core/export';

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAsCSV(tracks: ClientLikedTrack[]): void {
  downloadBlob(formatAsCSV(tracks), 'aubesonore-bibliotheque.csv', 'text/csv;charset=utf-8');
}

export function exportAsTuneMyMusic(tracks: ClientLikedTrack[]): void {
  downloadBlob(
    formatAsTuneMyMusic(tracks),
    'aubesonore-tunemymusic.txt',
    'text/plain;charset=utf-8'
  );
}

export function exportAsSonglinkList(tracks: ClientLikedTrack[]): void {
  downloadBlob(formatAsSonglinkList(tracks), 'aubesonore-liens.txt', 'text/plain;charset=utf-8');
}
