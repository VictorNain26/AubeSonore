import { Share } from 'react-native';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import type { LikedTrack } from '../types';
import { formatAsCSV, formatAsTuneMyMusic, formatAsSonglinkList } from '@aubesonore/core/export';
import { getTrackShareUrl } from '@aubesonore/core/share';
import type { PreferredPlatform } from '@aubesonore/shared-types/client';

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
  await shareFile(formatAsCSV(tracks), 'aubesonore-bibliotheque.csv', 'text/csv');
}

export async function exportAsTuneMyMusic(tracks: LikedTrack[]): Promise<void> {
  await shareFile(formatAsTuneMyMusic(tracks), 'aubesonore-tunemymusic.txt', 'text/plain');
}

export async function exportAsSonglinkList(tracks: LikedTrack[]): Promise<void> {
  await shareFile(formatAsSonglinkList(tracks), 'aubesonore-liens.txt', 'text/plain');
}

export async function shareTrackText(
  track: {
    title: string;
    artist: string;
    youtubeUrl?: string;
    songlinkUrl?: string | null;
    platformLinks?: LikedTrack['platformLinks'];
  },
  preferredPlatform?: PreferredPlatform | null
): Promise<void> {
  const url = getTrackShareUrl(track, preferredPlatform);
  try {
    await Share.share({
      message: `${track.title} — ${track.artist}\n${url}`,
    });
  } catch {
    // User cancelled
  }
}
