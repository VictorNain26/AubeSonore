/**
 * AirPlay Service (Safari only)
 *
 * Based on Apple documentation:
 * https://developer.apple.com/documentation/webkitjs/adding_an_airplay_button_to_your_safari_media_controls
 *
 * Key APIs:
 * - window.WebKitPlaybackTargetAvailabilityEvent - Check support
 * - webkitplaybacktargetavailabilitychanged - Device availability
 * - webkitShowPlaybackTargetPicker() - Show device picker
 * - webkitCurrentPlaybackTargetIsWireless - Connection state
 * - webkitcurrentplaybacktargetiswirelesschanged - Connection changes
 *
 * Note from Apple: "Because monitoring AirPlay availability may drain battery power,
 * you should avoid registering a listener unless you have a specific need for it"
 */

/**
 * Check if AirPlay is supported (Safari only)
 */
export function isAirPlaySupported(): boolean {
  return 'WebKitPlaybackTargetAvailabilityEvent' in window;
}

/**
 * Check if currently playing to a wireless AirPlay device
 */
function isAirPlayActive(element: HTMLMediaElement): boolean {
  return (
    (element as HTMLMediaElement & { webkitCurrentPlaybackTargetIsWireless?: boolean })
      .webkitCurrentPlaybackTargetIsWireless ?? false
  );
}

/**
 * Show the AirPlay device picker
 * Must be called from a user gesture (click handler)
 */
export function showAirPlayPicker(element: HTMLMediaElement): void {
  const el = element as HTMLMediaElement & { webkitShowPlaybackTargetPicker?: () => void };
  if (typeof el.webkitShowPlaybackTargetPicker === 'function') {
    el.webkitShowPlaybackTargetPicker();
  }
}

// Callback types
type AvailabilityCallback = (available: boolean) => void;
type ConnectionCallback = (isWireless: boolean) => void;

/**
 * Subscribe to AirPlay availability changes
 *
 * From Apple docs: "When you register a listener for this event type,
 * an initial event is automatically dispatched to inform you of the current availability state"
 *
 * @returns Cleanup function to remove listener
 */
export function onAirPlayAvailabilityChanged(
  element: HTMLMediaElement,
  callback: AvailabilityCallback
): () => void {
  if (!isAirPlaySupported()) {
    return () => {};
  }

  const handler = (event: Event) => {
    const e = event as Event & { availability?: 'available' | 'not-available' };
    callback(e.availability === 'available');
  };

  element.addEventListener('webkitplaybacktargetavailabilitychanged', handler);

  return () => {
    element.removeEventListener('webkitplaybacktargetavailabilitychanged', handler);
  };
}

/**
 * Subscribe to AirPlay connection state changes
 * Fires when user connects/disconnects from AirPlay device
 *
 * @returns Cleanup function to remove listener
 */
export function onAirPlayConnectionChanged(
  element: HTMLMediaElement,
  callback: ConnectionCallback
): () => void {
  if (!isAirPlaySupported()) {
    return () => {};
  }

  const handler = () => {
    callback(isAirPlayActive(element));
  };

  element.addEventListener('webkitcurrentplaybacktargetiswirelesschanged', handler);

  return () => {
    element.removeEventListener('webkitcurrentplaybacktargetiswirelesschanged', handler);
  };
}
