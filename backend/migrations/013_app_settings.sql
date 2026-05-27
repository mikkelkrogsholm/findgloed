-- 013_app_settings.sql
-- Generisk key-value tabel for runtime-konfigurerbare globale settings.
--
-- Bruges p.t. til invite-code-gaten på signup:
--   key='signup.require_invite_code'  value=true|false
--   key='signup.invite_code'          value="hemmelig-streng"
--
-- Tabellen bevidst generisk så vi ikke skal lave ny migration hver gang
-- en ny global setting tilføjes. value er JSONB så vi kan gemme både
-- booleans, strings, numbers og evt. små objekter uden type-konvertering.
--
-- Adgangskontrol: kun /api/admin/settings-routes må læse/skrive (admin-only).
-- Værdier kan indeholde hemmeligheder (fx invite-code) og må ikke
-- eksponeres til public endpoints uden eksplicit allowlist.

CREATE TABLE IF NOT EXISTS app_setting (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT REFERENCES "user"(id) ON DELETE SET NULL
);

-- Defaults: signup er åbent fra start (matcher nuværende adfærd —
-- aktivér først invite-code når Mikkel sætter den fra admin-UI).
INSERT INTO app_setting (key, value)
VALUES
  ('signup.require_invite_code', 'false'::jsonb),
  ('signup.invite_code', '""'::jsonb)
ON CONFLICT (key) DO NOTHING;
