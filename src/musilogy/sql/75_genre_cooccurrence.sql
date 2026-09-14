-- How close two genres are, measured by the bands that carry both. The frieze
-- population is the one that counts: an order computed over artists the frieze
-- never draws would arrange the vocabulary around evidence the reader cannot see.
--
-- Pair by pair this is wider than density: a band enters the frieze on one
-- density-eligible genre, after which every genre it declares co-occurs with
-- every other. Restricting to eligible genres here would hide from the order
-- the very adjacencies those bands are evidence of.
--
-- Cosine rather than the raw count: measured against a name-derived family
-- label, cosine ranks same-family pairs above cross-family pairs with AUC
-- 0.781 against 0.674 for the raw count, which is dominated by every edge
-- touching rock. Descriptive figures; the frozen ones are in
-- tests/test_baseline.py.
CREATE OR REPLACE TABLE genre_cooccurrence AS
WITH carried AS (
  SELECT f.mbid AS band_mbid, t.g.mbid AS genre_mbid
  FROM frieze f
  JOIN bands b ON b.mbid = f.mbid,
  UNNEST(b.genres) AS t(g)
),
sizes AS (
  SELECT genre_mbid, count(*) AS n FROM carried GROUP BY genre_mbid
)
SELECT
  a.genre_mbid AS genre_a,
  z.genre_mbid AS genre_b,
  count(*)::BIGINT AS n_bands,
  count(*) / sqrt(sa.n::DOUBLE * sz.n) AS cosine
FROM carried a
JOIN carried z ON a.band_mbid = z.band_mbid AND a.genre_mbid < z.genre_mbid
JOIN sizes sa ON sa.genre_mbid = a.genre_mbid
JOIN sizes sz ON sz.genre_mbid = z.genre_mbid
GROUP BY a.genre_mbid, z.genre_mbid, sa.n, sz.n;
