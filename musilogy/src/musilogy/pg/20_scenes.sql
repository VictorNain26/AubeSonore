-- The artists the frieze can place — a year and a genre, 285 284 of 2,3 M on
-- the reference dump — with only what the rankings read: the contemporaries'
-- scene and genres, the window's genres and listen count. A projection, like
-- density: read from `artists`, whose rows carry their genres as JSON and
-- their raw evidence, the largest scene (71 835 candidates in the US) took
-- 50 000 pages off disk, and the window joined all 989 488 popularity rows to
-- rank one genre.
CREATE TABLE scenes AS
  SELECT a.mbid, a.begin_area_mbid, a.country, a.y0, a.y_presence_end, a.genre_mbids,
         p.listen_count
  FROM artists a
  LEFT JOIN popularity p USING (mbid)
  WHERE a.y0 IS NOT NULL AND a.genre_mbids <> '{}';
ALTER TABLE scenes ADD PRIMARY KEY (mbid);
CREATE INDEX ON scenes (begin_area_mbid);
CREATE INDEX ON scenes (country);
-- The frieze window looks artists up by genre (frieze_window, 90_frieze).
CREATE INDEX ON scenes USING gin (genre_mbids);
