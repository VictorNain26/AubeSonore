-- Lineage: model_mbid is a model of artist_mbid, in the exact sense of
-- `source`. Read one way it gives an artist's inspirations, the other way its
-- descendants. Each source keeps its own term — a teacher is not a declared
-- influence — and a pair asserted by two sources stays two rows.
--
-- The direction of each MusicBrainz type was checked against age on the
-- reference dump: the teacher is the source of a `teacher` link (the older in
-- 21 918 cases against 235), the target of a `tribute` or `named after
-- artist` link is the model (older 20 to 1, 55 to 2).
--
-- One row per pair and source: `links` keeps a pair once per span of years
-- (20 teacher pairs carry several), and those years are no part of lineage.
CREATE OR REPLACE TABLE lineage AS
SELECT DISTINCT
  CASE WHEN type = 'teacher' THEN dst_mbid ELSE src_mbid END AS artist_mbid,
  CASE WHEN type = 'teacher' THEN src_mbid ELSE dst_mbid END AS model_mbid,
  CASE type
    WHEN 'teacher' THEN 'mb_teacher'
    WHEN 'tribute' THEN 'mb_tribute'
    WHEN 'named after artist' THEN 'mb_named_after'
  END AS source
FROM links
WHERE type IN ('teacher', 'tribute', 'named after artist');
