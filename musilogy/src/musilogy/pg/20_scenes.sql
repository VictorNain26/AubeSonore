-- The artists a contemporary can be — a year and a genre, 285 284 of 2,3 M
-- on the reference dump — with only what the ranking reads. A projection,
-- like density: an artist row carries its genres as JSON and its raw
-- evidence, so the largest scene (71 835 candidates in the US) read from
-- `artists` took 50 000 pages off disk; read from here it stays in cache.
CREATE TABLE scenes AS
  SELECT mbid, begin_area_mbid, country, y0, y_presence_end, genre_mbids
  FROM artists
  WHERE y0 IS NOT NULL AND genre_mbids <> '{}';
ALTER TABLE scenes ADD PRIMARY KEY (mbid);
CREATE INDEX ON scenes (begin_area_mbid);
CREATE INDEX ON scenes (country);
