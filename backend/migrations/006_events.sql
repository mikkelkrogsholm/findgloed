-- 006_events.sql
-- Events: 3 kategorier (single/par/mixed) × 3 niveauer (sanseligt/sensuelt/eksplicit)
-- + erfaring-tag (beslutning 5). Lokation skjules indtil tilmelding.

CREATE TABLE IF NOT EXISTS event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  not_for TEXT,
  category TEXT NOT NULL
    CHECK (category IN ('single_only', 'couple_only', 'mixed')),
  level TEXT NOT NULL
    CHECK (level IN ('sensual_social', 'sensual', 'explicit')),
  beginner_friendly BOOLEAN NOT NULL DEFAULT false,
  experience_required BOOLEAN NOT NULL DEFAULT false,
  facilitator_user_id TEXT REFERENCES "user"("id") ON DELETE SET NULL,
  facilitator_name TEXT NOT NULL,
  facilitator_credential TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  region TEXT,
  location_label TEXT,
  location_address TEXT,
  dresscode TEXT,
  exit_strategy TEXT,
  cover_path TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
  created_by TEXT REFERENCES "user"("id") ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_status_starts_at
  ON event (status, starts_at);

CREATE INDEX IF NOT EXISTS idx_event_category_level
  ON event (category, level)
  WHERE status = 'published';

CREATE TABLE IF NOT EXISTS event_registration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  couple_id UUID REFERENCES couple_profile(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'attended')),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_registration_event
  ON event_registration (event_id, status);

CREATE INDEX IF NOT EXISTS idx_event_registration_user
  ON event_registration (user_id, registered_at DESC);
