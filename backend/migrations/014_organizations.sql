-- 014_organizations.sql
-- Organizers + Organizations. En organizer (user.role = 'organizer') kan oprette
-- en eller flere organizations. En organization har et team af medlemmer
-- (owner/editor) og kan afholde events — alene eller sammen med andre
-- organizations (co-hosting) via event_organization.

CREATE TABLE IF NOT EXISTS organization (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  region TEXT,
  contact_email TEXT,
  logo_path TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended')),
  created_by TEXT REFERENCES "user"("id") ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organization_status
  ON organization (status, created_at DESC);

-- Team-medlemskab. En bruger kan være medlem af flere organizations, og en
-- organization kan have flere medlemmer. org_role styrer hvad medlemmet må:
-- 'owner' kan redigere org + administrere medlemmer; 'editor' kan oprette og
-- redigere events.
CREATE TABLE IF NOT EXISTS organization_member (
  organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  org_role TEXT NOT NULL DEFAULT 'editor'
    CHECK (org_role IN ('owner', 'editor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_member_user
  ON organization_member (user_id);

-- Many-to-many mellem events og organizations. En event kan afholdes af flere
-- organizations (co-hosting). is_primary markerer den arrangerende org (den der
-- oprettede eventet); co-hosts har is_primary = false.
CREATE TABLE IF NOT EXISTS event_organization (
  event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_event_organization_org
  ON event_organization (organization_id);

-- Højst én primary-org pr. event.
CREATE UNIQUE INDEX IF NOT EXISTS uq_event_organization_primary
  ON event_organization (event_id)
  WHERE is_primary;
