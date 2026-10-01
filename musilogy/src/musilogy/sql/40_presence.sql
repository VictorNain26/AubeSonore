-- Only artists with a non-NULL y0 are eligible for presence. y_end already
-- carries its own declared/last-album fallback (30_bands_lifespan.sql): this
-- table only clamps it to the dump year.
CREATE OR REPLACE TABLE presence AS
SELECT
  mbid,
  y0,
  least(getvariable('dump_year'), coalesce(y_end, y0)) AS y_presence_end
FROM artists
WHERE y0 IS NOT NULL;

-- Published on artists: without it, layer 1 would have to reimplement the
-- presence rule.
ALTER TABLE artists ADD COLUMN y_presence_end INTEGER;
UPDATE artists SET y_presence_end = (
  SELECT p.y_presence_end FROM presence p WHERE p.mbid = artists.mbid
);
