-- 008_subscriptions.sql
-- Medlemskab-betaling. Stripe-mock i fase 4 — udskiftes med rigtig Stripe når
-- nøgler er sat. Beslutning fra debat: ~149 kr single, ~199-249 kr par.
-- Intro-tilbud: 49 kr første måned ELLER 14 dages "kig-ind".

CREATE TABLE IF NOT EXISTS membership_plan (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  audience TEXT NOT NULL CHECK (audience IN ('single', 'couple')),
  monthly_price_cents INTEGER NOT NULL CHECK (monthly_price_cents > 0),
  intro_price_cents INTEGER,
  intro_months INTEGER NOT NULL DEFAULT 0,
  trial_days INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO membership_plan (id, name, audience, monthly_price_cents, intro_price_cents, intro_months, trial_days)
VALUES
  ('single_standard', 'Single', 'single', 14900, 4900, 1, 0),
  ('single_trial', 'Single — 14 dages prøve', 'single', 14900, NULL, 0, 14),
  ('couple_standard', 'Par', 'couple', 22900, 4900, 1, 0),
  ('couple_trial', 'Par — 14 dages prøve', 'couple', 22900, NULL, 0, 14)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  intro_price_cents = EXCLUDED.intro_price_cents,
  intro_months = EXCLUDED.intro_months,
  trial_days = EXCLUDED.trial_days,
  updated_at = NOW();

CREATE TABLE IF NOT EXISTS subscription (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  couple_id UUID REFERENCES couple_profile(id) ON DELETE SET NULL,
  plan_id TEXT NOT NULL REFERENCES membership_plan(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'past_due', 'cancelled', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  -- Stripe-felter (placeholder indtil rigtig Stripe-integration):
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  -- Diskret faktura-tekst — beslutning 7 fra debat: faktura må aldrig afsløre indholdet
  invoice_descriptor TEXT NOT NULL DEFAULT 'GLOEDDK',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_user
  ON subscription (user_id, status);

CREATE INDEX IF NOT EXISTS idx_subscription_status
  ON subscription (status, current_period_end);

CREATE TABLE IF NOT EXISTS subscription_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscription(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  amount_cents INTEGER,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_subscription_event_sub
  ON subscription_event (subscription_id, occurred_at DESC);
