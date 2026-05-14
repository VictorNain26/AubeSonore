import {
  object,
  string,
  number,
  boolean,
  nullable,
  array,
  optional,
  unknown,
  type InferOutput,
} from 'valibot';

const SongSchema = object({
  id: string(),
  art: string(),
  text: string(),
  artist: string(),
  title: string(),
  album: string(),
  genre: string(),
  isrc: string(),
  lyrics: string(),
});

const SongEntrySchema = object({
  sh_id: number(),
  played_at: number(),
  duration: number(),
  playlist: string(),
  streamer: string(),
  is_request: boolean(),
  song: SongSchema,
  elapsed: optional(number()),
  remaining: optional(number()),
});

const ListenersSchema = object({
  total: number(),
  unique: number(),
  current: number(),
});

const LiveStatusSchema = object({
  is_live: boolean(),
  streamer_name: string(),
  broadcast_start: nullable(number()),
  art: nullable(string()),
});

export const NowPlayingSchema = object({
  station: unknown(),
  listeners: ListenersSchema,
  live: LiveStatusSchema,
  now_playing: SongEntrySchema,
  playing_next: nullable(SongEntrySchema),
  song_history: array(SongEntrySchema),
  is_online: boolean(),
});

export type ValidatedNowPlaying = InferOutput<typeof NowPlayingSchema>;
