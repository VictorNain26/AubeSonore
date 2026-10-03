-- The density population, written once: artists of type Group, with a
-- non-NULL y0, and each of their genres the multi-artist rule of 20_albums.sql
-- does not mostly destroy. Those genres are dropped here and only here:
-- artists, albums, genres and links keep every one of them, because
-- population and projection are two different things. The rule is measured
-- and materialized in 55_genre_reliability.sql and published on `genres`, so
-- this file applies it and layer 1 reads it — neither restates it.
CREATE OR REPLACE TABLE density_memberships AS
SELECT p.mbid, p.y0, p.y_presence_end, g.mbid AS genre_mbid
FROM presence p
JOIN artists b USING (mbid),
     UNNEST(b.genres) AS t(g)
WHERE b.type = 'Group'
  AND EXISTS (
    SELECT 1 FROM genres gx
    WHERE gx.genre_mbid = t.g.mbid AND gx.density_eligible
  );

-- Groups present per genre and per year. A band counts in each of its
-- genres: per-genre totals do not add up.
CREATE OR REPLACE TABLE density AS
SELECT genre_mbid, y.year, count(*) AS present
FROM density_memberships,
     range(getvariable('min_year'), getvariable('dump_year') + 1) AS y(year)
WHERE y.year BETWEEN y0 AND y_presence_end
GROUP BY genre_mbid, y.year;

-- Distinct groups present per year, the same population counted once each:
-- the denominator that turns a genre's density into its share of the year.
-- Without it a frieze shows MusicBrainz's growth (36 groups present in 1900,
-- 138 135 in 2010) instead of the genres' history.
CREATE OR REPLACE TABLE activity AS
SELECT y.year, count(DISTINCT mbid) AS groups
FROM density_memberships,
     range(getvariable('min_year'), getvariable('dump_year') + 1) AS y(year)
WHERE y.year BETWEEN y0 AND y_presence_end
GROUP BY y.year;
