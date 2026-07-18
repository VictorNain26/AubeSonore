export type Moment = 'dawn' | 'day' | 'dusk' | 'night';

export const MOMENT_BOUNDS: Record<Moment, { start: number; end: number }> = {
  dawn: { start: 5, end: 9 },
  day: { start: 9, end: 17 },
  dusk: { start: 17, end: 22 },
  night: { start: 22, end: 5 },
};

export const MOMENT_LABELS: Record<Moment, string> = {
  dawn: 'Aube',
  day: 'Jour',
  dusk: 'Crépuscule',
  night: 'Nuit',
};

export const MOMENT_SHARE_PHRASES: Record<Moment, string> = {
  dawn: "à l'aube",
  day: 'en journée',
  dusk: 'au crépuscule',
  night: 'dans la nuit',
};

export const MOMENT_ORDER: Moment[] = ['dawn', 'day', 'dusk', 'night'];

export const MOMENT_TAGLINES: Record<Moment, string> = {
  dawn: 'Le jour se lève sur ce qui restait dans l’ombre.',
  day: 'Plein jour sur les morceaux qui le méritent.',
  dusk: 'La lumière descend, l’écoute se resserre.',
  night: 'La nuit veille sur les découvertes de demain.',
};

export function getMoment(date: Date): Moment {
  const h = date.getHours();
  if (h >= 5 && h < 9) return 'dawn';
  if (h >= 9 && h < 17) return 'day';
  if (h >= 17 && h < 22) return 'dusk';
  return 'night';
}

export function nextBoundary(date: Date): Date {
  const starts = [5, 9, 17, 22];
  const next = new Date(date);
  const upcoming = starts.find((h) => h > date.getHours());
  if (upcoming !== undefined) {
    next.setHours(upcoming);
  } else {
    next.setHours(5);
    next.setDate(next.getDate() + 1);
  }
  next.setMinutes(0);
  next.setSeconds(0);
  next.setMilliseconds(0);
  return next;
}
