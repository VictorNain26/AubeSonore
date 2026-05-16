import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useLikedTracksStore } from '../stores/likedTracksStore';
import { usePreferencesStore } from '../stores/preferencesStore';
import { useStatsStore } from '../stores/statsStore';

// Invisible side-effect host that hydrates the auth session once and
// bridges auth transitions to the auth-dependent stores (liked tracks,
// preferences). Replaces the previous AuthProvider mount + AuthDataSync
// pairing — same observable behavior, one mounted component instead of
// two and zero React Context.

export function AuthInit(): null {
  useEffect(() => {
    let cancelled = false;

    // Hydrate session once. After init resolves, fire the initial sync
    // pass: signed-in users get their liked tracks + preferences fetched
    // before the first interactive frame.
    void (async () => {
      await useAuthStore.getState().init();
      if (cancelled) return;
      if (useAuthStore.getState().isAuthenticated) {
        void useLikedTracksStore.getState().refresh();
        void usePreferencesStore.getState().refresh();
        void useStatsStore.getState().syncFromServer();
      }
    })();

    // Subscribe to subsequent transitions (sign-in / sign-out after init).
    // Skip the loading-state window so we don't double-fire alongside the
    // explicit post-init sync above.
    const unsubscribe = useAuthStore.subscribe((state, prevState) => {
      if (state.isLoading || prevState.isLoading) return;
      if (state.isAuthenticated === prevState.isAuthenticated) return;
      if (state.isAuthenticated) {
        void useLikedTracksStore.getState().refresh();
        void usePreferencesStore.getState().refresh();
        void useStatsStore.getState().syncFromServer();
      } else {
        useLikedTracksStore.getState().clear();
        usePreferencesStore.getState().clear();
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return null;
}
