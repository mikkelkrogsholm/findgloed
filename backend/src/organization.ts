import type { Pool } from "pg";
import { EVENT_FIELDS, type EventRecord, rowToEvent } from "./events";

export type OrgRole = "owner" | "editor";
export type OrganizationStatus = "active" | "suspended";

export type OrganizationRecord = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  region: string | null;
  contact_email: string | null;
  logo_path: string | null;
  status: OrganizationStatus;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
};

export type OrganizationMember = {
  organization_id: string;
  user_id: string;
  org_role: OrgRole;
  created_at: Date;
};

export type OrganizationInsert = {
  slug: string;
  name: string;
  description: string | null;
  region: string | null;
  contact_email: string | null;
  logo_path: string | null;
};

export type OrganizationUpdate = Partial<{
  slug: string;
  name: string;
  description: string | null;
  region: string | null;
  contact_email: string | null;
  logo_path: string | null;
  status: OrganizationStatus;
}>;

// Letvægts-repræsentation af en organization knyttet til et event (co-hosting).
export type EventOrganizationLink = {
  organization_id: string;
  name: string;
  slug: string;
  is_primary: boolean;
};

const ORG_FIELDS = `
  id, slug, name, description, region, contact_email, logo_path,
  status, created_by, created_at, updated_at
`;

function rowToOrganization(row: Record<string, unknown>): OrganizationRecord {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: (row.description as string | null) ?? null,
    region: (row.region as string | null) ?? null,
    contact_email: (row.contact_email as string | null) ?? null,
    logo_path: (row.logo_path as string | null) ?? null,
    status: row.status as OrganizationStatus,
    created_by: (row.created_by as string | null) ?? null,
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date
  };
}

function rowToMember(row: Record<string, unknown>): OrganizationMember {
  return {
    organization_id: String(row.organization_id),
    user_id: String(row.user_id),
    org_role: row.org_role as OrgRole,
    created_at: row.created_at as Date
  };
}

export type OrganizationRepository = {
  // Opretter org + indsætter opretteren som owner i én transaktion.
  create: (input: OrganizationInsert, ownerUserId: string) => Promise<OrganizationRecord>;
  getById: (id: string) => Promise<OrganizationRecord | null>;
  getBySlug: (slug: string) => Promise<OrganizationRecord | null>;
  update: (id: string, update: OrganizationUpdate) => Promise<OrganizationRecord | null>;
  delete: (id: string) => Promise<boolean>;
  // Organizations brugeren er medlem af (inkl. egen org_role).
  listForUser: (
    userId: string
  ) => Promise<Array<OrganizationRecord & { org_role: OrgRole }>>;
  // Admin: alle organizations med pagination.
  listAll: (options?: { limit?: number; offset?: number }) => Promise<{
    items: OrganizationRecord[];
    total: number;
  }>;
  listMembers: (orgId: string) => Promise<OrganizationMember[]>;
  getMembership: (orgId: string, userId: string) => Promise<OrganizationMember | null>;
  countOwners: (orgId: string) => Promise<number>;
  // Idempotent: opdaterer org_role hvis brugeren allerede er medlem.
  addMember: (orgId: string, userId: string, role: OrgRole) => Promise<OrganizationMember>;
  removeMember: (orgId: string, userId: string) => Promise<boolean>;
  // Erstatter event↔org-relationerne for ét event i én transaktion.
  setEventOrganizations: (
    eventId: string,
    primaryOrgId: string,
    coHostOrgIds: string[]
  ) => Promise<void>;
  listEventsForOrg: (
    orgId: string,
    options?: { limit?: number; offset?: number }
  ) => Promise<{ items: EventRecord[]; total: number }>;
  // Batch-enrich: alle hosting-orgs for en liste af events.
  listOrganizationsForEvents: (
    eventIds: string[]
  ) => Promise<Map<string, EventOrganizationLink[]>>;
  // True hvis brugeren er medlem af mindst én org der afholder eventet.
  isMemberOfEventHost: (eventId: string, userId: string) => Promise<boolean>;
};

