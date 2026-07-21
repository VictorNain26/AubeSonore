import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '../design/atoms/Button';
import { setTheme, type Theme } from '../lib/theme';

function currentTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export function ThemeToggle() {
  const [theme, setLocalTheme] = useState<Theme>(currentTheme);
  const next: Theme = theme === 'dark' ? 'light' : 'dark';

  return (
    <Button
      variant="icon"
      aria-label={next === 'dark' ? 'Passer au thème sombre' : 'Passer au thème clair'}
      onClick={() => {
        setTheme(next);
        setLocalTheme(next);
      }}
    >
      {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  );
}
