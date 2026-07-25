import { Globe } from 'lucide-react';
import { Button } from '../atoms/Button';
import * as m from '@/paraglide/messages.js';
import { getLocale, setLocale } from '@/paraglide/runtime.js';

/**
 * Bascule FR/EN. `setLocale` recharge la page par défaut (comportement
 * Paraglide documenté) : tous les messages se re-rendent sans état React.
 */
export function LanguageToggle() {
  const next = getLocale() === 'fr' ? 'en' : 'fr';

  return (
    <Button
      variant="ghost"
      aria-label={m.language_switch_label()}
      onClick={() => void setLocale(next)}
    >
      <Globe className="size-4" />
      <span>{next.toUpperCase()}</span>
    </Button>
  );
}
