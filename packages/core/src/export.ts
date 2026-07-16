import type { ClientLikedTrack } from '@aubesonore/shared-types/client';

// BOM for Excel UTF-8 compatibility
const BOM = '\uFEFF';

export function escapeCsv(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function formatAsCSV(tracks: ClientLikedTrack[]): string {
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

  return BOM + [header.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
}
