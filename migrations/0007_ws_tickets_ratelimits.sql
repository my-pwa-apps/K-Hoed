-- Short-lived WS tickets so the host JWT is never exposed in a URL
CREATE TABLE IF NOT EXISTS ws_tickets (
  id         TEXT    PRIMARY KEY,
  session_id TEXT    NOT NULL,
  host_id    TEXT    NOT NULL,
  expires_at INTEGER NOT NULL
);

-- D1-backed rate-limit buckets (survives Worker cold starts)
CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT    PRIMARY KEY,
  count        INTEGER NOT NULL DEFAULT 1,
  window_start INTEGER NOT NULL
);
