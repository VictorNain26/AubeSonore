import {
  check,
  integer,
  maxValue,
  minValue,
  object,
  optional,
  pipe,
  regex,
  safeParse,
  string,
  toLowerCase,
  transform,
  uuid,
  type InferOutput,
} from 'valibot';

// MBIDs are compared byte for byte in musilogy (COLLATE "C"): lowercased here.
const Mbid = pipe(string(), uuid('identifiant MusicBrainz invalide'), toLowerCase());

const whole = (min: number, max: number) =>
  pipe(
    string(),
    regex(/^\d+$/, 'entier attendu'),
    transform(Number),
    integer(),
    minValue(min),
    maxValue(max)
  );

// The tables span 1850 to the dump year; the bounds only keep absurd values
// away from Postgres.
const Year = whole(1000, 2100);

const WindowSchema = pipe(
  object({
    genre: Mbid,
    from: Year,
    to: Year,
    limit: optional(whole(1, 500), '100'),
    offset: optional(whole(0, 1_000_000), '0'),
  }),
  check((q) => q.from <= q.to, 'période inversée')
);

const ArtistQuerySchema = object({ contemporaries: optional(whole(0, 1_000_000), '0') });

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const messages = (issues: { message: string }[]): string => issues.map((i) => i.message).join(', ');

export function parseWindowQuery(query: unknown): Parsed<InferOutput<typeof WindowSchema>> {
  const r = safeParse(WindowSchema, query);
  return r.success ? { ok: true, value: r.output } : { ok: false, error: messages(r.issues) };
}

export function parseMbid(value: unknown): Parsed<string> {
  const r = safeParse(Mbid, value);
  return r.success ? { ok: true, value: r.output } : { ok: false, error: messages(r.issues) };
}

export function parseArtistQuery(query: unknown): Parsed<InferOutput<typeof ArtistQuerySchema>> {
  const r = safeParse(ArtistQuerySchema, query);
  return r.success ? { ok: true, value: r.output } : { ok: false, error: messages(r.issues) };
}
