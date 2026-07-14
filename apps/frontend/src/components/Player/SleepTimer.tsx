import { Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSleepTimer } from '../../stores/sleepTimerStore';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../ui/DropdownMenu';

const PRESETS = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '60 min', minutes: 60 },
] as const;

function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function SleepTimer() {
  const { isActive, remainingMs, mode, start, startEndOfTrack, cancel } = useSleepTimer();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'p-2 rounded-md transition-colors relative cursor-pointer',
            isActive
              ? 'text-accent hover:text-accent hover:bg-paper-raised'
              : 'text-ink-faint hover:text-ink hover:bg-paper-raised'
          )}
          aria-label={isActive ? 'Minuterie active' : 'Minuterie de sommeil'}
          title={isActive ? 'Minuterie active' : 'Minuterie de sommeil'}
        >
          <Moon className="w-5 h-5" />
          {isActive && mode === 'timer' && (
            <span className="absolute -top-1 -right-2 min-w-[18px] px-1 text-caption font-medium tabular-nums text-accent">
              {formatCountdown(remainingMs)}
            </span>
          )}
          {isActive && mode === 'end-of-track' && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-accent" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="center" className="w-48">
        <DropdownMenuLabel>Minuterie</DropdownMenuLabel>
        {PRESETS.map((preset) => (
          <DropdownMenuItem key={preset.minutes} onSelect={() => start(preset.minutes)}>
            {preset.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onSelect={() => startEndOfTrack()}>Fin du morceau</DropdownMenuItem>
        {isActive && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem intent="danger" onSelect={() => cancel()}>
              Annuler
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
