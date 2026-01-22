/**
 * Cast Services - Unified exports for Chromecast and AirPlay
 */

// SDK Loader
export { loadCastSDK, isCastSDKLoaded, getCastContext, getCurrentSession } from './loader';

// Chromecast
export {
  initializeChromecast,
  getRemotePlayer,
  getRemotePlayerController,
  isChromecastAvailable,
  isConnected as isChromecastConnected,
  getDeviceName as getChromecastDeviceName,
  requestSession as requestChromecastSession,
  loadMedia as loadChromecastMedia,
  endSession as endChromecastSession,
  onCastStateChanged,
  onSessionStateChanged,
  onConnectionChanged as onChromecastConnectionChanged,
  cleanup as cleanupChromecast,
} from './chromecast';

// AirPlay
export {
  isAirPlaySupported,
  enableAirPlay,
  isAirPlayActive,
  showAirPlayPicker,
  onAirPlayAvailabilityChanged,
  onAirPlayConnectionChanged,
} from './airplay';

// Types
export type { CastMediaMetadata, CastType, CastConnectionState } from '../../types/cast';
