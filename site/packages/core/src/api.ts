import type {
  ClientLikedTrack,
  LikeTrackRequest,
  CheckLikedRequest,
  CheckLikedResponse,
  UserPreferences,
  PreferredPlatform,
} from '@aubesonore/shared-types/client';

export interface ApiClient {
  fetch: <T>(endpoint: string, options?: RequestInit) => Promise<T>;
}

export function createTrackApi(client: ApiClient): {
  getLikedTracks: () => Promise<ClientLikedTrack[]>;
  likeTrack: (data: LikeTrackRequest) => Promise<{ message: string; track: ClientLikedTrack }>;
  unlikeTrack: (trackId: string) => Promise<{ message: string; track: ClientLikedTrack }>;
  checkLiked: (data: CheckLikedRequest) => Promise<CheckLikedResponse>;
  refreshLinks: (trackId: string) => Promise<{ message: string; track: ClientLikedTrack }>;
  refreshAllLinks: () => Promise<{ message: string; updated: number }>;
} {
  return {
    getLikedTracks: (): Promise<ClientLikedTrack[]> => client.fetch('/api/track/like'),

    likeTrack: (data: LikeTrackRequest): Promise<{ message: string; track: ClientLikedTrack }> =>
      client.fetch('/api/track/like', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    unlikeTrack: (trackId: string): Promise<{ message: string; track: ClientLikedTrack }> =>
      client.fetch(`/api/track/like/${trackId}`, {
        method: 'DELETE',
      }),

    checkLiked: (data: CheckLikedRequest): Promise<CheckLikedResponse> =>
      client.fetch('/api/track/check-liked', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    refreshLinks: (trackId: string): Promise<{ message: string; track: ClientLikedTrack }> =>
      client.fetch(`/api/track/${trackId}/refresh-links`, {
        method: 'POST',
      }),

    refreshAllLinks: (): Promise<{ message: string; updated: number }> =>
      client.fetch('/api/track/refresh-all-links', {
        method: 'POST',
      }),
  };
}

export function createPreferencesApi(client: ApiClient): {
  getPreferences: () => Promise<UserPreferences>;
  updatePreferences: (
    preferredPlatform: PreferredPlatform
  ) => Promise<{ message: string; preferences: UserPreferences }>;
} {
  return {
    getPreferences: (): Promise<UserPreferences> => client.fetch('/api/preferences'),

    updatePreferences: (
      preferredPlatform: PreferredPlatform
    ): Promise<{ message: string; preferences: UserPreferences }> =>
      client.fetch('/api/preferences', {
        method: 'PUT',
        body: JSON.stringify({ preferredPlatform }),
      }),
  };
}
