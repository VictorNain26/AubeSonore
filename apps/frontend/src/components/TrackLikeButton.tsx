import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Button } from './ui/button';
import { useLikedTracks } from '../hooks/useLikedTracks';
import { motion } from 'framer-motion';
import { authClient } from '../lib/authClient';
import type { Session } from '../hooks/useAuth';

export interface Track {
  title: string;
  artist: string;
  art?: string;
  youtubeUrl?: string;
}

export interface TrackLikeButtonProps {
  track: Track;
}

const TrackLikeButton: React.FC<TrackLikeButtonProps> = ({ track }) => {
  const { likedTracks, likeTrack, handleDelete, isLoading } = useLikedTracks();
  const { data: session } = authClient.useSession();
  const isLoggedIn = !!(session as Session)?.user;

  const youtubeUrl =
    track?.youtubeUrl ??
    `https://www.youtube.com/results?search_query=${encodeURIComponent(`${track.artist} ${track.title}`)}`;

  // 🧩 State local pour suivre l'état du bouton dynamiquement
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [likedTrackId, setLikedTrackId] = useState<string | null>(null);

  // 💡 Normalisation pour une comparaison fiable
  const normalize = (str?: string): string => str?.trim().toLowerCase() ?? '';

  useEffect(() => {
    const matchedTrack = likedTracks.find(
      (item) =>
        normalize(item.title) === normalize(track.title) &&
        normalize(item.artist) === normalize(track.artist),
    );

    setIsLiked(!!matchedTrack);
    setLikedTrackId(matchedTrack?.id ?? null);
  }, [likedTracks, track]);

  useEffect(() => {
    if (!isLoggedIn) {
      setIsLiked(false);
      setLikedTrackId(null);
    }
  }, [isLoggedIn]);

  const handleLike = async (): Promise<void> => {
    if (!isLoggedIn) {
      toast.error('Veuillez vous connecter pour liker.');
      const loginBtn = document.querySelector('[data-login-button]') as HTMLElement;
      if (loginBtn) {
        loginBtn.click();
      }
      return;
    }

    try {
      await likeTrack.mutateAsync({
        title: track.title,
        artist: track.artist,
        artwork: track.art ?? '',
        youtubeUrl,
      });
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error('[TrackLikeButton → Like]', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du like';
      toast.error(errorMessage);
    }
  };

  const handleUnlike = async (): Promise<void> => {
    if (!likedTrackId) {
      return;
    }
    try {
      await handleDelete(likedTrackId);
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error('[TrackLikeButton → Unlike]', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du unlike';
      toast.error(errorMessage);
    }
  };

  const handleClick = (): void => {
    if (likeTrack.isPending || isLoading) {
      return;
    }

    if (isLiked) {
      handleUnlike();
    } else {
      handleLike();
    }
  };

  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className="mt-4"
    >
      <Button
        onClick={handleClick}
        disabled={likeTrack.isPending || isLoading}
        className={`w-full sm:w-auto ${
          isLiked
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
      >
        {likeTrack.isPending || isLoading
          ? isLiked
            ? 'Retrait...'
            : 'Ajout...'
          : isLiked
            ? 'Unlike'
            : 'Like'}
      </Button>
    </motion.div>
  );
};

export default TrackLikeButton;
