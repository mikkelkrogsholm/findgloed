import type { Pool } from "pg";

export type EventCategory = "single_only" | "couple_only" | "mixed";
export type EventLevel = "sensual_social" | "sensual" | "explicit";
export type EventStatus = "draft" | "published" | "cancelled" | "completed";
export type RegistrationStatus = "pending" | "confirmed" | "cancelled" | "attended";

export type EventRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  not_for: string | null;
  category: EventCategory;
  level: EventLevel;
  beginner_friendly: boolean;
  experience_required: boolean;
  facilitator_user_id: string | null;
  facilitator_name: string;
  facilitator_credential: string | null;
  starts_at: Date;
  ends_at: Date;
  capacity: number;
  price_cents: number;
  region: string | null;
  location_label: string | null;
  location_address: string | null;
  dresscode: string | null;
  exit_strategy: string | null;
  cover_path: string | null;
  status: EventStatus;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
};

export type EventListFilters = {
  category?: EventCategory;
  level?: EventLevel;
  region?: string;
  beginnerFriendly?: boolean;
  upcomingOnly?: boolean;
};

export type EventInsert = Omit<EventRecord, "id" | "created_at" | "updated_at">;
export type EventUpdate = Partial<Omit<EventRecord, "id" | "created_at" | "updated_at">>;

export type EventRegistration = {
  id: string;
  event_id: string;
  user_id: string;
  couple_id: string | null;
  status: RegistrationStatus;
  registered_at: Date;
  cancelled_at: Date | null;
  notes: string | null;
};

const EVENT_FIELDS = `
  id, slug, title, description, not_for, category, level,
  beginner_friendly, experience_required,
  facilitator_user_id, facilitator_name, facilitator_credential,
  starts_at, ends_at, capacity, price_cents,
  region, location_label, location_address, dresscode, exit_strategy, cover_path,
  status, created_by, created_at, updated_at
`;

const REGISTRATION_FIELDS = `
  id, event_id, user_id, couple_id, status, registered_at, cancelled_at, notes
`;

function rowToEvent(row: Record<string, unknown>): EventRecord {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    description: String(row.description),
    not_for: (row.not_for as string | null) ?? null,
    category: row.category as EventCategory,
    level: row.level as EventLevel,
    beginner_friendly: Boolean(row.beginner_friendly),
    experience_required: Boolean(row.experience_required),
    facilitator_user_id: (row.facilitator_user_id as string | null) ?? null,
    facilitator_name: String(row.facilitator_name),
    facilitator_credential: (row.facilitator_credential as string | null) ?? null,
    starts_at: row.starts_at as Date,
    ends_at: row.ends_at as Date,
    capacity: Number(row.capacity),
    price_cents: Number(row.price_cents),
    region: (row.region as string | null) ?? null,
    location_label: (row.location_label as string | null) ?? null,
    location_address: (row.location_address as string | null) ?? null,
    dresscode: (row.dresscode as string | null) ?? null,
    exit_strategy: (row.exit_strategy as string | null) ?? null,
    cover_path: (row.cover_path as string | null) ?? null,
    status: row.status as EventStatus,
    created_by: (row.created_by as string | null) ?? null,
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date
  };
}

function rowToRegistration(row: Record<string, unknown>): EventRegistration {
  return {
    id: String(row.id),
    event_id: String(row.event_id),
    user_id: String(row.user_id),
    couple_id: (row.couple_id as string | null) ?? null,
    status: row.status as RegistrationStatus,
    registered_at: row.registered_at as Date,
    cancelled_at: (row.cancelled_at as Date | null) ?? null,
    notes: (row.notes as string | null) ?? null
  };
}

