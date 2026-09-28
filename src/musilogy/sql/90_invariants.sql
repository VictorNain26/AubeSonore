-- Each view must be empty. The view's name is the invariant's name.
-- Unique and non-null mbid: a NULL mbid is a violation even
-- alone, group by NULL does not let it slip through under count(*) = 1.
CREATE OR REPLACE VIEW duplicate_band AS
  SELECT mbid FROM bands GROUP BY mbid HAVING count(*) > 1 OR mbid IS NULL;
-- [1850, 2026] is the reference dump's contractual window, hardcoded here on
-- purpose at BOTH ends, independently of the min_year/dump_year session
-- variables used by the production rules: this invariant re-asserts the
-- contractual bound, it must not read it back from the same variables the
-- production rules rely on, or a wrong variable value would satisfy both
-- silently. Moving to another dump therefore requires editing these literals
-- — that deliberate edit is the point of the invariant.
-- Only bands with a non-NULL y0 are subject to the window at all: the rest
-- of the population is published without any timeline claim.
CREATE OR REPLACE VIEW band_out_of_window AS
  SELECT mbid FROM bands
  WHERE y0 IS NOT NULL AND (y0 < 1850 OR y0 > 2026);
-- Split in two: an end before the start and an end after the dump are
-- two unrelated anomalies, a single name would hide which one broke.
CREATE OR REPLACE VIEW end_before_begin AS
  SELECT mbid FROM bands WHERE y_end IS NOT NULL AND y0 IS NOT NULL AND y_end < y0;
CREATE OR REPLACE VIEW end_after_dump_year AS
  SELECT mbid FROM bands
  WHERE y_end_declared IS NOT NULL AND y_end_declared > 2026;
-- The end's lower bound, twin of end_after_dump_year: both the declared end
-- and the published one are subject to it, y_last_album being already bounded
-- by album_out_of_window.
CREATE OR REPLACE VIEW end_before_min_year AS
  SELECT mbid FROM bands
  WHERE (y_end_declared IS NOT NULL AND y_end_declared < 1850)
     OR (y_end IS NOT NULL AND y_end < 1850);
-- y0/y_end_source (30_bands_lifespan.sql): a source is non-NULL exactly when
-- the value it names is non-NULL, and it must name the branch that actually
-- produced that value. Both views state that contract directly, on the
-- published columns alone: reusing the production expression would compare a
-- value to itself and stay empty however wrong the value is.
CREATE OR REPLACE VIEW y0_source_mismatch AS
  SELECT mbid FROM bands
  WHERE (y0 IS NULL) <> (y0_source IS NULL)
     OR (y0_source = 'declared' AND y0 IS DISTINCT FROM y0_declared)
     OR (y0_source = 'first_album' AND y0 IS DISTINCT FROM y_first_album)
     OR (y0_source IS NOT NULL AND y0_source NOT IN ('declared', 'first_album'));
CREATE OR REPLACE VIEW y_end_source_mismatch AS
  SELECT mbid FROM bands
  WHERE (y_end IS NULL) <> (y_end_source IS NULL)
     OR (y_end_source = 'declared' AND y_end IS DISTINCT FROM y_end_declared)
     OR (y_end_source = 'last_album' AND y_end IS DISTINCT FROM y_last_album)
     OR (y_end_source IS NOT NULL AND y_end_source NOT IN ('declared', 'last_album'));
-- Same idiom as last_album_mismatch below, for its twin y_first_album.
CREATE OR REPLACE VIEW first_album_mismatch AS
  SELECT b.mbid FROM bands b
  WHERE b.y_first_album IS DISTINCT FROM
        (SELECT min(a.y) FROM albums a WHERE a.band_mbid = b.mbid);
CREATE OR REPLACE VIEW last_album_mismatch AS
  SELECT b.mbid FROM bands b
  WHERE b.y_last_album IS DISTINCT FROM
        (SELECT max(a.y) FROM albums a WHERE a.band_mbid = b.mbid);
-- NOT EXISTS, not NOT IN: a single NULL mbid returned by the subquery would
-- make NOT IN never true, silencing this invariant forever.
CREATE OR REPLACE VIEW album_without_band AS
  SELECT rg_mbid FROM albums a
  WHERE NOT EXISTS (SELECT 1 FROM bands b WHERE b.mbid = a.band_mbid);
