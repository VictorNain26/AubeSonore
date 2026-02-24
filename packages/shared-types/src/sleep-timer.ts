// Sleep timer types — shared between frontend and mobile

export type SleepTimerMode = 'timer' | 'end-of-track' | null;

export interface SleepTimerState {
  isActive: boolean;
  endTime: number | null;
  remainingMs: number;
  originalVolume: number;
  isFadingOut: boolean;
  mode: SleepTimerMode;
}
