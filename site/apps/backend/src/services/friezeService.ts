import { inArray, sql, type SQL } from 'drizzle-orm';
import type {
  ArtistPageRef,
  FriezeArtist,
  FriezeCard,
  FriezeGenreVote,
  FriezeOverview,
  FriezeWindow,
} from '@aubesonore/shared-types/client';
import { db } from '../db/index';
import { artist } from '../db/schema';
import { TtlCache } from '../lib/cache/ttlCache';

// Every musilogy read goes through the functions `musilogy load` installs
// (musilogy/src/musilogy/pg/90_*.sql), tested there against Postgres: the site
// depends on their signatures, never on musilogy's tables. Which artists the
// antenna played is the site's own data, read from `artist`.
// node-postgres returns bigint as a string; every count here fits a double.

export const CONTEMPORARIES_PAGE = 20;
const ONE_HOUR_MS = 60 * 60_000;

// The overview only changes when musilogy is loaded again.
export const friezeOverviewCache = new TtlCache<FriezeOverview>(ONE_HOUR_MS);

type Int8 = string;

const toCount = (value: Int8 | null): number | null => (value === null ? null : Number(value));

async function playedByMbid(mbids: string[]): Promise<Map<string, ArtistPageRef>> {
  if (mbids.length === 0) return new Map();
  const rows = await db
    .select({ id: artist.id, slug: artist.slug, mbid: artist.mbid })
    .from(artist)
    .where(inArray(artist.mbid, [...new Set(mbids)]));
  return new Map(
    rows.flatMap((r) => (r.mbid ? [[r.mbid, { id: r.id, slug: r.slug }] as const] : []))
  );
}

// A page past the end has no row to carry the total: it is then counted on
// the first page of the same list.
async function totalOf<R extends { total: Int8 }>(
  rows: R[],
  offset: number,
  firstPage: () => SQL
): Promise<number> {
  if (rows[0]) return Number(rows[0].total);
  if (offset === 0) return 0;
  const { rows: first } = await db.execute<R>(firstPage());
  return first[0] ? Number(first[0].total) : 0;
}

interface GenreRow extends Record<string, unknown> {
  genre_mbid: string;
  name: string;
  n_artists: Int8;
}

interface DensityRow extends Record<string, unknown> {
  genre_mbid: string;
  year: number;
  present: Int8;
}

export async function getFriezeOverview(): Promise<FriezeOverview> {
  const cached = friezeOverviewCache.get('overview');
  if (cached) return cached;

  const [genres, cells] = await Promise.all([
    db.execute<GenreRow>(sql`SELECT * FROM musilogy.frieze_genres()`),
    db.execute<DensityRow>(sql`SELECT * FROM musilogy.frieze_density()`),
  ]);
  const index = new Map(genres.rows.map((g, i) => [g.genre_mbid, i]));
  const density: FriezeOverview['density'] = { genre: [], year: [], present: [] };
  for (const cell of cells.rows) {
    const genre = index.get(cell.genre_mbid);
    // frieze_density only holds the genres frieze_genres lists.
    if (genre === undefined) continue;
    density.genre.push(genre);
    density.year.push(cell.year);
    density.present.push(Number(cell.present));
  }
  const overview: FriezeOverview = {
    genres: genres.rows.map((g) => ({
      mbid: g.genre_mbid,
      name: g.name,
      artists: Number(g.n_artists),
    })),
    density,
  };
  friezeOverviewCache.set('overview', overview);
  return overview;
}

interface WindowRow extends Record<string, unknown> {
  mbid: string;
  name: string;
  disambiguation: string | null;
  type: string;
  y0: number;
  y_end: number | null;
  y_end_source: string | null;
  ended: boolean | null;
  y_presence_end: number;
  listen_count: Int8 | null;
  total: Int8;
}

export interface WindowQuery {
  genre: string;
  from: number;
  to: number;
  limit: number;
  offset: number;
}

const windowSql = (q: WindowQuery, limit: number, offset: number): SQL =>
  sql`SELECT * FROM musilogy.frieze_window(${q.genre}, ${q.from}, ${q.to}, ${limit}, ${offset})`;

export async function getFriezeWindow(q: WindowQuery): Promise<FriezeWindow> {
  const { rows } = await db.execute<WindowRow>(windowSql(q, q.limit, q.offset));
  const [total, played] = await Promise.all([
    totalOf(rows, q.offset, () => windowSql(q, 1, 0)),
    playedByMbid(rows.map((r) => r.mbid)),
  ]);
  return {
    total,
    artists: rows.map((r) => ({
      mbid: r.mbid,
      name: r.name,
      disambiguation: r.disambiguation,
      y0: r.y0,
      played: played.get(r.mbid) ?? null,
      type: r.type,
      yEnd: r.y_end,
      yEndSource: r.y_end_source,
      ended: r.ended,
      yPresenceEnd: r.y_presence_end,
      listenCount: toCount(r.listen_count),
    })),
  };
}

