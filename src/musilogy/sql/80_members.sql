-- Membership relations: the only temporal relational data the dump carries.
-- 80_ is the free slot after the table's only dependency (10_bands) and before
-- 90_, reserved for the invariants: appending here renumbers nothing.
--
-- Read from the band's side only. The dump carries each relation on both of its
-- artists, and on a person's record the same relation names the band as its
-- target: reading persons too would publish every membership a second time,
-- inverted. person_mbid is not required to be a local row: the member may be
-- of a type this pipeline does not extract.
--
-- Years read with yr(), never a direct CAST: an illegible date ("????-01" on
-- five relations of the reference dump) becomes NULL rather than a guess, the
-- same discipline as everywhere else. The relation itself survives — only
-- its unreadable edge is absent.
--
-- DISTINCT, not a plain projection: MusicBrainz emits one relation per set of
-- attributes, so the same person in the same band over the same period appears
-- once per instrument credited.
CREATE OR REPLACE TABLE members AS
SELECT DISTINCT
  b.mbid AS band_mbid,
  t.m.mbid AS person_mbid,
  yr(t.m.begin) AS y_begin,
  yr(t.m."end") AS y_end
FROM raw_artists r
JOIN artists b ON b.mbid = r.mbid AND b.type <> 'Person',
     UNNEST(r.members) AS t(m)
-- A relation without a person points at nothing: dropped. Zero rows on the
-- reference dump, hence no counter in manifest.json — a counter frozen at 0
-- would claim a measurement nobody made.
WHERE t.m.mbid IS NOT NULL;
