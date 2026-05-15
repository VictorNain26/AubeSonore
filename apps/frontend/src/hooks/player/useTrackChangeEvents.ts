import { useEffect, useRef } from 'react';
import { useSleepTimer } from '../../stores/sleepTimerStore';
import { useStatsStore } from '../../stores/statsStore';

// Side effects to fire when AzuraCast flips to a new track (sh_id changes):
// - notify the sleep timer (so end-of-track mode triggers)
// - record the track change in stats
//
// The first observed shId is treated as "initial mount", not a transition,
// so we don't fire on the very first poll.

export function useTrackChangeEvents(
  shId: number | undefined,
  artist: string | undefined,
  title: string | undefined
): void {
  const sleepTimerTrigger = useSleepTimer((s) => s.triggerEndOfTrack);
  const recordTrackChange = useStatsStore((s) => s.recordTrackChange);
  const prevShIdRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (shId !== undefined && shId !== prevShIdRef.current) {
      if (prevShIdRef.current !== undefined) {
        sleepTimerTrigger();
        if (artist && title) {
          recordTrackChange(artist, title);
        }
      }
      prevShIdRef.current = shId;
    }
  }, [shId, artist, title, sleepTimerTrigger, recordTrackChange]);
}