-- The +/-5-year window around y0 is gone (albums no longer depend on y0):
-- only the contractual [1850, 2026] bound applies, hardcoded at both ends,
-- same reasoning as band_out_of_window above.
CREATE OR REPLACE VIEW album_out_of_window AS
  SELECT a.rg_mbid FROM albums a
  WHERE a.y < 1850 OR a.y > 2026;
-- `albums` does not keep the secondary types; re-checked via
-- rg_mbid against raw_release_groups, which stays available after the build.
CREATE OR REPLACE VIEW album_extra_secondary_type AS
  SELECT a.rg_mbid FROM albums a JOIN raw_release_groups r ON r.mbid = a.rg_mbid
  WHERE len(list_filter(coalesce(r.secondary, []), s -> s NOT IN ('Soundtrack', 'Demo'))) > 0;
-- Independent of the sort applied at construction time (10_bands.sql):
-- compares each adjacent pair, does not reuse bands' sort formula.
-- Both raw lists are checked; `genres` is one of them, which
-- genre_source_mismatch pins.
CREATE OR REPLACE VIEW band_genres_out_of_order AS
  SELECT mbid FROM bands, (SELECT unnest([genres_declared, genres_from_albums]) AS l) AS t
  WHERE len(t.l) > 1
    AND EXISTS (
      SELECT 1 FROM range(1, len(t.l)) AS r(i)
      WHERE t.l[i + 1].votes > t.l[i].votes
         OR (t.l[i + 1].votes = t.l[i].votes AND t.l[i + 1].name < t.l[i].name)
    );
-- 25_band_genres.sql: genre_source is non-NULL exactly when a band has
-- genres, and it names the list `genres` was copied from; `albums` only
-- ever stands in for a band that declares nothing.
CREATE OR REPLACE VIEW genre_source_mismatch AS
  SELECT mbid FROM bands
  WHERE (len(genres) = 0) <> (genre_source IS NULL)
     OR (genre_source = 'declared' AND genres IS DISTINCT FROM genres_declared)
     OR (genre_source = 'albums'
         AND (genres IS DISTINCT FROM genres_from_albums OR len(genres_declared) > 0))
     OR (genre_source IS NOT NULL AND genre_source NOT IN ('declared', 'albums'));
-- Recomputed from the release-groups themselves, with the votes summed by a
-- GROUP BY rather than read back from band_album_genres.
CREATE OR REPLACE VIEW genres_from_albums_mismatch AS
  WITH expected AS (
    SELECT band_mbid AS mbid, list_sort(list({'mbid': genre, 'votes': votes})) AS l
    FROM (
      SELECT a.band_mbid, t.g.mbid AS genre, sum(t.g.votes)::INTEGER AS votes
      FROM albums a
      JOIN raw_release_groups r ON r.mbid = a.rg_mbid,
           UNNEST(coalesce(r.genres, [])) AS t(g)
      GROUP BY ALL
    )
    GROUP BY band_mbid
  )
  SELECT b.mbid FROM bands b LEFT JOIN expected e USING (mbid)
  WHERE list_sort(list_transform(b.genres_from_albums, x -> {'mbid': x.mbid, 'votes': x.votes}))
        IS DISTINCT FROM coalesce(e.l, []);
-- NOT EXISTS, not NOT IN: see album_without_band above, same NULL trap.
CREATE OR REPLACE VIEW unknown_genre AS
  SELECT t.g.mbid FROM (SELECT unnest(genres) AS g FROM bands) t
  WHERE NOT EXISTS (SELECT 1 FROM genres g WHERE g.genre_mbid = t.g.mbid);
-- Independent recomputation, same rationale as last_album_mismatch.
CREATE OR REPLACE VIEW genre_n_bands_mismatch AS
  SELECT g.genre_mbid FROM genres g
  WHERE g.n_bands <> (
    SELECT count(*) FROM bands b, UNNEST(b.genres) AS t(x) WHERE t.x.mbid = g.genre_mbid
  );
