-- 009_temporary_verification.sql
-- Mens MitID-integrationen ikke er klar, behandles alle brugere som verificerede
-- med en 'temporary' markering. Når MitID kommer kan vi gate på verified_via og
-- kræve at brugere uploader rigtig ID for at fortsætte.

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS verified_via TEXT
    CHECK (verified_via IS NULL OR verified_via IN ('temporary', 'manual', 'mitid')),
  ADD COLUMN IF NOT EXISTS future_verification_accepted_at TIMESTAMPTZ;

-- Migrér eksisterende brugere: alle der ikke er verificerede bliver 'temporary'
-- verificerede så de kan bruge platformen med det samme.
UPDATE "user"
SET verification_status = 'verified',
    verified_at = COALESCE(verified_at, NOW()),
    verified_via = COALESCE(verified_via, 'temporary'),
    "updatedAt" = NOW()
WHERE verification_status <> 'verified' OR verified_via IS NULL;

-- For brugere der allerede var verified (fx superadmin via seed) sætter vi også
-- verified_via så ingen brugere er ude af track.
UPDATE "user"
SET verified_via = 'temporary',
    "updatedAt" = NOW()
WHERE verified_via IS NULL AND verification_status = 'verified';

CREATE INDEX IF NOT EXISTS idx_user_verified_via
  ON "user" (verified_via)
  WHERE verified_via IS NOT NULL;
