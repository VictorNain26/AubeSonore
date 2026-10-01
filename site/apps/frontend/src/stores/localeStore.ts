import { create } from 'zustand';
import {
  getLocale,
  localizeUrl,
  setLocale as setParaglideLocale,
  type Locale,
} from '@/paraglide/runtime.js';

// Each language has its own URL (/ and /en/, the url strategy). Paraglide's
// setLocale() navigates there, which would kill the live stream; this store
// swaps the URL in place, then re-renders from the app root. The <audio>
// element lives outside React (lib/player) so playback keeps going.

// The listener's last explicit choice, so a returning English listener who
// types aubesonore.fr lands on /en/ (see main.tsx).
const CHOICE_KEY = 'aubesonore-locale';

export function readLocaleChoice(): string | null {
  try {
    return localStorage.getItem(CHOICE_KEY);
  } catch {
    return null;
  }
}

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: getLocale(),
  setLocale: (locale) => {
    window.history.replaceState(null, '', localizeUrl(window.location.href, { locale }).href);
    try {
      localStorage.setItem(CHOICE_KEY, locale);
    } catch {
      // private mode: the URL still carries the language
    }
    void setParaglideLocale(locale, { reload: false });
    document.documentElement.lang = locale;
    set({ locale });
  },
}));
