-- Smoke checks: expect Index Scan / Bitmap Index Scan, not Seq Scan on large tables.
-- Run: psql "$CORE_WRITE_URL" -f infra/db-indexes/verify.sql

\echo '=== Feed: public flares cursor page ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, "createdAt"
FROM blogs
WHERE "isActive" = true
  AND visibility = 'PUBLIC'
  AND type = 'FLARE'
ORDER BY "createdAt" DESC, id DESC
LIMIT 20;

\echo '=== Hashtag filter ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM blogs
WHERE "isActive" = true
  AND hashtags @> ARRAY['summer']::text[]
ORDER BY "createdAt" DESC
LIMIT 20;

\echo '=== Saved feed interaction lookup ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT b.id
FROM blogs b
WHERE EXISTS (
  SELECT 1 FROM blog_interactions i
  WHERE i."blogId" = b.id
    AND i."userId" = 'sample-user-id'
    AND i.type = 'SAVE'
)
ORDER BY b."createdAt" DESC, b.id DESC
LIMIT 20;

\echo '=== Parking slot capacity ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM business_bookings
WHERE "businessProfileId" = 'sample-profile-id'
  AND "slotId" = 'sample-slot-id'
  AND "bookingDate" = '2026-06-02'
  AND "timeSlot" = '09:00-10:00'
  AND status = 'CONFIRMED';
