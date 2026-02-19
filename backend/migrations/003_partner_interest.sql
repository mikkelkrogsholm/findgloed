CREATE TABLE IF NOT EXISTS partner_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  organization TEXT NOT NULL,
  role TEXT NOT NULL,
  region TEXT,
  interests_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT 'vision_modal',
  status TEXT NOT NULL DEFAULT 'pending',
  confirmation_token_hash TEXT,
  confirmation_token_expires_at TIMESTAMPTZ,
  confirmation_sent_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  terms_accepted_at TIMESTAMPTZ,
  privacy_accepted_at TIMESTAMPTZ,
  marketing_opt_in BOOLEAN NOT NULL DEFAULT false,
  marketing_opt_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_leads_confirmation_token_hash
  ON partner_leads (confirmation_token_hash);

CREATE TABLE IF NOT EXISTS partner_consent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_lead_id UUID NOT NULL REFERENCES partner_leads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_partner_consent_events_lead_id_occurred_at
  ON partner_consent_events (partner_lead_id, occurred_at DESC);
