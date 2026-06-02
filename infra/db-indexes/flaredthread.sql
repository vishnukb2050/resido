-- resido_core — flaredthread feed (blogs live on CORE_WRITE_URL)

CREATE INDEX CONCURRENTLY IF NOT EXISTS blogs_hashtags_gin
  ON blogs USING GIN (hashtags);

CREATE INDEX CONCURRENTLY IF NOT EXISTS blogs_active_recent
  ON blogs ("createdAt" DESC, id DESC)
  WHERE "isActive" = true;