interface CardRow extends Record<string, unknown> {
  mbid: string;
  name: string;
  disambiguation: string | null;
  type: string;
  country: string | null;
  begin_area: string | null;
  y_birth: number | null;
  y0: number | null;
  y0_source: string | null;
  y_end: number | null;
  y_end_source: string | null;
  ended: boolean | null;
  genres: FriezeGenreVote[];
  genre_source: string | null;
  listen_count: Int8 | null;
  user_count: Int8 | null;
}

interface LinkRow extends Record<string, unknown> {
  type: string;
  direction: 'forward' | 'backward';
  other_mbid: string;
  other_name: string;
  other_disambiguation: string | null;
  other_y0: number | null;
  y_begin: number | null;
  y_end: number | null;
}

interface LineageRow extends Record<string, unknown> {
  side: 'inspiration' | 'descendant';
  other_mbid: string;
  other_name: string;
  other_disambiguation: string | null;
  other_y0: number | null;
  other_y_end: number | null;
  source: string;
}

interface ContemporaryRow extends Record<string, unknown> {
  mbid: string;
  name: string;
  disambiguation: string | null;
  y0: number;
  y_presence_end: number;
  scene: 'begin_area' | 'country';
  shared_genres: string[];
  jaccard: number;
  total: Int8;
}

const contemporariesSql = (mbid: string, offset: number): SQL =>
  sql`SELECT * FROM musilogy.contemporaries(${mbid}, ${CONTEMPORARIES_PAGE}, ${offset})`;

export async function getFriezeArtist(
  mbid: string,
  contemporariesOffset: number
): Promise<FriezeArtist | null> {
  const [card, links, lineage, contemporaries] = await Promise.all([
    db.execute<CardRow>(sql`SELECT * FROM musilogy.artist_card(${mbid})`),
    db.execute<LinkRow>(sql`SELECT * FROM musilogy.artist_links(${mbid})`),
    db.execute<LineageRow>(sql`SELECT * FROM musilogy.artist_lineage(${mbid})`),
    db.execute<ContemporaryRow>(contemporariesSql(mbid, contemporariesOffset)),
  ]);
  const found = card.rows[0];
  if (!found) return null;

  const [total, played] = await Promise.all([
    totalOf(contemporaries.rows, contemporariesOffset, () => contemporariesSql(mbid, 0)),
    playedByMbid([
      found.mbid,
      ...links.rows.map((r) => r.other_mbid),
      ...lineage.rows.map((r) => r.other_mbid),
      ...contemporaries.rows.map((r) => r.mbid),
    ]),
  ]);
  const page = (m: string): ArtistPageRef | null => played.get(m) ?? null;

  const cardOut: FriezeCard = {
    mbid: found.mbid,
    name: found.name,
    disambiguation: found.disambiguation,
    y0: found.y0,
    played: page(found.mbid),
    type: found.type,
    country: found.country,
    beginArea: found.begin_area,
    yBirth: found.y_birth,
    y0Source: found.y0_source,
    yEnd: found.y_end,
    yEndSource: found.y_end_source,
    ended: found.ended,
    genres: found.genres,
    genreSource: found.genre_source,
    listenCount: toCount(found.listen_count),
    userCount: toCount(found.user_count),
  };

  return {
    card: cardOut,
    links: links.rows.map((r) => ({
      type: r.type,
      direction: r.direction,
      artist: {
        mbid: r.other_mbid,
        name: r.other_name,
        disambiguation: r.other_disambiguation,
        y0: r.other_y0,
        played: page(r.other_mbid),
      },
      yBegin: r.y_begin,
      yEnd: r.y_end,
    })),
    lineage: lineage.rows.map((r) => ({
      side: r.side,
      artist: {
        mbid: r.other_mbid,
        name: r.other_name,
        disambiguation: r.other_disambiguation,
        y0: r.other_y0,
        played: page(r.other_mbid),
        yEnd: r.other_y_end,
      },
      source: r.source,
    })),
    contemporaries: {
      total,
      offset: contemporariesOffset,
      items: contemporaries.rows.map((r) => ({
        artist: {
          mbid: r.mbid,
          name: r.name,
          disambiguation: r.disambiguation,
          y0: r.y0,
          played: page(r.mbid),
          yPresenceEnd: r.y_presence_end,
        },
        scene: r.scene,
        sharedGenres: r.shared_genres,
        jaccard: r.jaccard,
      })),
    },
  };
}
