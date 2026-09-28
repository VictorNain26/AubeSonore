-- Aggregate. Deliberately narrower than the population: only artists of
-- type Group, with a non-NULL y0, that carry at least one genre. Per-genre
-- totals do not add up: a band counts in each of them.
CREATE OR REPLACE TABLE density AS
SELECT g.mbid AS genre_mbid, y.year, count(*) AS present
FROM presence p
JOIN artists b USING (mbid),
     UNNEST(b.genres) AS t(g),
     range(getvariable('min_year'), getvariable('dump_year') + 1) AS y(year)
WHERE b.type = 'Group'
  AND y.year BETWEEN p.y0 AND p.y_presence_end
  -- Genres the multi-artist rule of 20_albums.sql mostly destroys are dropped
  -- here and only here: artists, albums, genres and links keep every one of
  -- them, because population and projection are two different things. The rule
  -- is measured and materialized in 55_genre_reliability.sql and published on
  -- `genres`, so this file applies it and layer 1 reads it — neither restates it.
  AND EXISTS (
    SELECT 1 FROM genres gx
    WHERE gx.genre_mbid = t.g.mbid AND gx.density_eligible
  )
GROUP BY g.mbid, y.year;