-- Independent restatement of the presence rule: presence only ever exists for
-- a band with a non-NULL y0 (the join guarantees it), and its end is the
-- band's end clamped to the dump year. The three cases are enumerated rather
-- than composed back into least(dump_year, coalesce(...)): copying
-- 40_presence.sql's expression would compare the value to itself. 2026
-- hardcoded at both ends, same reasoning as band_out_of_window above.
CREATE OR REPLACE VIEW presence_out_of_range AS
  SELECT p.mbid FROM presence p JOIN bands b USING (mbid)
  WHERE p.y_presence_end < p.y0 OR p.y_presence_end > 2026
     OR p.y_presence_end <> CASE
          WHEN b.y_end IS NULL THEN least(p.y0, 2026)
          WHEN b.y_end > 2026 THEN 2026
          ELSE b.y_end
        END;
-- Same idiom as 20_albums.sql/last_album_mismatch, for its twin
-- 40_presence.sql: bands.y_presence_end (published in Parquet and in
-- web/bands_timeline.json.gz / web/bands_rest.json.gz) must stay identical to
-- presence.y_presence_end (from which density derives), otherwise the two
-- published artifacts could diverge.
CREATE OR REPLACE VIEW presence_end_mismatch AS
  SELECT b.mbid FROM bands b JOIN presence p USING (mbid)
  WHERE b.y_presence_end IS DISTINCT FROM p.y_presence_end;
-- [1850, 2026] hardcoded on purpose, same reasoning as band_out_of_window.
CREATE OR REPLACE VIEW density_out_of_range AS
  SELECT genre_mbid FROM density WHERE year > 2026 OR year < 1850;
-- LEFT JOIN: a genre_mbid absent from the vocabulary must not make the
-- density row disappear from its own check.
CREATE OR REPLACE VIEW density_above_band_count AS
  SELECT d.genre_mbid FROM density d LEFT JOIN genres g USING (genre_mbid)
  WHERE g.genre_mbid IS NULL OR d.present > g.n_bands;
-- Independent recomputation of density's own eligibility rule (same idiom as
-- last_album_mismatch): only a band of type Group, with a non-NULL y0, that
-- carries the genre in question, may be counted for that genre and year.
CREATE OR REPLACE VIEW density_population_mismatch AS
  SELECT d.genre_mbid, d.year FROM density d
  WHERE d.present <> (
    SELECT count(*) FROM bands b, UNNEST(b.genres) AS t(g)
    WHERE b.type = 'Group' AND b.y0 IS NOT NULL
      AND t.g.mbid = d.genre_mbid
      AND d.year BETWEEN b.y0 AND b.y_presence_end
  );
-- The multi-artist unreliability, recomputed from raw_release_groups and
-- bands, never from genres.n_candidate_credits / genres.multi_artist_drop_pct:
-- reading back the published measurement would compare it to itself and stay
-- silent if the measurement itself were wrong. 50 and 200 hardcoded, like
-- [1850, 2026] above and for the same reason — these views re-assert the
-- contractual rule instead of reading back the session variables the
-- production rules depend on. Not an invariant: it legitimately returns rows,
-- and density_excluded_genre_present / density_missing_cell both read it.
-- It still shares 55_genre_reliability.sql's secondary-type filter and raw
-- inputs, so it only catches a drift in the 50/200 bounds or in this
-- recomputation itself, never an error already present in the shared formula
-- — a wrong secondary-type filter applied identically on both sides would
-- stay silent here too.
CREATE OR REPLACE VIEW genre_unreliable_recomputed AS
  WITH credits AS (
    SELECT unnest(list_distinct(artists)) AS artist_mbid,
           len(list_distinct(artists)) > 1 AS multi
    FROM raw_release_groups
    WHERE yr(date) BETWEEN 1850 AND 2026
      AND len(list_filter(coalesce(secondary, []), s -> s NOT IN ('Soundtrack', 'Demo'))) = 0
  )
  -- genres_declared, like the rule: album genres would bias the rate down.
  SELECT t.g.mbid AS genre_mbid
  FROM credits c JOIN bands b ON b.mbid = c.artist_mbid,
       UNNEST(b.genres_declared) AS t(g)
  GROUP BY t.g.mbid
  HAVING count(*) >= 200
     AND round(100.0 * sum(c.multi::INTEGER) / count(*), 1) >= 50;