export type EventRepository = {
  list: (filters: EventListFilters) => Promise<EventRecord[]>;
  listAdmin: () => Promise<EventRecord[]>;
  getBySlug: (slug: string) => Promise<EventRecord | null>;
  getById: (id: string) => Promise<EventRecord | null>;
  insert: (input: EventInsert) => Promise<EventRecord>;
  update: (id: string, update: EventUpdate) => Promise<EventRecord | null>;
  delete: (id: string) => Promise<boolean>;
  countConfirmed: (eventId: string) => Promise<number>;
  register: (eventId: string, userId: string, coupleId: string | null) => Promise<EventRegistration | null>;
  cancelRegistration: (eventId: string, userId: string) => Promise<boolean>;
  getRegistration: (eventId: string, userId: string) => Promise<EventRegistration | null>;
  listRegistrationsForUser: (userId: string) => Promise<Array<EventRegistration & { event: EventRecord }>>;
  listRegistrationsForEvent: (eventId: string) => Promise<EventRegistration[]>;
};

export class PostgresEventRepository implements EventRepository {
  constructor(private readonly pool: Pool) {}

  async list(filters: EventListFilters): Promise<EventRecord[]> {
    const conditions: string[] = ["status = 'published'"];
    const values: unknown[] = [];
    let i = 1;

    if (filters.category) {
      conditions.push(`category = $${i++}`);
      values.push(filters.category);
    }
    if (filters.level) {
      conditions.push(`level = $${i++}`);
      values.push(filters.level);
    }
    if (filters.region) {
      conditions.push(`region = $${i++}`);
      values.push(filters.region);
    }
    if (filters.beginnerFriendly !== undefined) {
      conditions.push(`beginner_friendly = $${i++}`);
      values.push(filters.beginnerFriendly);
    }
    if (filters.upcomingOnly !== false) {
      conditions.push(`starts_at >= NOW()`);
    }

    const result = await this.pool.query(
      `SELECT ${EVENT_FIELDS} FROM event WHERE ${conditions.join(" AND ")} ORDER BY starts_at LIMIT 200`,
      values
    );
    return result.rows.map(rowToEvent);
  }

  async listAdmin(): Promise<EventRecord[]> {
    const result = await this.pool.query(
      `SELECT ${EVENT_FIELDS} FROM event ORDER BY starts_at DESC LIMIT 500`
    );
    return result.rows.map(rowToEvent);
  }

  async getBySlug(slug: string): Promise<EventRecord | null> {
    const result = await this.pool.query(
      `SELECT ${EVENT_FIELDS} FROM event WHERE slug = $1 LIMIT 1`,
      [slug]
    );
    return result.rows[0] ? rowToEvent(result.rows[0]) : null;
  }

