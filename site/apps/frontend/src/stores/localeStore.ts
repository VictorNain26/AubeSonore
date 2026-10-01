import { create } from 'zustand';
import { getLocale, setLocale as setParaglideLocale, type Locale } from '@/paraglide/runtime.js';

// Paraglide's setLocale() reloads the page by default — fine for content
// sites, but a reload kills the live stream. This store switches the locale
// without reload (reload: false) and triggers a React re-render from the
// app root instead; the <audio> element lives outside React (module
// singleton in lib/player) so playback keeps going.

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: getLocale(),
  setLocale: (locale) => {
    void setParaglideLocale(locale, { reload: false });
    document.documentElement.lang = locale;
    set({ locale });
  },
}));
