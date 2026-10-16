-- Topics visitors want a course or teaching on, plus the email to notify when it is published. No IP address or user agent.

CREATE TABLE IF NOT EXISTS topic_requests (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  email TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_topic_requests_created_at ON topic_requests (created_at);
CREATE INDEX IF NOT EXISTS idx_topic_requests_email ON topic_requests (email);
