import { useCallback } from 'react';
import { Share, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getTrackShareUrl } from '@aubesonore/core/share';
import { useLikedTracksStore } from '../stores/likedTracksStore';
import { usePreferencesStore } from '../stores/preferencesStore';

interface ShareButtonProps {
  title: string;
  artist: string;
  artworkUrl?: string | undefined;
  size?: number;
}

export function ShareButton({ title, artist, size = 22 }: ShareButtonProps) {
  const handleShare = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const tracks = useLikedTracksStore.getState().tracks;
    const preferredPlatform = usePreferencesStore.getState().preferences?.preferredPlatform;

    const likedTrack = tracks.find(
      (t) =>
        t.title.toLowerCase() === title.toLowerCase() &&
        t.artist.toLowerCase() === artist.toLowerCase()
    );

    const url = getTrackShareUrl(likedTrack ?? { title, artist }, preferredPlatform);

    try {
      await Share.share({
        message: `${title} — ${artist}\n${url}`,
      });
    } catch {
      // User cancelled
    }
  }, [title, artist]);

  return (
    <Pressable
      onPress={() => {
        void handleShare();
      }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name="share-outline" size={size} color="rgba(255,255,255,0.6)" />
    </Pressable>
  );
}
