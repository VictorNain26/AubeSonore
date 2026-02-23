import type { LikedTrack } from './api';

// BOM for Excel UTF-8 compatibility
const BOM = '\uFEFF';

export function exportAsCSV(tracks: LikedTrack[]): void {
  const header = [
    'Titre',
    'Artiste',
    'Album',
    'Date ajout',
    'Songlink',
    'Spotify',
    'Apple Music',
    'Deezer',
    'YouTube Music',
  ];
  const rows = tracks.map((t) => [
    escapeCsv(t.title),
    escapeCsv(t.artist),
    escapeCsv(t.album || ''),
    new Date(t.createdAt).toLocaleDateString('fr-FR'),
    t.songlinkUrl || '',
    t.platformLinks?.spotify || '',
    t.platformLinks?.appleMusic || '',
    t.platformLinks?.deezer || '',
    t.platformLinks?.youtubeMusic || '',
  ]);

  const csv = BOM + [header.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  downloadBlob(csv, 'aubesonore-bibliotheque.csv', 'text/csv;charset=utf-8');
}

export function exportAsTuneMyMusic(tracks: LikedTrack[]): void {
  // TuneMyMusic accepts simple "Artist - Title" text format
  const lines = tracks.map((t) => `${t.artist} - ${t.title}`);
  const text = lines.join('\n');
  downloadBlob(text, 'aubesonore-tunemymusic.txt', 'text/plain;charset=utf-8');
}

export function exportAsSonglinkList(tracks: LikedTrack[]): void {
  const lines = tracks
    .filter((t) => t.songlinkUrl)
    .map((t) => `${t.artist} - ${t.title}\n${t.songlinkUrl}`);
  const text = lines.join('\n\n');
  downloadBlob(text, 'aubesonore-liens.txt', 'text/plain;charset=utf-8');
}

function escapeCsv(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

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
