import { useEffect } from 'react';
import { create } from 'zustand';

// ─────────────────────────────────────────────
// Banner slot — single source of truth for which floating
// banner is allowed to show. Highest priority wins.
// Avoids visual overlap when PWA + Push prompts are both active.
// ─────────────────────────────────────────────

interface Claim {
  id: string;
  priority: number;
}

interface BannerSlotState {
  claims: Claim[];
}

const useStore = create<BannerSlotState>(() => ({ claims: [] }));

const selectActiveId = (state: BannerSlotState): string | null => {
  if (state.claims.length === 0) return null;
  const sorted = [...state.claims].sort((a, b) => b.priority - a.priority);
  return sorted[0]?.id ?? null;
};

/**
 * Claim a banner slot with a given priority while `want` is true.
 * Returns true only if `want` is true AND this id has the highest priority
 * claim. Releases automatically on unmount or when `want` becomes false.
 */
export function useBannerSlot(id: string, priority: number, want: boolean): boolean {
  const activeId = useStore(selectActiveId);

  useEffect(() => {
    if (!want) return;
    useStore.setState((state) => ({
      claims: [...state.claims.filter((c) => c.id !== id), { id, priority }],
    }));
    return () => {
      useStore.setState((state) => ({
        claims: state.claims.filter((c) => c.id !== id),
      }));
    };
  }, [id, priority, want]);

  return want && activeId === id;
}