export class PostgresOrganizationRepository implements OrganizationRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: OrganizationInsert, ownerUserId: string): Promise<OrganizationRecord> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `INSERT INTO organization (slug, name, description, region, contact_email, logo_path, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING ${ORG_FIELDS}`,
        [
          input.slug,
          input.name,
          input.description,
          input.region,
          input.contact_email,
          input.logo_path,
          ownerUserId
        ]
      );
      const org = rowToOrganization(result.rows[0]);
      await client.query(
        `INSERT INTO organization_member (organization_id, user_id, org_role)
         VALUES ($1, $2, 'owner')`,
        [org.id, ownerUserId]
      );
      await client.query("COMMIT");
      return org;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getById(id: string): Promise<OrganizationRecord | null> {
    const result = await this.pool.query(
      `SELECT ${ORG_FIELDS} FROM organization WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ? rowToOrganization(result.rows[0]) : null;
  }

  async getBySlug(slug: string): Promise<OrganizationRecord | null> {
    const result = await this.pool.query(
      `SELECT ${ORG_FIELDS} FROM organization WHERE slug = $1 LIMIT 1`,
      [slug]
    );
    return result.rows[0] ? rowToOrganization(result.rows[0]) : null;
  }

  async update(id: string, update: OrganizationUpdate): Promise<OrganizationRecord | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    for (const [key, value] of Object.entries(update)) {
      if (value !== undefined) {
        fields.push(`${key} = $${i++}`);
        values.push(value);
      }
    }
    if (fields.length === 0) {
      return this.getById(id);
    }
    values.push(id);
    const result = await this.pool.query(
      `UPDATE organization SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${i} RETURNING ${ORG_FIELDS}`,
      values
    );
    return result.rows[0] ? rowToOrganization(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query(`DELETE FROM organization WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async listForUser(
    userId: string
  ): Promise<Array<OrganizationRecord & { org_role: OrgRole }>> {
    const result = await this.pool.query(
      `SELECT o.id, o.slug, o.name, o.description, o.region, o.contact_email,
              o.logo_path, o.status, o.created_by, o.created_at, o.updated_at,
              m.org_role
       FROM organization o
       JOIN organization_member m ON m.organization_id = o.id
       WHERE m.user_id = $1
       ORDER BY o.created_at DESC`,
      [userId]
    );
    return result.rows.map((row) => ({
      ...rowToOrganization(row),
      org_role: row.org_role as OrgRole
    }));
  }

  async listAll(options?: { limit?: number; offset?: number }): Promise<{
    items: OrganizationRecord[];
    total: number;
  }> {
    const limit = Math.max(1, Math.min(200, options?.limit ?? 50));
    const offset = Math.max(0, options?.offset ?? 0);
    const [itemsResult, countResult] = await Promise.all([
      this.pool.query(
        `SELECT ${ORG_FIELDS} FROM organization ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      this.pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM organization`)
    ]);
    return {
      items: itemsResult.rows.map(rowToOrganization),
      total: Number(countResult.rows[0]?.count ?? 0)
    };
  }

  async listMembers(orgId: string): Promise<OrganizationMember[]> {
    const result = await this.pool.query(
      `SELECT organization_id, user_id, org_role, created_at
       FROM organization_member
       WHERE organization_id = $1
       ORDER BY created_at`,
      [orgId]
    );
    return result.rows.map(rowToMember);
  }

  async getMembership(orgId: string, userId: string): Promise<OrganizationMember | null> {
    const result = await this.pool.query(
      `SELECT organization_id, user_id, org_role, created_at
       FROM organization_member
       WHERE organization_id = $1 AND user_id = $2
       LIMIT 1`,
      [orgId, userId]
    );
    return result.rows[0] ? rowToMember(result.rows[0]) : null;
  }

  async countOwners(orgId: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM organization_member
       WHERE organization_id = $1 AND org_role = 'owner'`,
      [orgId]
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async addMember(orgId: string, userId: string, role: OrgRole): Promise<OrganizationMember> {
    const result = await this.pool.query(
      `INSERT INTO organization_member (organization_id, user_id, org_role)
       VALUES ($1, $2, $3)
       ON CONFLICT (organization_id, user_id)
         DO UPDATE SET org_role = EXCLUDED.org_role
       RETURNING organization_id, user_id, org_role, created_at`,
      [orgId, userId, role]
    );
    return rowToMember(result.rows[0]);
  }

  async removeMember(orgId: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM organization_member WHERE organization_id = $1 AND user_id = $2`,
      [orgId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async setEventOrganizations(
    eventId: string,
    primaryOrgId: string,
    coHostOrgIds: string[]
  ): Promise<void> {
    // Dedupe co-hosts og fjern primary fra co-host-listen.
    const coHosts = Array.from(new Set(coHostOrgIds)).filter((id) => id !== primaryOrgId);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`DELETE FROM event_organization WHERE event_id = $1`, [eventId]);
      await client.query(
        `INSERT INTO event_organization (event_id, organization_id, is_primary)
         VALUES ($1, $2, true)`,
        [eventId, primaryOrgId]
      );
      for (const orgId of coHosts) {
        await client.query(
          `INSERT INTO event_organization (event_id, organization_id, is_primary)
           VALUES ($1, $2, false)`,
          [eventId, orgId]
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listEventsForOrg(
    orgId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ items: EventRecord[]; total: number }> {
    const limit = Math.max(1, Math.min(200, options?.limit ?? 50));
    const offset = Math.max(0, options?.offset ?? 0);
    const [itemsResult, countResult] = await Promise.all([
      this.pool.query(
        `SELECT ${EVENT_FIELDS}
         FROM event e
         JOIN event_organization eo ON eo.event_id = e.id
         WHERE eo.organization_id = $1
         ORDER BY e.starts_at DESC
         LIMIT $2 OFFSET $3`,
        [orgId, limit, offset]
      ),
      this.pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM event_organization
         WHERE organization_id = $1`,
        [orgId]
      )
    ]);
    return {
      items: itemsResult.rows.map(rowToEvent),
      total: Number(countResult.rows[0]?.count ?? 0)
    };
  }

  async listOrganizationsForEvents(
    eventIds: string[]
  ): Promise<Map<string, EventOrganizationLink[]>> {
    const map = new Map<string, EventOrganizationLink[]>();
    if (eventIds.length === 0) return map;
    const result = await this.pool.query<{
      event_id: string;
      organization_id: string;
      name: string;
      slug: string;
      is_primary: boolean;
    }>(
      `SELECT eo.event_id, eo.organization_id, eo.is_primary, o.name, o.slug
       FROM event_organization eo
       JOIN organization o ON o.id = eo.organization_id
       WHERE eo.event_id = ANY($1::uuid[])
       ORDER BY eo.is_primary DESC, o.name`,
      [eventIds]
    );
    for (const row of result.rows) {
      const link: EventOrganizationLink = {
        organization_id: String(row.organization_id),
        name: String(row.name),
        slug: String(row.slug),
        is_primary: Boolean(row.is_primary)
      };
      const list = map.get(String(row.event_id)) ?? [];
      list.push(link);
      map.set(String(row.event_id), list);
    }
    return map;
  }

  async isMemberOfEventHost(eventId: string, userId: string): Promise<boolean> {
    const result = await this.pool.query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1
         FROM event_organization eo
         JOIN organization_member m ON m.organization_id = eo.organization_id
         WHERE eo.event_id = $1 AND m.user_id = $2
       ) AS exists`,
      [eventId, userId]
    );
    return Boolean(result.rows[0]?.exists);
  }
}
