-- Email addresses from the plan gate (lesson phases and the check result).
-- No quiz answers, name, IP address, user agent, or account id.

CREATE TABLE IF NOT EXISTS plan_emails (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  email TEXT NOT NULL,
  source TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plan_emails_created_at ON plan_emails (created_at);
