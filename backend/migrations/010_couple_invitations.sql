-- 010_couple_invitations.sql
-- Couple-creation kræver nu accept fra partneren (issue A4).
-- Primary opretter en invitation; partner accepterer/afviser. Først ved
-- accept dannes selve couple_profile-rækken. Sikrer at par ikke kan
-- "påtvinges" og at begge parter aktivt har sagt ja.

CREATE TABLE IF NOT EXISTS couple_invitation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  partner_user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  bio TEXT,
  region TEXT,
  open_to_singles BOOLEAN NOT NULL DEFAULT false,
  accepts_mixed_events BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  CHECK (primary_user_id <> partner_user_id)
);

-- Kun én pending invitation pr. (primary, partner) ad gangen. Historiske
-- statusser (declined/cancelled/expired/accepted) må have flere rækker.
CREATE UNIQUE INDEX IF NOT EXISTS idx_couple_invitation_pending_pair
  ON couple_invitation (primary_user_id, partner_user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_couple_invitation_partner_pending
  ON couple_invitation (partner_user_id, created_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_couple_invitation_primary_pending
  ON couple_invitation (primary_user_id, created_at DESC)
  WHERE status = 'pending';
