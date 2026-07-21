import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '../design/atoms/Button';
import { setTheme, type Theme } from '../lib/theme';

function currentTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export interface ThemeToggleViewProps {
  /** Thème actuellement affiché. */
  theme: Theme;
  /** Appelé au clic pour basculer vers l'autre thème. */
  onToggle: () => void;
}

export function ThemeToggleView({ theme, onToggle }: ThemeToggleViewProps) {
  const next: Theme = theme === 'dark' ? 'light' : 'dark';

  return (
    <Button
      variant="icon"
      aria-label={next === 'dark' ? 'Passer au thème sombre' : 'Passer au thème clair'}
      onClick={onToggle}
    >
      {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  );
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
