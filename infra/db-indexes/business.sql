-- resido_core — business marketplace geo + text search

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE INDEX CONCURRENTLY IF NOT EXISTS bp_geog_gist
  ON business_profiles
  USING GIST (
    (ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography)
  )
  WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS bp_service_area_values_gin
  ON business_profiles USING GIN ("serviceAreaValues");

CREATE INDEX CONCURRENTLY IF NOT EXISTS bp_name_trgm
  ON business_profiles USING GIN (lower("businessName") gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS bp_category_trgm
  ON business_profiles USING GIN (lower(category) gin_trgm_ops);