  async getById(id: string): Promise<EventRecord | null> {
    const result = await this.pool.query(
      `SELECT ${EVENT_FIELDS} FROM event WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ? rowToEvent(result.rows[0]) : null;
  }

  async insert(input: EventInsert): Promise<EventRecord> {
    const result = await this.pool.query(
      `INSERT INTO event (
         slug, title, description, not_for, category, level,
         beginner_friendly, experience_required,
         facilitator_user_id, facilitator_name, facilitator_credential,
         starts_at, ends_at, capacity, price_cents,
         region, location_label, location_address, dresscode, exit_strategy, cover_path,
         status, created_by
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
       ) RETURNING ${EVENT_FIELDS}`,
      [
        input.slug,
        input.title,
        input.description,
        input.not_for,
        input.category,
        input.level,
        input.beginner_friendly,
        input.experience_required,
        input.facilitator_user_id,
        input.facilitator_name,
        input.facilitator_credential,
        input.starts_at,
        input.ends_at,
        input.capacity,
        input.price_cents,
        input.region,
        input.location_label,
        input.location_address,
        input.dresscode,
        input.exit_strategy,
        input.cover_path,
        input.status,
        input.created_by
      ]
    );
    return rowToEvent(result.rows[0]);
  }

  async update(id: string, update: EventUpdate): Promise<EventRecord | null> {
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
      `UPDATE event SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${i} RETURNING ${EVENT_FIELDS}`,
      values
    );
    return result.rows[0] ? rowToEvent(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query(`DELETE FROM event WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async countConfirmed(eventId: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM event_registration WHERE event_id = $1 AND status IN ('pending','confirmed','attended')`,
      [eventId]
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async register(
    eventId: string,
    userId: string,
    coupleId: string | null
  ): Promise<EventRegistration | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const eventRow = await client.query(
        `SELECT id, capacity, status FROM event WHERE id = $1 FOR UPDATE`,
        [eventId]
      );
      if (eventRow.rowCount === 0) {
        await client.query("ROLLBACK");
        return null;
      }
      if (eventRow.rows[0].status !== "published") {
        await client.query("ROLLBACK");
        return null;
      }
      const taken = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM event_registration WHERE event_id = $1 AND status IN ('pending','confirmed','attended')`,
        [eventId]
      );
      if (Number(taken.rows[0]?.count ?? 0) >= eventRow.rows[0].capacity) {
        await client.query("ROLLBACK");
        return null;
      }
      const result = await client.query(
        `INSERT INTO event_registration (event_id, user_id, couple_id, status)
         VALUES ($1, $2, $3, 'confirmed')
         ON CONFLICT (event_id, user_id) DO UPDATE SET status = 'confirmed', cancelled_at = NULL
         RETURNING ${REGISTRATION_FIELDS}`,
        [eventId, userId, coupleId]
      );
      await client.query("COMMIT");
      return rowToRegistration(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async cancelRegistration(eventId: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE event_registration SET status = 'cancelled', cancelled_at = NOW()
       WHERE event_id = $1 AND user_id = $2 AND status IN ('pending','confirmed')`,
      [eventId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async getRegistration(eventId: string, userId: string): Promise<EventRegistration | null> {
    const result = await this.pool.query(
      `SELECT ${REGISTRATION_FIELDS} FROM event_registration WHERE event_id = $1 AND user_id = $2 LIMIT 1`,
      [eventId, userId]
    );
    return result.rows[0] ? rowToRegistration(result.rows[0]) : null;
  }

  async listRegistrationsForUser(
    userId: string
  ): Promise<Array<EventRegistration & { event: EventRecord }>> {
    const result = await this.pool.query(
      `SELECT r.id AS r_id, r.event_id, r.user_id, r.couple_id, r.status AS r_status,
              r.registered_at, r.cancelled_at, r.notes,
              e.id AS e_id, e.slug, e.title, e.description, e.not_for, e.category, e.level,
              e.beginner_friendly, e.experience_required,
              e.facilitator_user_id, e.facilitator_name, e.facilitator_credential,
              e.starts_at, e.ends_at, e.capacity, e.price_cents,
              e.region, e.location_label, e.location_address, e.dresscode, e.exit_strategy, e.cover_path,
              e.status AS e_status, e.created_by, e.created_at, e.updated_at
       FROM event_registration r
       JOIN event e ON e.id = r.event_id
       WHERE r.user_id = $1 AND r.status IN ('pending','confirmed','attended')
       ORDER BY e.starts_at DESC`,
      [userId]
    );

    return result.rows.map((row) => ({
      id: String(row.r_id),
      event_id: String(row.event_id),
      user_id: String(row.user_id),
      couple_id: (row.couple_id as string | null) ?? null,
      status: row.r_status as RegistrationStatus,
      registered_at: row.registered_at as Date,
      cancelled_at: (row.cancelled_at as Date | null) ?? null,
      notes: (row.notes as string | null) ?? null,
      event: rowToEvent({
        ...row,
        id: row.e_id,
        status: row.e_status
      })
    }));
  }

  async listRegistrationsForEvent(eventId: string): Promise<EventRegistration[]> {
    const result = await this.pool.query(
      `SELECT ${REGISTRATION_FIELDS} FROM event_registration WHERE event_id = $1 ORDER BY registered_at`,
      [eventId]
    );
    return result.rows.map(rowToRegistration);
  }
}
