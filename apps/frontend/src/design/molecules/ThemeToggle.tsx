import { Moon, Sun } from 'lucide-react';
import { Button } from '../atoms/Button';
import type { Theme } from '../../lib/theme';

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
