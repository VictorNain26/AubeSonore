-- What the site reads for the frieze. Functions rather than direct reads of
-- the tables: the site depends on these signatures, not on how the tables are
-- laid out, and every query it runs is tested here against Postgres.

-- The genres of the overview: those density keeps (55_genre_reliability).
CREATE FUNCTION musilogy.frieze_genres()
RETURNS TABLE (genre_mbid text, name text, n_artists bigint)
LANGUAGE sql STABLE
AS $$
  SELECT genre_mbid, name, n_artists
  FROM musilogy.genres
  WHERE density_eligible
  ORDER BY genre_mbid;
$$;

CREATE FUNCTION musilogy.frieze_density()
RETURNS TABLE (genre_mbid text, year integer, present bigint)
LANGUAGE sql STABLE
AS $$
  SELECT genre_mbid, year, present
  FROM musilogy.density
  ORDER BY genre_mbid, year;
$$;

-- Distinct groups present per year, in density's population: the
-- denominator that turns a genre's density into its share of the year.
CREATE FUNCTION musilogy.frieze_activity()
RETURNS TABLE (year integer, groups bigint)
LANGUAGE sql STABLE
AS $$
  SELECT year, groups FROM musilogy.activity ORDER BY year;
$$;

-- The artists present in a genre over a period, most listened first: the
-- page is what to draw first, the total how many remain, and no one is cut
-- (spec, "Visibilité : prioriser sans exclure"). An artist ListenBrainz has
-- no listen of comes after every one it has, then by mbid, a total order.
CREATE FUNCTION musilogy.frieze_window(
  genre text, y_from integer, y_to integer, page_size integer, page_offset integer
)
RETURNS TABLE (
  mbid text,
  name text,
  disambiguation text,
  type text,
  y0 integer,
  y_end integer,
  y_end_source text,
  ended boolean,
  y_presence_end integer,
  listen_count bigint,
  total bigint
)
LANGUAGE sql STABLE
AS $$
  WITH page AS (
    SELECT s.mbid, s.listen_count, count(*) OVER () AS total
    FROM musilogy.scenes s
    WHERE s.genre_mbids @> ARRAY[genre]
      AND s.y0 <= y_to AND y_from <= s.y_presence_end
    ORDER BY s.listen_count DESC NULLS LAST, s.mbid
    LIMIT page_size OFFSET page_offset
  )
  SELECT a.mbid, a.name, a.disambiguation, a.type, a.y0, a.y_end, a.y_end_source,
         a.ended, a.y_presence_end, page.listen_count, page.total
  FROM page JOIN musilogy.artists a USING (mbid)
  ORDER BY page.listen_count DESC NULLS LAST, a.mbid;
$$;

CREATE FUNCTION musilogy.artist_card(artist text)
RETURNS TABLE (
  mbid text,
  name text,
  disambiguation text,
  type text,
  country text,
  begin_area text,
  y_birth integer,
  y0 integer,
  y0_source text,
  y_end integer,
  y_end_source text,
  ended boolean,
  genres jsonb,
  genre_source text,
  listen_count bigint,
  user_count bigint
)
LANGUAGE sql STABLE
AS $$
  SELECT a.mbid, a.name, a.disambiguation, a.type, a.country, a.begin_area, a.y_birth,
         a.y0, a.y0_source, a.y_end, a.y_end_source, a.ended, a.genres, a.genre_source,
         p.listen_count, p.user_count
  FROM musilogy.artists a
  LEFT JOIN musilogy.popularity p USING (mbid)
  WHERE a.mbid = artist;
$$;

-- Every typed link of an artist, read from its side: `forward` when the
-- artist is the source of the MusicBrainz relation, `backward` when it is the
-- target. The type keeps MusicBrainz's name; the front words it.
CREATE FUNCTION musilogy.artist_links(artist text)
RETURNS TABLE (
  type text,
  direction text,
  other_mbid text,
  other_name text,
  other_disambiguation text,
  other_y0 integer,
  y_begin integer,
  y_end integer
)
LANGUAGE sql STABLE
AS $$
  SELECT l.type, 'forward', o.mbid, o.name, o.disambiguation, o.y0, l.y_begin, l.y_end
  FROM musilogy.links l JOIN musilogy.artists o ON o.mbid = l.dst_mbid
  WHERE l.src_mbid = artist
  UNION ALL
  SELECT l.type, 'backward', o.mbid, o.name, o.disambiguation, o.y0, l.y_begin, l.y_end
  FROM musilogy.links l JOIN musilogy.artists o ON o.mbid = l.src_mbid
  WHERE l.dst_mbid = artist
  ORDER BY 1, 2, 7 NULLS LAST, 3;
$$;

-- Inspirations are the rows where the artist is artist_mbid, descendants the
-- rows where it is model_mbid. Each keeps its source, whose own term the
-- front shows: a teacher is not an influence.
CREATE FUNCTION musilogy.artist_lineage(artist text)
RETURNS TABLE (
  side text,
  other_mbid text,
  other_name text,
  other_disambiguation text,
  other_y0 integer,
  other_y_end integer,
  source text
)
LANGUAGE sql STABLE
AS $$
  SELECT 'inspiration', o.mbid, o.name, o.disambiguation, o.y0, o.y_end, l.source
  FROM musilogy.lineage l JOIN musilogy.artists o ON o.mbid = l.model_mbid
  WHERE l.artist_mbid = artist
  UNION ALL
  SELECT 'descendant', o.mbid, o.name, o.disambiguation, o.y0, o.y_end, l.source
  FROM musilogy.lineage l JOIN musilogy.artists o ON o.mbid = l.artist_mbid
  WHERE l.model_mbid = artist
  ORDER BY 1, 7, 5 NULLS LAST, 2;
$$;
