-- ListenBrainz popularity, the a priori importance of the frieze (spec of
-- 2026-10-02): it orders what appears and gets a label first, it never
-- excludes. ListenBrainz answers null for an artist it has no listen of; that
-- artist has no row here rather than a zero, which it did not report.
CREATE OR REPLACE TABLE popularity AS
SELECT
  p.artist_mbid AS mbid,
  p.total_listen_count AS listen_count,
  p.total_user_count AS user_count,
  getvariable('popularity_snapshot') AS snapshot
FROM raw_popularity p
JOIN artists a ON a.mbid = p.artist_mbid
WHERE p.total_listen_count IS NOT NULL;
