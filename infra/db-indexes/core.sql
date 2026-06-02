-- resido_core — cross-cutting raw indexes (member phone sync from auth)

CREATE INDEX CONCURRENTLY IF NOT EXISTS members_phone_idx
  ON members (phone);
