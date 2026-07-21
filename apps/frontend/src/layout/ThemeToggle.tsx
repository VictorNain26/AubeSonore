import { useState } from 'react';
import { setTheme, type Theme } from '../lib/theme';
import { ThemeToggleView } from '../design/molecules/ThemeToggle';

function currentTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export function ThemeToggle() {
  const [theme, setLocalTheme] = useState<Theme>(currentTheme);
  const next: Theme = theme === 'dark' ? 'light' : 'dark';

  return (
    <ThemeToggleView
      theme={theme}
      onToggle={() => {
        setTheme(next);
        setLocalTheme(next);
      }}
    />
  );
}
