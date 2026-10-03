-- The contemporaries of one artist, computed on demand: a full list would run
-- to about 188 million rows (2 000 artists sampled by hash(mbid), median 21,
-- p99 9 667). Installed once the load is swapped in, since it reads the
-- tables under their final schema.
--
-- Each criterion is a definition, never a chosen threshold:
-- - contemporary: years of presence that overlap, read from y0 and
--   y_presence_end, so an absent end is not extended;
-- - same scene: the same begin area, by identity rather than by name (London
--   is a name shared with Ontario), or the same country when the artist has
--   no begin area. `scene` says which one matched;
-- - a shared genre.
-- The list is not cut, it is ordered: Jaccard similarity of the genres, then
-- mbid, a total order. One page comes back with the total beside it; the
-- shared genres travel with each row, in the order of the contemporary's own
-- genres, as the reason for the link, and are read for that page only.
CREATE FUNCTION musilogy.contemporaries(artist text, page_size integer, page_offset integer)
RETURNS TABLE (
  mbid text,
  name text,
  disambiguation text,
  y0 integer,
  y_presence_end integer,
  scene text,
  shared_genres text[],
  jaccard double precision,
  total bigint
)
LANGUAGE sql STABLE
AS $$
  WITH a AS (
    SELECT * FROM musilogy.scenes WHERE mbid = artist
  ),
  -- One branch per scene rather than a CASE in the join: a CASE hides both
  -- columns from their indexes and scans every candidate.
  x AS (
    SELECT x.*, 'begin_area' AS scene
    FROM a JOIN musilogy.scenes x ON x.begin_area_mbid = a.begin_area_mbid
    UNION ALL
    SELECT x.*, 'country' AS scene
    FROM a JOIN musilogy.scenes x ON x.country = a.country
    WHERE a.begin_area_mbid IS NULL
  ),
  -- A genre list holds no mbid twice, so the union is counted by difference.
  scored AS (
    SELECT x.mbid, x.scene,
           s.n::double precision
             / (cardinality(a.genre_mbids) + cardinality(x.genre_mbids) - s.n) AS jaccard
    FROM a JOIN x
      ON x.mbid <> a.mbid
     AND x.y0 <= a.y_presence_end AND a.y0 <= x.y_presence_end
     AND x.genre_mbids && a.genre_mbids
    CROSS JOIN LATERAL (
      SELECT count(*) AS n FROM unnest(x.genre_mbids) AS m WHERE m = ANY (a.genre_mbids)
    ) AS s
  ),
  page AS (
    SELECT mbid, scene, jaccard, count(*) OVER () AS total
    FROM scored
    ORDER BY jaccard DESC, mbid
    LIMIT page_size OFFSET page_offset
  )
  SELECT p.mbid, y.name, y.disambiguation, y.y0, y.y_presence_end, p.scene,
         ARRAY(
           SELECT g ->> 'name'
           FROM jsonb_array_elements(y.genres) WITH ORDINALITY AS e(g, i)
           WHERE g ->> 'mbid' = ANY (a.genre_mbids)
           ORDER BY i
         ),
         p.jaccard, p.total
  FROM a, page p JOIN musilogy.artists y ON y.mbid = p.mbid
  ORDER BY p.jaccard DESC, p.mbid;
$$;
