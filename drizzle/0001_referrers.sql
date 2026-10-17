-- Optional first-party aggregate statistics. No raw URLs or visitor identifiers.
-- Apply to D1 before enabling AI_DIARY_REFERRER_TRACKING_ENABLED.
CREATE TABLE IF NOT EXISTS referrer_daily (
  day TEXT NOT NULL,
  entry_id TEXT NOT NULL REFERENCES entries(id),
  source_host TEXT NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0 CHECK (hits >= 0),
  PRIMARY KEY (day, entry_id, source_host)
);
CREATE INDEX IF NOT EXISTS idx_referrer_day ON referrer_daily(day);
