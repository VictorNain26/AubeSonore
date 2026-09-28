-- How much of a genre the multi-artist rule of 20_albums.sql destroys.
-- That rule (a release-group must be credited to exactly one distinct artist)
-- amputates genres very unevenly — on the reference dump it costs `classical`
-- 94.3% of its candidate release-groups against 0.6% for `alternative metal`
-- — so a density computed over a genre that loses most of its albums is not
-- comparable to any other. The rate is measured here and published on
-- `genres`; 60_density.sql then excludes on the measurement, never on a list
-- of genre names, which would be exactly the arbitrary judgment this replaces.
--
-- Candidates come from raw_release_groups, NOT from `albums`: `albums` has
-- already dropped the multi-artist release-groups, so the rate read there
-- would be zero by construction and the loss unrecoverable.
--
-- Genres come from genres_declared, NOT from `genres`: a band that takes its
-- albums' genres (25_band_genres.sql) does so only through albums credited to
-- it alone, so every one of its candidates is single-artist and the rate would
-- be pulled down by construction. On the reference dump that bias alone lets
-- `modern classical` fall from 78.8 % to 38.7 % and leave the exclusion.
CREATE OR REPLACE TABLE genre_multi_artist_drop AS
WITH candidates AS (
  SELECT list_distinct(artists) AS credited,
         len(list_distinct(artists)) > 1 AS multi
  FROM raw_release_groups
  WHERE yr(date) BETWEEN getvariable('min_year') AND getvariable('dump_year')
    AND len(list_filter(coalesce(secondary, []), s -> s NOT IN ('Soundtrack', 'Demo'))) = 0
),
credits AS (
  SELECT unnest(credited) AS artist_mbid, multi FROM candidates
)
SELECT
  t.g.mbid AS genre_mbid,
  -- Credited (release-group, genre) rows, not distinct release-groups: a
  -- release-group credited to two artists that both carry the genre counts
  -- twice, which is the right weighting for the rate below and the wrong one
  -- for anything that reads it as an album count. `classical` measures 27 199
  -- credit rows for 25 465 distinct candidate release-groups.
  count(*) AS n_candidate_credits,
  round(100.0 * sum(c.multi::INTEGER) / count(*), 1) AS multi_artist_drop_pct
FROM credits c
JOIN bands b ON b.mbid = c.artist_mbid,
     UNNEST(b.genres_declared) AS t(g)
GROUP BY t.g.mbid;

ALTER TABLE genres ADD COLUMN n_candidate_credits BIGINT;
ALTER TABLE genres ADD COLUMN multi_artist_drop_pct DOUBLE;
-- A genre whose bands credit no candidate release-group has zero candidates —
-- a measured fact — but no rate at all: the share stays NULL rather than being
-- published as 0%, which would assert a measurement nobody could make.
UPDATE genres SET
  n_candidate_credits = coalesce((
    SELECT d.n_candidate_credits FROM genre_multi_artist_drop d
    WHERE d.genre_mbid = genres.genre_mbid
  ), 0),
  multi_artist_drop_pct = (
    SELECT d.multi_artist_drop_pct FROM genre_multi_artist_drop d
    WHERE d.genre_mbid = genres.genre_mbid
  );

-- The rule itself, materialized once here rather than recomposed by every
-- consumer. Without it the two measurements travel but the two bounds do not,
-- so layer 1 has to hardcode 50 and 200 to know which genres density
-- withholds — reimplementing a rule is where it gets lost. coalesce, not a
-- bare comparison: a NULL rate means no candidate at all, which keeps the
-- genre eligible instead of silencing it through three-valued logic.
ALTER TABLE genres ADD COLUMN density_eligible BOOLEAN;
UPDATE genres SET density_eligible = NOT coalesce(
  multi_artist_drop_pct >= getvariable('multi_artist_drop_limit')
    AND n_candidate_credits >= getvariable('min_candidate_credits'),
  false
);

-- Counter for manifest.json: a rule that removes data must leave a visible
-- trace. On the reference dump the rule excludes 13 genres. Twelve are art
-- music; the thirteenth, `mincecore` (73.1% on 216 candidates), is a grindcore
-- microgenre and a false positive. It is not special-cased: an exception list
-- would reintroduce the named judgment the measurement exists to avoid, so
-- that genre is the measured cost of the rule.
CREATE OR REPLACE TABLE density_exclusions AS
SELECT count(*) AS genres, coalesce(sum(n_bands), 0) AS band_genre_pairs
FROM genres
WHERE NOT density_eligible;
