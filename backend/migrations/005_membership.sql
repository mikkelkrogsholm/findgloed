-- 005_membership.sql
-- Identitets-fundament: udvidelse af Better Auth user, par-profiler, billeder med
-- lag-baseret synlighed, privat-album-grants, og verificerings-placeholder.

-- Udvid Better Auth's user-tabel med medlems-felter.
ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS birth_year INTEGER,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS initiator_role TEXT
    CHECK (initiator_role IN ('inviting', 'deciding', 'balanced')),
  ADD COLUMN IF NOT EXISTS face_visibility TEXT NOT NULL DEFAULT 'after_interest'
    CHECK (face_visibility IN ('after_interest', 'all_verified')),
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_verification_status
  ON "user" (verification_status);

CREATE INDEX IF NOT EXISTS idx_user_active
  ON "user" (verification_status, paused_at, deleted_at)
  WHERE verification_status = 'verified' AND paused_at IS NULL AND deleted_at IS NULL;

-- Par-profiler (beslutning 3 + 8).
CREATE TABLE IF NOT EXISTS couple_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  partner_user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  bio TEXT,
  region TEXT,
  open_to_singles BOOLEAN NOT NULL DEFAULT false,
  accepts_mixed_events BOOLEAN NOT NULL DEFAULT false,
  paused_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (primary_user_id <> partner_user_id),
  UNIQUE (primary_user_id, partner_user_id)
);

CREATE INDEX IF NOT EXISTS idx_couple_profile_users
  ON couple_profile (primary_user_id, partner_user_id);

-- Profil-billeder med lag-baseret synlighed (beslutning 4).
CREATE TABLE IF NOT EXISTS profile_photo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id TEXT REFERENCES "user"("id") ON DELETE CASCADE,
  owner_couple_id UUID REFERENCES couple_profile(id) ON DELETE CASCADE,
  kind TEXT NOT NULL
    CHECK (kind IN ('face', 'body', 'ambient', 'private')),
  visibility TEXT NOT NULL
    CHECK (visibility IN ('verified', 'match', 'private')),
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (owner_user_id IS NOT NULL AND owner_couple_id IS NULL)
    OR (owner_user_id IS NULL AND owner_couple_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_profile_photo_owner_user
  ON profile_photo (owner_user_id, position)
  WHERE owner_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profile_photo_owner_couple
  ON profile_photo (owner_couple_id, position)
  WHERE owner_couple_id IS NOT NULL;

-- Privat album grants — opt-in pr. modtager. Hver visning øger view_count
-- og opdaterer last_viewed_at, så ejeren kan se aktiviteten (beslutning 4).
CREATE TABLE IF NOT EXISTS private_album_grant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id TEXT REFERENCES "user"("id") ON DELETE CASCADE,
  owner_couple_id UUID REFERENCES couple_profile(id) ON DELETE CASCADE,
  recipient_user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  last_viewed_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  CHECK (
    (owner_user_id IS NOT NULL AND owner_couple_id IS NULL)
    OR (owner_user_id IS NULL AND owner_couple_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_private_album_grant_user_active
  ON private_album_grant (owner_user_id, recipient_user_id)
  WHERE owner_user_id IS NOT NULL AND revoked_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_private_album_grant_couple_active
  ON private_album_grant (owner_couple_id, recipient_user_id)
  WHERE owner_couple_id IS NOT NULL AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_private_album_grant_recipient
  ON private_album_grant (recipient_user_id)
  WHERE revoked_at IS NULL;

-- Verificerings-submissions. MitID-flow er placeholder: bruger uploader ID + selfie,
-- admin godkender manuelt. Når Sexologisk Akademi har Criipto/MitID Erhverv-aftale,
-- udskiftes dette flow.
CREATE TABLE IF NOT EXISTS verification_submission (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  id_document_path TEXT NOT NULL,
  selfie_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by_admin_id TEXT REFERENCES "user"("id") ON DELETE SET NULL,
  notes TEXT,
  rejection_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_verification_submission_status
  ON verification_submission (status, submitted_at);

CREATE INDEX IF NOT EXISTS idx_verification_submission_user
  ON verification_submission (user_id, submitted_at DESC);
