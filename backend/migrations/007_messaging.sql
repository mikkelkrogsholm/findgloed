-- 007_messaging.sql
-- Full messaging: interesse-signaler (gradueret tilladelse fra beslutning 8),
-- 1:1 samtaler, per-event tråde, blokering og rapportering.

-- Interesse-signaler — Frederiks gradueret model.
-- Singles ↔ singles og par ↔ par åbner efter gensidigt signal.
-- Singles → par kræver at paret har open_to_singles = true.
-- Samme event åbner chat for alle deltagere uanset roller.
CREATE TABLE IF NOT EXISTS interest_signal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  to_user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ,
  CHECK (from_user_id <> to_user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_interest_signal_active
  ON interest_signal (from_user_id, to_user_id)
  WHERE withdrawn_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_interest_signal_to
  ON interest_signal (to_user_id, created_at DESC)
  WHERE withdrawn_at IS NULL;

-- 1:1 samtaler. Origin = hvad der åbnede chatten.
CREATE TABLE IF NOT EXISTS conversation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  user_b_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  origin TEXT NOT NULL
    CHECK (origin IN ('mutual_interest', 'shared_event')),
  origin_event_id UUID REFERENCES event(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (user_a_id < user_b_id),
  UNIQUE (user_a_id, user_b_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_users
  ON conversation (user_a_id, user_b_id);

CREATE INDEX IF NOT EXISTS idx_conversation_user_a_last
  ON conversation (user_a_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_user_b_last
  ON conversation (user_b_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS message (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
  sender_user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_message_conversation
  ON message (conversation_id, sent_at);

-- Per-event tråde. Deltagere kan poste før og efter eventet.
CREATE TABLE IF NOT EXISTS event_post (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  author_user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  body TEXT NOT NULL,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  hidden_by_admin_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_event_post_event
  ON event_post (event_id, posted_at);

-- Blokering — én vej. Hvis A blokerer B kan B ikke kontakte A.
CREATE TABLE IF NOT EXISTS user_block (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  blocked_user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (blocker_user_id <> blocked_user_id),
  UNIQUE (blocker_user_id, blocked_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_block_blocked
  ON user_block (blocked_user_id);

-- Rapportering.
CREATE TABLE IF NOT EXISTS user_report (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  reported_user_id TEXT REFERENCES "user"("id") ON DELETE SET NULL,
  reported_message_id UUID REFERENCES message(id) ON DELETE SET NULL,
  reported_event_post_id UUID REFERENCES event_post(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewed', 'dismissed', 'actioned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by_admin_id TEXT REFERENCES "user"("id") ON DELETE SET NULL,
  resolution_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_report_status
  ON user_report (status, created_at);
