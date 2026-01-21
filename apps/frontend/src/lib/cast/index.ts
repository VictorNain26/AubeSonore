/**
 * Cast services - unified exports
 */

// Chromecast
export {
  initializeChromecast,
  getCastState,
  getCurrentSession,
  isChromecastAvailable,
  isCasting as isChromecastCasting,
  getConnectedDeviceName as getChromecastDeviceName,
  requestSession as requestChromecastSession,
  loadMedia as loadChromecastMedia,
  endSession as endChromecastSession,
  onCastStateChanged,
  onSessionStateChanged,
} from './chromecast';

// AirPlay
export {
  isAirPlayAvailable,
  isAirPlayConnected,
  enableAirPlay,
  showAirPlayPicker,
  onAirPlayAvailabilityChanged,
  onAirPlayConnectionChanged,
} from './airplay';

// SDK Loader
export { loadCastSDK, isCastSDKLoaded, getCastFramework, getCastContext } from './loader';

// Types
export type { CastMediaMetadata, CastType, CastConnectionState } from '../../types/cast';
