/**
 * AirPlay service for web (Safari only)
 * Uses WebKit's AirPlay API
 */

/**
 * Check if AirPlay is available (Safari only)
 */
export function isAirPlayAvailable(): boolean {
  return !!(window as unknown as { WebKitPlaybackTargetAvailabilityEvent?: unknown })
    .WebKitPlaybackTargetAvailabilityEvent;
}

/**
 * Check if currently playing to AirPlay device
 */
export function isAirPlayConnected(audioElement: HTMLAudioElement): boolean {
  return (
    (audioElement as unknown as { webkitCurrentPlaybackTargetIsWireless?: boolean })
      .webkitCurrentPlaybackTargetIsWireless ?? false
  );
}

/**
 * Enable AirPlay on an audio element
 */
export function enableAirPlay(audioElement: HTMLAudioElement): void {
  audioElement.setAttribute('x-webkit-airplay', 'allow');
  audioElement.setAttribute('airplay', 'allow');
}

/**
 * Show AirPlay device picker
 */
export function showAirPlayPicker(audioElement: HTMLAudioElement): void {
  const el = audioElement as unknown as { webkitShowPlaybackTargetPicker?: () => void };
  if (typeof el.webkitShowPlaybackTargetPicker === 'function') {
    el.webkitShowPlaybackTargetPicker();
  }
}

/**
 * Subscribe to AirPlay availability changes
 */
export function onAirPlayAvailabilityChanged(
  audioElement: HTMLAudioElement,
  callback: (available: boolean) => void
): () => void {
  const handler = (event: Event) => {
    const e = event as unknown as { availability?: string };
    callback(e.availability === 'available');
  };

  audioElement.addEventListener('webkitplaybacktargetavailabilitychanged', handler);

  return () => {
    audioElement.removeEventListener('webkitplaybacktargetavailabilitychanged', handler);
  };
}

/**
 * Subscribe to AirPlay connection state changes
 */
export function onAirPlayConnectionChanged(
  audioElement: HTMLAudioElement,
  callback: (isConnected: boolean) => void
): () => void {
  const handler = () => {
    callback(isAirPlayConnected(audioElement));
  };

  audioElement.addEventListener('webkitcurrentplaybacktargetiswirelesschanged', handler);

  return () => {
    audioElement.removeEventListener('webkitcurrentplaybacktargetiswirelesschanged', handler);
  };
}
