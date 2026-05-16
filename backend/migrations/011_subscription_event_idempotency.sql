-- 011_subscription_event_idempotency.sql
-- Stripe webhook-idempotency (issue A18).
--
-- Når den rigtige Stripe-integration aktiveres skal /api/webhooks/stripe
-- kunne kaldes flere gange med samme event_id uden at duplikere
-- subscription_event-rækker. Stripe garanterer at hver event har et unikt
-- ID som klienten skal bruge til at deduplikere.
--
-- Indtil Stripe er live forbliver kolonnen NULL for mock-genererede events
-- (intro fra startSubscription, cancellation_scheduled, etc).

ALTER TABLE subscription_event
  ADD COLUMN IF NOT EXISTS stripe_event_id TEXT;

-- UNIQUE-constraint er kun aktiv for ikke-NULL værdier (Postgres default).
-- Dvs. legacy mock-rækker forbliver kompatible, men en ny webhook der
-- forsøger at logge samme stripe_event_id to gange fejler med 23505.
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_event_stripe_unique
  ON subscription_event (stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;
