import {
  object,
  array,
  string,
  number,
  integer,
  minValue,
  maxLength,
  nullable,
  pipe,
  type InferOutput,
} from 'valibot';

// Client-accumulated listening history. Bounded so a crafted PUT can't inflate
// a user's JSONB row without limit.
const MAX_EVENTS = 50_000;
const MAX_TEXT = 500;

const trackEventSchema = object({
  artist: pipe(string(), maxLength(MAX_TEXT)),
  title: pipe(string(), maxLength(MAX_TEXT)),
  timestamp: pipe(number(), integer(), minValue(0)),
});

export const statsSnapshotSchema = object({
  events: pipe(array(trackEventSchema), maxLength(MAX_EVENTS)),
  totalListeningTimeSec: pipe(number(), minValue(0)),
  lastActiveDay: nullable(string()),
  dailyStreak: pipe(number(), integer(), minValue(0)),
});

export type StatsSnapshot = InferOutput<typeof statsSnapshotSchema>;
