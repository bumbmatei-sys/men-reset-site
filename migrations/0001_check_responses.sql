-- Anonymous self-check rows for The Reset.
-- No IP address, user agent, name, or account id.
-- email is NULL unless the person asks to receive the plan.

CREATE TABLE IF NOT EXISTS check_responses (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  age_range TEXT NOT NULL,
  region TEXT NOT NULL,
  struggle TEXT NOT NULL,
  duration TEXT NOT NULL,
  frequency TEXT NOT NULL,
  trigger TEXT NOT NULL,
  faith TEXT,
  want TEXT NOT NULL,
  source TEXT NOT NULL,
  plan_variant TEXT NOT NULL,
  recommended_track TEXT NOT NULL,
  email TEXT
);

CREATE INDEX IF NOT EXISTS idx_check_responses_created_at ON check_responses (created_at);
CREATE INDEX IF NOT EXISTS idx_check_responses_struggle ON check_responses (struggle);
