-- resido_geodata — location search + reverse geocode

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE INDEX CONCURRENTLY IF NOT EXISTS lm_placename_trgm
  ON location_master USING GIN (lower("placeName") gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS lm_district_trgm
  ON location_master USING GIN (lower(district) gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS lm_geog_gist
  ON location_master
  USING GIST (
    (ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography)
  )
  WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL;
