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
            'p-2 rounded-full transition-all duration-200 relative cursor-pointer',
            isActive
              ? 'text-purple-400 hover:text-purple-300 hover:bg-white/10'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          )}
          aria-label={isActive ? 'Minuterie active' : 'Minuterie de sommeil'}
          title={isActive ? 'Minuterie active' : 'Minuterie de sommeil'}
        >
          <Moon className="w-5 h-5" />
          {isActive && mode === 'timer' && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-purple-500 text-white text-[10px] flex items-center justify-center font-medium tabular-nums">
              {formatCountdown(remainingMs)}
            </span>
          )}
          {isActive && mode === 'end-of-track' && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-purple-500" />
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
