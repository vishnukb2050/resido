-- resido_core — resident-specific raw indexes (core.sql + flaredthread.sql + business.sql cover shared tables)
-- Optional: GIN on reminder target arrays if member-facing reminder queries grow

-- CREATE INDEX CONCURRENTLY IF NOT EXISTS reminders_target_members_gin
--   ON reminders USING GIN ("targetMembers");

SELECT 1;