-- 60_density.sql excludes the genres the multi-artist rule makes unreliable;
-- none of them may keep a single density row.
CREATE OR REPLACE VIEW density_excluded_genre_present AS
  SELECT DISTINCT d.genre_mbid FROM density d
  WHERE EXISTS (SELECT 1 FROM genre_unreliable_recomputed u WHERE u.genre_mbid = d.genre_mbid);
-- The twin density_population_mismatch does not have: that view iterates over
-- the rows that exist and says nothing about the ones that vanished. This one
-- enumerates the cells the population implies and reports those density does
-- not carry. Same [1850, 2026] literals, same reason.
CREATE OR REPLACE VIEW density_missing_cell AS
  SELECT DISTINCT t.g.mbid AS genre_mbid, y.year
  FROM bands b,
       UNNEST(b.genres) AS t(g),
       range(1850, 2027) AS y(year)
  WHERE b.type = 'Group'
    AND b.y0 IS NOT NULL
    AND y.year BETWEEN b.y0 AND b.y_presence_end
    AND NOT EXISTS (
      SELECT 1 FROM genre_unreliable_recomputed u WHERE u.genre_mbid = t.g.mbid
    )
    AND NOT EXISTS (
      SELECT 1 FROM density d WHERE d.genre_mbid = t.g.mbid AND d.year = y.year
    );
-- 80_members.sql. The band side is a local reference and must resolve; the
-- person side is deliberately not checked, it points outside this pipeline.
-- NOT EXISTS, not NOT IN: see album_without_band above, same NULL trap.
CREATE OR REPLACE VIEW member_without_band AS
  SELECT band_mbid FROM members m
  WHERE NOT EXISTS (SELECT 1 FROM bands b WHERE b.mbid = m.band_mbid);
-- A relation whose person is NULL points at nothing and must never be
-- published. Stated on the published column, not on the WHERE clause that
-- produced it.
CREATE OR REPLACE VIEW member_without_person AS
  SELECT band_mbid FROM members WHERE person_mbid IS NULL;
-- The de-duplication restated as a contract on the published rows, counting
-- them instead of reapplying the DISTINCT that produced them. NULL years group
-- together here exactly as DISTINCT collapses them.
CREATE OR REPLACE VIEW duplicate_member AS
  SELECT band_mbid, person_mbid, y_begin, y_end FROM members
  GROUP BY ALL HAVING count(*) > 1;
-- corrections.csv holds at most 50 rows; materialized even empty
-- by apply_corrections, so available without depending on the dump.
CREATE OR REPLACE VIEW corrections_file_too_large AS
  SELECT count(*) AS n FROM corrections HAVING count(*) > 50;
-- A row that touches no raw_artists, or carries a field outside {begin,
-- end}, is loaded (counts toward the 50-row cap) without ever changing
-- anything: a silent no-op, not a correction.
-- NOT EXISTS for the mbid check, not NOT IN: see album_without_band above,
-- same NULL trap (raw_artists.mbid is never NULL in practice, but nothing
-- guarantees it, and this check must not rely on that).
CREATE OR REPLACE VIEW corrections_invalid AS
  SELECT c.mbid, c.field FROM corrections c
  WHERE c.field NOT IN ('begin', 'end')
     OR NOT EXISTS (SELECT 1 FROM raw_artists r WHERE r.mbid = c.mbid);
-- extract.py projects {Group, Orchestra, Choir} and nothing else; 60_density.sql
-- narrows further to Group. Neither is stated in SQL, so a change to KEPT_TYPES
-- moved the population and the projection at once, in silence. Hardcoded here
-- like every other contractual bound: widening the population must be a
-- deliberate edit of this literal.
CREATE OR REPLACE VIEW band_unexpected_type AS
  SELECT mbid FROM bands
  WHERE type IS NULL OR type NOT IN ('Group', 'Orchestra', 'Choir');
-- apply_corrections runs UPDATE ... FROM corrections: two rows for the same
-- (mbid, field) make the applied value depend on scan order. The file is empty
-- today, which is exactly when the contract is cheap to state.
CREATE OR REPLACE VIEW corrections_duplicate AS
  SELECT mbid, field FROM corrections GROUP BY mbid, field HAVING count(*) > 1;
