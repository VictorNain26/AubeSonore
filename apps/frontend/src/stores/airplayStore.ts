import { create } from 'zustand';
import {
  isAirPlaySupported,
  showAirPlayPicker,
  onAirPlayAvailabilityChanged,
  onAirPlayConnectionChanged,
} from '../lib/cast/airplay';
import { getAudioElement } from '../lib/player';

interface AirPlayStore {
  available: boolean;
  isActive: boolean;
  initialize: () => void;
  openPicker: () => void;
}

let initialized = false;

export const useAirPlayStore = create<AirPlayStore>((set) => ({
  available: false,
  isActive: false,
  initialize: () => {
    if (initialized || !isAirPlaySupported()) return;
    initialized = true;
    const audio = getAudioElement();
    onAirPlayAvailabilityChanged(audio, (available) => set({ available }));
    onAirPlayConnectionChanged(audio, (isWireless) => set({ isActive: isWireless }));
  },
  openPicker: () => {
    showAirPlayPicker(getAudioElement());
  },
}));
