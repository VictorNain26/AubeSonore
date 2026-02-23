import { useCallback, useRef, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';

import { DEFAULT_ARTWORK } from '../config/env';

interface ShareButtonProps {
  title: string;
  artist: string;
  artworkUrl: string | undefined;
  size?: number;
}

export function ShareButton({ title, artist, artworkUrl, size = 22 }: ShareButtonProps) {
  const viewShotRef = useRef<ViewShot>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const displayArt = artworkUrl || DEFAULT_ARTWORK;
  const isDefault =
    !artworkUrl ||
    artworkUrl.includes('generic') ||
    artworkUrl.includes('default') ||
    artworkUrl.includes('placeholder');

  const handleShare = useCallback(async () => {
    if (isGenerating) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsGenerating(true);

    try {
      const uri = await viewShotRef.current?.capture?.();
      if (uri) {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: `${title} - ${artist}`,
          });
        }
      }
    } catch (err) {
      console.warn('[ShareButton] Error:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [title, artist, isGenerating]);

  return (
    <>
      {/* Share button */}
      <Pressable
        onPress={handleShare}
        disabled={isGenerating}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{ opacity: isGenerating ? 0.5 : 1 }}
      >
        <Ionicons name="share-outline" size={size} color="rgba(255,255,255,0.6)" />
      </Pressable>

      {/* Off-screen share card for capture */}
      <View style={styles.offScreen}>
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'png', quality: 1, width: 1080, height: 1080 }}
        >
          <View style={styles.card}>
            {/* Background artwork (blurred effect via overlay) */}
            <Image source={{ uri: displayArt }} style={styles.bgArt} blurRadius={60} />
            <View style={styles.overlay} />

            {/* Content */}
            <View style={styles.content}>
              {/* Artwork */}
              <View style={styles.artContainer}>
                {isDefault ? (
                  <View style={styles.defaultArt}>
                    <Ionicons name="radio" size={80} color="rgba(147,112,219,0.6)" />
                  </View>
                ) : (
                  <Image source={{ uri: displayArt }} style={styles.art} />
                )}
              </View>

              {/* Track info */}
              <Text style={styles.title} numberOfLines={2}>
                {title}
              </Text>
              <Text style={styles.artist} numberOfLines={1}>
                {artist}
              </Text>

              {/* Branding */}
              <Text style={styles.branding}>AUBESONORE</Text>
            </View>
          </View>
        </ViewShot>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  offScreen: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    opacity: 0,
  },
  card: {
    width: 1080,
    height: 1080,
    backgroundColor: '#0f1118',
    position: 'relative',
  },
  bgArt: {
    ...StyleSheet.absoluteFillObject,
    width: 1080,
    height: 1080,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,17,24,0.65)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 80,
  },
  artContainer: {
    width: 540,
    height: 540,
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 20,
  },
  art: {
    width: 540,
    height: 540,
  },
  defaultArt: {
    width: 540,
    height: 540,
    backgroundColor: 'rgba(147,112,219,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
  },
  artist: {
    fontSize: 32,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 60,
  },
  branding: {
    fontSize: 20,
    fontWeight: '300',
    letterSpacing: 8,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
  },
});
