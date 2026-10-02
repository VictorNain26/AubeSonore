-- The contemporaries of one artist, computed on demand: a full list would run
-- to about 188 million rows (2 000 artists sampled by hash(mbid), median 21,
-- p99 9 667), while one artist answers in about 100 ms on the reference dump.
--
-- Each criterion is a definition, never a chosen threshold:
-- - contemporary: years of presence that overlap, read from y0 and
--   y_presence_end, so an absent end is not extended;
-- - same scene: the same begin area, by identity rather than by name (London
--   is a name shared with Ontario), or the same country when the artist has
--   no begin area. `scene` says which one matched;
-- - a shared genre.
-- The list is not cut, it is ordered: Jaccard similarity of the genres, then
-- mbid, a total order. The shared genres travel with each row, as the reason
-- for the link.
CREATE OR REPLACE MACRO contemporaries(artist) AS TABLE
WITH a AS (
  SELECT mbid, y0, y_presence_end, begin_area_mbid, country,
         list_transform(genres, g -> g.mbid) AS genre_mbids
  FROM artists
  WHERE mbid = artist AND y0 IS NOT NULL AND len(genres) > 0
),
b AS (
  SELECT x.mbid, x.name, x.disambiguation, x.y0, x.y_presence_end,
         CASE WHEN a.begin_area_mbid IS NOT NULL THEN 'begin_area' ELSE 'country' END AS scene,
         list_filter(x.genres, g -> list_contains(a.genre_mbids, g.mbid)) AS shared,
         len(list_distinct(list_concat(a.genre_mbids, list_transform(x.genres, g -> g.mbid)))) AS n_union
  FROM a JOIN artists x
    ON x.mbid <> a.mbid
   AND x.y0 <= a.y_presence_end AND a.y0 <= x.y_presence_end
   AND CASE WHEN a.begin_area_mbid IS NOT NULL THEN x.begin_area_mbid = a.begin_area_mbid
            ELSE x.country = a.country END
  WHERE len(x.genres) > 0
)
SELECT mbid, name, disambiguation, y0, y_presence_end, scene,
       list_transform(shared, g -> g.name) AS shared_genres,
       len(shared) / n_union AS jaccard
FROM b
WHERE len(shared) > 0
ORDER BY jaccard DESC, mbid;
