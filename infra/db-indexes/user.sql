-- resido_users — extensions + expression indexes (run after prisma db push on user schema)

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- User search (ILIKE contains on name / profileName)
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_name_trgm
  ON users USING GIN (lower("name") gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS users_profilename_trgm
  ON users USING GIN (lower("profileName") gin_trgm_ops);

-- getPublicIdentitiesBatch: isActive + linkBusinessProfile
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_active_link_business
  ON users ("isActive", "linkBusinessProfile")
  WHERE "isActive" = true;

-- JobProfile geo search + service area (profile.service raw SQL)
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE INDEX CONCURRENTLY IF NOT EXISTS jp_geog_gist
  ON job_profiles
  USING GIST (
    (ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography)
  )
  WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS jp_service_area_values_gin
  ON job_profiles USING GIN ("serviceAreaValues");
