import { useQuery, useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { apiFetch } from '../utils/api';
import { toast } from 'react-hot-toast';
import { authClient } from '../lib/authClient';
import { useEffect } from 'react';
import { Session } from './useAuth';

export interface LikedTrack {
  id: string;
  title: string;
  artist: string;
  artwork?: string;
  youtubeUrl?: string;
  createdAt?: string;
  userId?: string;
}

export interface NewTrack {
  title: string;
  artist: string;
  artwork?: string;
  youtubeUrl?: string;
}

export interface OptimisticTrack extends NewTrack {
  id: string;
}

export interface MutationContext {
  previousTracks: LikedTrack[];
}

export interface UseLikedTracksReturn {
  likedTracks: LikedTrack[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  likeTrack: UseMutationResult<LikedTrack | undefined, Error, NewTrack, MutationContext>;
  deleteTrack: UseMutationResult<string, Error, string, MutationContext>;
  handleDelete: (_id: string) => Promise<void>;
}

export const useLikedTracks = (): UseLikedTracksReturn => {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const user = (session as Session)?.user;

  const fetchLikedTracks = async (): Promise<LikedTrack[]> => {
    if (!user) {
      return [];
    }
    try {
      const data = await apiFetch<LikedTrack[]>('/api/track/like');
      return data || [];
    } catch (err: unknown) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error('[fetchLikedTracks]', err);
      }
      return [];
    }
  };

  const {
    data: likedTracks = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['likedTracks'],
    queryFn: fetchLikedTracks,
    enabled: !!user,
    staleTime: 1000 * 60,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (user?.id) {
      refetch();
    }

    if (!user) {
      queryClient.setQueryData(['likedTracks'], []);
    }
  }, [user?.id, refetch, queryClient, user]);

  const likeTrack = useMutation<LikedTrack | undefined, Error, NewTrack, MutationContext>({
    mutationFn: async ({ title, artist, artwork = '', youtubeUrl = '' }: NewTrack): Promise<LikedTrack | undefined> => {
      if (!title || !artist) {
        throw new Error('Titre ou artiste manquant');
      }
      const res = await apiFetch<{ likedTrack: LikedTrack }>('/api/track/like', {
        method: 'POST',
        body: JSON.stringify({ title, artist, artwork, youtubeUrl }),
      });
      return res?.likedTrack;
    },
    onMutate: async (newTrack: NewTrack): Promise<MutationContext> => {
      await queryClient.cancelQueries({ queryKey: ['likedTracks'] });
      const previousTracks = queryClient.getQueryData<LikedTrack[]>(['likedTracks']) ?? [];
      const optimisticTrack: OptimisticTrack = { ...newTrack, id: `optimistic-${  Date.now()}` };
      queryClient.setQueryData(['likedTracks'], (old: LikedTrack[] = []) => [...old, optimisticTrack]);
      return { previousTracks };
    },
    onError: (err: Error, _newTrack: NewTrack, context?: MutationContext): void => {
      if (context) {
        queryClient.setQueryData(['likedTracks'], context.previousTracks);
      }
      toast.error(err.message ?? 'Erreur lors du like');
    },
    onSuccess: (): void => {
      queryClient.invalidateQueries({ queryKey: ['likedTracks'] });
      toast.success('🎶 Morceau liké !');
    },
  });

  const deleteTrack = useMutation<string, Error, string, MutationContext>({
    mutationFn: async (id: string): Promise<string> => {
      if (!id) {
        throw new Error('ID invalide');
      }
      await apiFetch(`/api/track/like/${id}`, { method: 'DELETE' });
      return id;
    },
    onMutate: async (id: string): Promise<MutationContext> => {
      await queryClient.cancelQueries({ queryKey: ['likedTracks'] });
      const previousTracks = queryClient.getQueryData<LikedTrack[]>(['likedTracks']) ?? [];
      queryClient.setQueryData(['likedTracks'], (old: LikedTrack[] = []) =>
        old.filter(track => track.id !== id),
      );
      return { previousTracks };
    },
    onError: (err: Error, _id: string, context?: MutationContext): void => {
      if (context) {
        queryClient.setQueryData(['likedTracks'], context.previousTracks);
      }
      toast.error(err.message ?? 'Erreur lors de la suppression');
    },
    onSuccess: (): void => {
      queryClient.invalidateQueries({ queryKey: ['likedTracks'] });
      toast.success('🗑️ Morceau supprimé');
    },
  });

  const handleDelete = async (id: string): Promise<void> => {
    if (!id) {
      toast.error('ID invalide');
      return;
    }
    try {
      await deleteTrack.mutateAsync(id);
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error('[handleDelete]', err);
    }
  };

  return {
    likedTracks,
    isLoading,
    isError,
    refetch,
    likeTrack,
    deleteTrack,
    handleDelete,
  };
};
