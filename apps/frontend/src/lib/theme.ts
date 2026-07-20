export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'aubesonore-theme';

export function resolveTheme(stored: string | null, prefersDark: boolean): Theme {
  if (stored === 'light' || stored === 'dark') return stored;
  return prefersDark ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
}

let mediaListener: ((e: MediaQueryListEvent | { matches: boolean }) => void) | null = null;

export function initTheme(): Theme {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const theme = resolveTheme(localStorage.getItem(THEME_STORAGE_KEY), media.matches);
  applyTheme(theme);

  if (!localStorage.getItem(THEME_STORAGE_KEY)) {
    mediaListener = (e) => {
      const newTheme = resolveTheme(localStorage.getItem(THEME_STORAGE_KEY), e.matches);
      applyTheme(newTheme);
    };
    media.addEventListener('change', mediaListener);
  }

  return theme;
}
