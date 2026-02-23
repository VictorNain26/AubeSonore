import { Share } from 'react-native';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import type { LikedTrack } from '../types';

// BOM for Excel UTF-8 compatibility
const BOM = '\uFEFF';

function escapeCsv(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

async function shareFile(content: string, filename: string, mimeType: string): Promise<void> {
  const file = new File(Paths.cache, filename);
  file.create();
  file.write(content);

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(file.uri, { mimeType });
  }
}

export async function exportAsCSV(tracks: LikedTrack[]): Promise<void> {
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
  await shareFile(csv, 'aubesonore-bibliotheque.csv', 'text/csv');
}

export async function exportAsTuneMyMusic(tracks: LikedTrack[]): Promise<void> {
  const lines = tracks.map((t) => `${t.artist} - ${t.title}`);
  const text = lines.join('\n');
  await shareFile(text, 'aubesonore-tunemymusic.txt', 'text/plain');
}

export async function exportAsSonglinkList(tracks: LikedTrack[]): Promise<void> {
  const lines = tracks
    .filter((t) => t.songlinkUrl)
    .map((t) => `${t.artist} - ${t.title}\n${t.songlinkUrl}`);
  const text = lines.join('\n\n');
  await shareFile(text, 'aubesonore-liens.txt', 'text/plain');
}

export async function shareTrackText(title: string, artist: string): Promise<void> {
  try {
    await Share.share({
      message: `${title} - ${artist}\nDécouvert sur AubeSonore`,
    });
  } catch {
    // User cancelled
  }
}
