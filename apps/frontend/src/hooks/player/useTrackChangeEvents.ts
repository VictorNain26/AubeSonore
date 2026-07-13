import { useEffect, useRef } from 'react';
import { useSleepTimer } from '../../stores/sleepTimerStore';

// Notifies the sleep timer when AzuraCast flips to a new track (sh_id changes),
// so end-of-track mode triggers.
//
// The first observed shId is treated as "initial mount", not a transition,
// so we don't fire on the very first poll.

export function useTrackChangeEvents(
  shId: number | undefined,
  _artist: string | undefined,
  _title: string | undefined
): void {
  const sleepTimerTrigger = useSleepTimer((s) => s.triggerEndOfTrack);
  const prevShIdRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (shId !== undefined && shId !== prevShIdRef.current) {
      if (prevShIdRef.current !== undefined) {
        sleepTimerTrigger();
      }
      prevShIdRef.current = shId;
    }
  }, [shId, sleepTimerTrigger]);
}
