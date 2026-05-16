-- 012_subscription_event_nullable.sql
-- Pakke 10: Webhook-events der ikke kan mappes til en kendt subscription
-- (fx hvis Stripe sender event før vi har oprettet rækken) skal kunne logges.
--
-- 008_subscriptions.sql definerede subscription_id som NOT NULL, men
-- PostgresSubscriptionEventLog.recordEvent forsøger at indsætte NULL for
-- webhook-events der endnu ikke kan korreleres til en intern subscription.
-- Resultat: 23502 NOT NULL violation og idempotency fungerer ikke.
--
-- Fix: tillad NULL for subscription_id. ON DELETE CASCADE forbliver — hvis
-- en subscription slettes, fjernes også de korrelerede events. NULL betyder
-- "ukorreleret webhook-event".

ALTER TABLE subscription_event
  ALTER COLUMN subscription_id DROP NOT NULL;
