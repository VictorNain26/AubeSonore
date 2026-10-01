-- y0/y_end, both edges: declared evidence wins, albums are the fallback.
--
-- Governing principle, applied at both edges: album evidence is used for one
-- edge only when it does not contradict declared evidence at the other edge.
-- Each refused inference feeds a counter in neutralised_inferences (manifest,
-- same spirit as r2_anomalies): a neutralised anomaly stays visible instead of
-- being silently absorbed by the guard that removes it.
CREATE OR REPLACE TABLE lifespan_evidence AS
SELECT
  b.mbid,
  -- Refused when the first album postdates a declared end: that album is a
  -- posthumous reissue, whose release-group first-release-date is the reissue
  -- date, not evidence of formation. Refused too when the artist declares a
  -- begin below min_year, neutralised by 10_bands.sql (y0_declared is already
  -- NULL here, hence the flag carried over from `dated`): the source asserts
  -- the group predates its albums, so inferring a later formation from the
  -- first album would assert more than the source says.
  --
  -- Refused as well when the declared end falls below min_year: every album
  -- postdates it, so each one is a posthumous release — Bach, dead in 1750,
  -- whose recordings would otherwise start his activity in 1961. The end is
  -- neutralised in 10_bands.sql, which is why its flag is read here rather
  -- than y_end_declared.
  --
  -- A person's birth bounds the albums the same way: a first album before it
  -- contradicts it, and a birth below min_year says the person predates every
  -- album the window admits, as a group's early begin does — Robert Ballard,
  -- born 1575, would otherwise start in 2019.
  b.y_first_album IS NOT NULL
    AND (b.y_end_declared IS NULL OR b.y_first_album <= b.y_end_declared)
    AND NOT d.begin_below_min_year
    AND NOT d.end_below_min_year
    AND NOT d.birth_below_min_year
    AND (b.y_birth IS NULL OR b.y_first_album >= b.y_birth) AS first_album_is_evidence,
  -- Mirror guard: a last album predating a declared begin would close a life
  -- that had not started. The inference is dropped, y_end and y_end_source
  -- both stay NULL.
  --
  -- Same refusal as above for an end below min_year: a last album after the
  -- end is no evidence of when the activity stopped.
  --
  -- And a last album before a person's birth closes nothing that happened.
  b.y_last_album IS NOT NULL
    AND (b.y0_declared IS NULL OR b.y_last_album >= b.y0_declared)
    AND NOT d.end_below_min_year
    AND (b.y_birth IS NULL OR b.y_last_album >= b.y_birth) AS last_album_is_evidence
FROM artists b JOIN dated d USING (mbid);

CREATE OR REPLACE TABLE neutralised_inferences AS
SELECT
  count(*) FILTER (
    WHERE b.y0_declared IS NULL AND b.y_first_album IS NOT NULL
      AND b.y_end_declared IS NOT NULL AND b.y_first_album > b.y_end_declared
  ) AS first_album_after_declared_end,
  count(*) FILTER (
    WHERE b.y_end_declared IS NULL AND b.y_last_album IS NOT NULL
      AND b.y0_declared IS NOT NULL AND b.y_last_album < b.y0_declared
  ) AS last_album_before_declared_begin,
  count(*) FILTER (
    WHERE b.y0_declared IS NULL AND b.y_first_album IS NOT NULL
      AND d.begin_below_min_year
  ) AS first_album_with_begin_below_min_year,
  count(*) FILTER (
    WHERE b.y_first_album IS NOT NULL AND d.end_below_min_year
  ) AS album_with_end_below_min_year,
  count(*) FILTER (
    WHERE b.y_first_album IS NOT NULL AND d.birth_below_min_year
  ) AS first_album_with_birth_below_min_year,
  count(*) FILTER (
    WHERE b.y_first_album IS NOT NULL AND b.y_first_album < b.y_birth
  ) AS first_album_before_birth,
  count(*) FILTER (
    WHERE b.y_last_album IS NOT NULL AND b.y_last_album < b.y_birth
  ) AS last_album_before_birth
FROM artists b JOIN dated d USING (mbid);

ALTER TABLE artists ADD COLUMN y0 INTEGER;
ALTER TABLE artists ADD COLUMN y0_source VARCHAR;
ALTER TABLE artists ADD COLUMN y_end INTEGER;
ALTER TABLE artists ADD COLUMN y_end_source VARCHAR;

-- y_end >= y0 needs no clamp of its own, and carries none: every surviving
-- pair is already ordered. y_end_declared >= yr(begin) (10_bands.sql) orders
-- declared/declared; first_album_is_evidence rules out y_first_album >
-- y_end_declared; last_album_is_evidence rules out y_last_album < y0_declared;
-- and max(y) >= min(y) over the same albums orders first_album/last_album.
UPDATE artists SET
  y0 = CASE
    WHEN y0_declared IS NOT NULL THEN y0_declared
    WHEN e.first_album_is_evidence THEN y_first_album
  END,
  y0_source = CASE
    WHEN y0_declared IS NOT NULL THEN 'declared'
    WHEN e.first_album_is_evidence THEN 'first_album'
  END,
  y_end = CASE
    WHEN y_end_declared IS NOT NULL THEN y_end_declared
    WHEN e.last_album_is_evidence THEN y_last_album
  END,
  y_end_source = CASE
    WHEN y_end_declared IS NOT NULL THEN 'declared'
    WHEN e.last_album_is_evidence THEN 'last_album'
  END
FROM lifespan_evidence e
WHERE e.mbid = artists.mbid;
