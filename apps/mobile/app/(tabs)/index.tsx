import { View, ScrollView, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { usePlayerStore } from '../../src/stores/playerStore';
import { useAuthStore } from '../../src/stores/authStore';
import { useLikedTracksStore } from '../../src/stores/likedTracksStore';
import { useAudio } from '../../src/providers/AudioProvider';
import {
  AlbumArt,
  PlayButton,
  TrackInfo,
  VolumeSlider,
  ListenerCount,
} from '../../src/components';

export default function PlayerScreen() {
  const router = useRouter();

  // Audio controls from provider
  const { play, stop, setVolume: setPlayerVolume } = useAudio();

  // Player state from store
  const {
    isPlaying,
    isLoading,
    volume,
    currentSong,
    nowPlaying,
    setVolume: setStoreVolume,
  } = usePlayerStore();

  // Auth state
  const { isAuthenticated } = useAuthStore();

  // Liked tracks state
  const { isTrackLiked, likeTrack, unlikeTrack, tracks } = useLikedTracksStore();

  // Check if current track is liked
  const isCurrentTrackLiked = currentSong
    ? isTrackLiked(currentSong.title, currentSong.artist)
    : false;

  // Handle play/stop
  const handleTogglePlay = useCallback(() => {
    isPlaying ? stop() : play();
  }, [isPlaying, play, stop]);

  // Handle volume change - update both player and store
  const handleVolumeChange = useCallback(
    (value: number) => {
      setPlayerVolume(value);
      setStoreVolume(value);
    },
    [setPlayerVolume, setStoreVolume]
  );

  // Handle like/unlike
  const handleToggleLike = useCallback(async () => {
    if (!currentSong) return;

    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }

    const { title, artist, art } = currentSong;

    // Check if already liked
    const existingTrack = tracks.find(
      (t) =>
        t.title.toLowerCase() === title.toLowerCase() &&
        t.artist.toLowerCase() === artist.toLowerCase()
    );

    if (existingTrack) {
      const success = await unlikeTrack(existingTrack.id);
      if (success) {
        Alert.alert('Succès', 'Retiré de votre bibliothèque');
      }
    } else {
      const result = await likeTrack({
        title,
        artist,
        artworkUrl: art,
        youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} ${artist}`)}`,
      });
      if (result) {
        Alert.alert('Succès', 'Ajouté à votre bibliothèque');
      }
    }
  }, [currentSong, isAuthenticated, tracks, likeTrack, unlikeTrack, router]);

  const listeners = nowPlaying?.listeners?.current;

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 items-center justify-center px-6 py-8">
          {/* Album Art */}
          <AlbumArt
            artUrl={currentSong?.art}
            title={currentSong?.title}
            isPlaying={isPlaying}
            isLiked={isCurrentTrackLiked}
            isLive={nowPlaying?.live?.is_live}
            onToggleLike={handleToggleLike}
          />

          {/* Track Info */}
          <View className="mt-8 w-full">
            <TrackInfo
              title={currentSong?.title}
              artist={currentSong?.artist}
              playlist={nowPlaying?.now_playing?.playlist}
            />
          </View>

          {/* Play Button */}
          <View className="mt-8">
            <PlayButton
              isPlaying={isPlaying}
              isLoading={isLoading}
              onPress={handleTogglePlay}
              size="large"
            />
          </View>

          {/* Volume Slider */}
          <View className="mt-8 w-full px-4">
            <VolumeSlider volume={volume} onVolumeChange={handleVolumeChange} />
          </View>

          {/* Listeners count */}
          {listeners !== undefined && listeners > 0 && (
            <View className="mt-6">
              <ListenerCount count={listeners} />
            </View>
          )}

          {/* Station name */}
          <View className="mt-8">
            <Text className="text-sm text-white/30 text-center">
              Aube Sonore Radio
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
