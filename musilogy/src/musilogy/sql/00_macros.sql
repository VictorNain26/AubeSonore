CREATE OR REPLACE MACRO yr(s) AS
  CASE WHEN regexp_full_match(substr(s, 1, 4), '[0-9]{4}')
       THEN CAST(substr(s, 1, 4) AS INTEGER) END;
