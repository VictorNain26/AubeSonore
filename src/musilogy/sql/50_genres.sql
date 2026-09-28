-- Vocabulary actually carried by artists.
CREATE OR REPLACE TABLE genres AS
SELECT g.mbid AS genre_mbid, any_value(g.name) AS name, count(*) AS n_artists
FROM artists, UNNEST(artists.genres) AS t(g)
GROUP BY g.mbid;
