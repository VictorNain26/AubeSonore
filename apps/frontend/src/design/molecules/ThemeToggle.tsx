import { Moon, Sun } from 'lucide-react';
import { Button } from '../atoms/Button';
import type { Theme } from '../../lib/theme';
import * as m from '@/paraglide/messages.js';

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
      aria-label={next === 'dark' ? m.theme_to_dark() : m.theme_to_light()}
      onClick={onToggle}
    >
      {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  );
}
