-- Links between artists: every artist-to-artist relation the dump carries,
-- typed. Membership is one type among many — pseudonym, founder, subgroup,
-- rename, teacher, family — and each keeps its MusicBrainz name, so a
-- consumer tells what a link asserts without trusting a category of ours.
--
-- The dump carries each relation on both of its artists, oriented by
-- `direction`: forward on the source, backward on the target. Reading it as
-- source -> target from either side gives the same row, and DISTINCT keeps
-- one. DISTINCT also collapses the relations MusicBrainz emits once per set
-- of attributes (one per instrument credited), which this table drops.
--
-- Years read with yr(), never a direct CAST: an illegible date ("????-01")
-- becomes NULL rather than a guess, and the relation survives without that
-- edge.
CREATE OR REPLACE TABLE link_candidates AS
SELECT DISTINCT
  CASE WHEN t.rel.direction = 'backward' THEN t.rel.mbid ELSE r.mbid END AS src_mbid,
  CASE WHEN t.rel.direction = 'backward' THEN r.mbid ELSE t.rel.mbid END AS dst_mbid,
  t.rel.type,
  yr(t.rel.begin) AS y_begin,
  yr(t.rel."end") AS y_end
FROM raw_artists r, UNNEST(r.relations) AS t(rel)
-- A relation without a target points at nothing: dropped.
WHERE t.rel.mbid IS NOT NULL;

-- Both ends must be artists of this pipeline: a link is a way from one
-- artist to another, and an end outside `artists` has no name, no dates and
-- no genre to land on. The links cut that way are counted, not hidden.
CREATE OR REPLACE TABLE links AS
SELECT l.* FROM link_candidates l
WHERE EXISTS (SELECT 1 FROM artists a WHERE a.mbid = l.src_mbid)
  AND EXISTS (SELECT 1 FROM artists a WHERE a.mbid = l.dst_mbid);

CREATE OR REPLACE TABLE link_exclusions AS
SELECT count(*) AS to_unextracted_artist
FROM link_candidates l
WHERE NOT EXISTS (SELECT 1 FROM artists a WHERE a.mbid = l.src_mbid)
   OR NOT EXISTS (SELECT 1 FROM artists a WHERE a.mbid = l.dst_mbid);
