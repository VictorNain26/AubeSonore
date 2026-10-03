-- The tables the site reads, created in the staging schema the loader puts
-- first on the search_path. Identifiers are COLLATE "C": a tie broken "by
-- mbid" follows byte order, as in DuckDB, whatever the database's locale.
CREATE TABLE artists (
  mbid text COLLATE "C" PRIMARY KEY,
  name text NOT NULL,
  disambiguation text,
  name_key text,
  type text NOT NULL,
  y0_declared integer,
  y_end_declared integer,
  y_birth integer,
  ended boolean,
  country text,
  begin_area text,
  begin_area_mbid text COLLATE "C",
  genres_declared jsonb NOT NULL,
  y_first_album integer,
  y_last_album integer,
  genres_from_albums jsonb NOT NULL,
  genres jsonb NOT NULL,
  -- The mbids of `genres`, in its order: what a query matches genres on,
  -- without unpacking the JSON row by row.
  genre_mbids text[] COLLATE "C" NOT NULL,
  genre_source text,
  y0 integer,
  y0_source text,
  y_end integer,
  y_end_source text,
  y_presence_end integer
);

CREATE TABLE genres (
  genre_mbid text COLLATE "C" PRIMARY KEY,
  name text NOT NULL,
  n_artists bigint NOT NULL,
  n_candidate_credits bigint NOT NULL,
  multi_artist_drop_pct double precision,
  density_eligible boolean NOT NULL
);

CREATE TABLE density (
  genre_mbid text COLLATE "C" NOT NULL,
  year integer NOT NULL,
  present bigint NOT NULL,
  PRIMARY KEY (genre_mbid, year)
);

CREATE TABLE activity (
  year integer PRIMARY KEY,
  groups bigint NOT NULL
);

CREATE TABLE links (
  src_mbid text COLLATE "C" NOT NULL,
  dst_mbid text COLLATE "C" NOT NULL,
  type text NOT NULL,
  y_begin integer,
  y_end integer
);

CREATE TABLE lineage (
  artist_mbid text COLLATE "C" NOT NULL,
  model_mbid text COLLATE "C" NOT NULL,
  source text NOT NULL,
  PRIMARY KEY (artist_mbid, model_mbid, source)
);

CREATE TABLE popularity (
  mbid text COLLATE "C" PRIMARY KEY,
  listen_count bigint NOT NULL,
  user_count bigint NOT NULL,
  snapshot date NOT NULL
);

CREATE TABLE manifest (
  dump text NOT NULL,
  popularity_snapshot date,
  git_sha text NOT NULL,
  loaded_at timestamptz NOT NULL DEFAULT now()
);
