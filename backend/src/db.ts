import { Pool } from "pg";
import type {
  AdminLeadsResult,
  ConfirmLeadResult,
  PartnerConfirmResult,
  PartnerInterestRepository,
  PartnerUpsertInput,
  PartnerUpsertResult,
  WaitlistRepository,
  WaitlistUpsertInput,
  WaitlistUpsertResult
} from "./types";

export function createPool(options: {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
  sslRejectUnauthorized: boolean;
}): Pool {
  return new Pool({
    host: options.host,
    port: options.port,
    user: options.user,
    password: options.password,
    database: options.database,
    ssl: options.ssl ? { rejectUnauthorized: options.sslRejectUnauthorized } : false
  });
}

type LeadRow = {
  id: string;
  email: string;
  status: "pending" | "confirmed" | "unsubscribed";
  source: string;
  marketing_opt_in: boolean;
  created_at: Date;
  confirmed_at: Date | null;
  terms_accepted_at: Date | null;
  privacy_accepted_at: Date | null;
  confirmation_sent_at: Date | null;
  confirmation_token_expires_at: Date | null;
};

type PartnerLeadRow = {
  id: string;
  email: string;
  status: "pending" | "confirmed" | "unsubscribed";
  marketing_opt_in: boolean;
  confirmation_sent_at: Date | null;
  confirmation_token_expires_at: Date | null;
};

export class PostgresLeadRepository implements WaitlistRepository, PartnerInterestRepository {
  constructor(private readonly pool: Pool) {}

  async emailExistsInLeads(email: string): Promise<boolean> {
    const result = await this.pool.query<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM leads WHERE email = $1) AS exists`,
      [email]
    );
    return Boolean(result.rows[0]?.exists);
  }

  async listAdminLeads(): Promise<AdminLeadsResult> {
    const [itemsResult, metaResult] = await Promise.all([
      this.pool.query<LeadRow>(
        `SELECT id, email, status, source, marketing_opt_in, created_at, confirmed_at, terms_accepted_at, privacy_accepted_at,
                confirmation_sent_at, confirmation_token_expires_at
         FROM leads
         ORDER BY created_at DESC`
      ),
      this.pool.query<{ total: string; confirmed: string; pending: string }>(
        `SELECT
          COUNT(*)::text AS total,
          COUNT(*) FILTER (WHERE status = 'confirmed')::text AS confirmed,
          COUNT(*) FILTER (WHERE status = 'pending')::text AS pending
         FROM leads`
      )
    ]);

    const summary = metaResult.rows[0] ?? { total: "0", confirmed: "0", pending: "0" };
    return {
      items: itemsResult.rows.map((row) => ({
        id: row.id,
        email: row.email,
        status: row.status,
        source: row.source,
        marketing_opt_in: row.marketing_opt_in,
        created_at: row.created_at,
        confirmed_at: row.confirmed_at,
        terms_accepted_at: row.terms_accepted_at,
        privacy_accepted_at: row.privacy_accepted_at
      })),
      meta: {
        total: Number(summary.total),
        confirmed: Number(summary.confirmed),
        pending: Number(summary.pending)
      }
    };
  }

  async upsertWaitlistLead(input: WaitlistUpsertInput): Promise<WaitlistUpsertResult> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const existingResult = await client.query<LeadRow>(
        `SELECT id, email, status, source, marketing_opt_in, created_at, confirmed_at, terms_accepted_at, privacy_accepted_at,
                confirmation_sent_at, confirmation_token_expires_at
         FROM leads
         WHERE email = $1
         FOR UPDATE`,
        [input.email]
      );

      if (existingResult.rowCount === 0) {
        const createdLead = await client.query<{ id: string }>(
	          `INSERT INTO leads (
	             email,
	             source,
	             status,
             confirmation_token_hash,
             confirmation_token_expires_at,
             confirmation_sent_at,
             terms_accepted_at,
             privacy_accepted_at,
             marketing_opt_in,
             marketing_opt_in_at,
             updated_at
           )
	           VALUES (
	             $1::text,
	             $2::text,
	             'pending',
	             $3::text,
	             $4::timestamptz,
	             $5::timestamptz,
	             $5::timestamptz,
	             $5::timestamptz,
	             $6::boolean,
	             CASE WHEN $6::boolean THEN $5::timestamptz ELSE NULL END,
	             $5::timestamptz
	           )
	           RETURNING id`,
          [
            input.email,
            input.source,
            input.confirmationTokenHash,
            input.confirmationTokenExpiresAt,
            input.acceptedAt,
            input.marketingOptIn
          ]
        );

        const leadId = createdLead.rows[0]?.id;
        if (!leadId) {
          throw new Error("Failed to create lead");
        }

        await this.insertConsentEvent(client, leadId, "waitlist_submitted", input.acceptedAt, {
          source: input.source
        });

        if (input.marketingOptIn) {
          await this.insertConsentEvent(client, leadId, "marketing_opted_in", input.acceptedAt, {
            source: input.source
          });
        }

        await client.query("COMMIT");
        return {
          status: "created_pending",
          shouldSendConfirm: true
        };
      }

      const existing = existingResult.rows[0] as LeadRow;
      const wasMarketingOptedIn = Boolean(existing.marketing_opt_in);
      const marketingUpgrade = input.marketingOptIn && !wasMarketingOptedIn;

      if (existing.status === "confirmed") {
        await client.query(
          `UPDATE leads
           SET source = $2,
               terms_accepted_at = COALESCE(terms_accepted_at, $3),
               privacy_accepted_at = COALESCE(privacy_accepted_at, $3),
               marketing_opt_in = CASE WHEN $4 THEN true ELSE marketing_opt_in END,
               marketing_opt_in_at = CASE
                 WHEN $4 AND marketing_opt_in_at IS NULL THEN $3
                 ELSE marketing_opt_in_at
               END,
               updated_at = $3
           WHERE id = $1`,
          [existing.id, input.source, input.acceptedAt, input.marketingOptIn]
        );

        await this.insertConsentEvent(client, existing.id, "waitlist_submitted", input.acceptedAt, {
          source: input.source
        });

        if (marketingUpgrade) {
          await this.insertConsentEvent(client, existing.id, "marketing_opted_in", input.acceptedAt, {
            source: input.source
          });
        }

        await client.query("COMMIT");
        return {
          status: "already_confirmed",
          shouldSendConfirm: false
        };
      }

      const cooldownMs = input.resendCooldownMinutes * 60 * 1000;
      const sentAtMs = existing.confirmation_sent_at?.getTime() ?? 0;
      const inCooldown =
        existing.status !== "unsubscribed" &&
        existing.confirmation_sent_at !== null &&
        input.acceptedAt.getTime() - sentAtMs < cooldownMs;

      const shouldSendConfirm = existing.status === "unsubscribed" || !inCooldown;

      await client.query(
        `UPDATE leads
         SET status = 'pending',
             source = $2,
             confirmation_token_hash = CASE WHEN $6 THEN $4 ELSE confirmation_token_hash END,
             confirmation_token_expires_at = CASE WHEN $6 THEN $5 ELSE confirmation_token_expires_at END,
             confirmation_sent_at = CASE WHEN $6 THEN $3 ELSE confirmation_sent_at END,
             terms_accepted_at = COALESCE(terms_accepted_at, $3),
             privacy_accepted_at = COALESCE(privacy_accepted_at, $3),
             marketing_opt_in = CASE WHEN $7 THEN true ELSE marketing_opt_in END,
             marketing_opt_in_at = CASE
               WHEN $7 AND marketing_opt_in_at IS NULL THEN $3
               ELSE marketing_opt_in_at
             END,
             updated_at = $3
         WHERE id = $1`,
        [
          existing.id,
          input.source,
          input.acceptedAt,
          input.confirmationTokenHash,
          input.confirmationTokenExpiresAt,
          shouldSendConfirm,
          input.marketingOptIn
        ]
      );

      await this.insertConsentEvent(client, existing.id, "waitlist_submitted", input.acceptedAt, {
        source: input.source
      });

      if (marketingUpgrade) {
        await this.insertConsentEvent(client, existing.id, "marketing_opted_in", input.acceptedAt, {
          source: input.source
        });
      }

      await client.query("COMMIT");
      return {
        status: shouldSendConfirm ? "pending_resent" : "pending_cooldown",
        shouldSendConfirm
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async confirmLeadByToken(tokenHash: string, now: Date): Promise<ConfirmLeadResult> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query<LeadRow>(
        `SELECT id, email, status, source, marketing_opt_in, created_at, confirmed_at, terms_accepted_at, privacy_accepted_at,
                confirmation_sent_at, confirmation_token_expires_at
         FROM leads
         WHERE confirmation_token_hash = $1
         FOR UPDATE`,
        [tokenHash]
      );

      if (result.rowCount === 0) {
        await client.query("COMMIT");
        return { status: "invalid" };
      }

      const lead = result.rows[0] as LeadRow;

      if (lead.status === "confirmed") {
        await client.query("COMMIT");
        return { status: "already_confirmed" };
      }

      if (lead.confirmation_token_expires_at && lead.confirmation_token_expires_at.getTime() < now.getTime()) {
        await client.query("COMMIT");
        return { status: "expired" };
      }

      await client.query(
        `UPDATE leads
         SET status = 'confirmed',
             confirmed_at = COALESCE(confirmed_at, $2),
             updated_at = $2
         WHERE id = $1`,
        [lead.id, now]
      );

      await this.insertConsentEvent(client, lead.id, "waitlist_confirmed", now, {});
      await client.query("COMMIT");

      return { status: "confirmed", email: lead.email };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async upsertPartnerInterest(input: PartnerUpsertInput): Promise<PartnerUpsertResult> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const existingResult = await client.query<PartnerLeadRow>(
        `SELECT id, email, status, marketing_opt_in, confirmation_sent_at, confirmation_token_expires_at
         FROM partner_leads
         WHERE email = $1
         FOR UPDATE`,
        [input.email]
      );

      if (existingResult.rowCount === 0) {
        const createdLead = await client.query<{ id: string }>(
          `INSERT INTO partner_leads (
             email,
             name,
             organization,
             role,
             region,
             interests_json,
             source,
             status,
             confirmation_token_hash,
             confirmation_token_expires_at,
             confirmation_sent_at,
             terms_accepted_at,
             privacy_accepted_at,
             marketing_opt_in,
             marketing_opt_in_at,
             updated_at
           )
           VALUES (
             $1::text,
             $2::text,
             $3::text,
             $4::text,
             $5::text,
             $6::jsonb,
             $7::text,
             'pending',
             $8::text,
             $9::timestamptz,
             $10::timestamptz,
             $10::timestamptz,
             $10::timestamptz,
             $11::boolean,
             CASE WHEN $11::boolean THEN $10::timestamptz ELSE NULL END,
             $10::timestamptz
           )
           RETURNING id`,
          [
            input.email,
            input.name,
            input.organization,
            input.role,
            input.region,
            JSON.stringify(input.interests),
            input.source,
            input.confirmationTokenHash,
            input.confirmationTokenExpiresAt,
            input.acceptedAt,
            input.marketingOptIn
          ]
        );

        const leadId = createdLead.rows[0]?.id;
        if (!leadId) {
          throw new Error("Failed to create partner lead");
        }

        await this.insertPartnerConsentEvent(client, leadId, "partner_interest_submitted", input.acceptedAt, {
          source: input.source,
          interests: input.interests
        });

        if (input.marketingOptIn) {
          await this.insertPartnerConsentEvent(client, leadId, "partner_marketing_opted_in", input.acceptedAt, {
            source: input.source
          });
        }

        await client.query("COMMIT");
        return {
          status: "created_pending",
          shouldSendConfirm: true
        };
      }

      const existing = existingResult.rows[0] as PartnerLeadRow;
      const wasMarketingOptedIn = Boolean(existing.marketing_opt_in);
      const marketingUpgrade = input.marketingOptIn && !wasMarketingOptedIn;

      if (existing.status === "confirmed") {
        await client.query(
          `UPDATE partner_leads
           SET name = $2,
               organization = $3,
               role = $4,
               region = $5,
               interests_json = $6::jsonb,
               source = $7,
               terms_accepted_at = COALESCE(terms_accepted_at, $8),
               privacy_accepted_at = COALESCE(privacy_accepted_at, $8),
               marketing_opt_in = CASE WHEN $9 THEN true ELSE marketing_opt_in END,
               marketing_opt_in_at = CASE
                 WHEN $9 AND marketing_opt_in_at IS NULL THEN $8
                 ELSE marketing_opt_in_at
               END,
               updated_at = $8
           WHERE id = $1`,
          [
            existing.id,
            input.name,
            input.organization,
            input.role,
            input.region,
            JSON.stringify(input.interests),
            input.source,
            input.acceptedAt,
            input.marketingOptIn
          ]
        );

        await this.insertPartnerConsentEvent(
          client,
          existing.id,
          "partner_interest_submitted",
          input.acceptedAt,
          {
            source: input.source,
            interests: input.interests
          }
        );

        if (marketingUpgrade) {
          await this.insertPartnerConsentEvent(
            client,
            existing.id,
            "partner_marketing_opted_in",
            input.acceptedAt,
            { source: input.source }
          );
        }

        await client.query("COMMIT");
        return {
          status: "already_confirmed",
          shouldSendConfirm: false
        };
      }

      const cooldownMs = input.resendCooldownMinutes * 60 * 1000;
      const sentAtMs = existing.confirmation_sent_at?.getTime() ?? 0;
      const inCooldown =
        existing.status !== "unsubscribed" &&
        existing.confirmation_sent_at !== null &&
        input.acceptedAt.getTime() - sentAtMs < cooldownMs;

      const shouldSendConfirm = existing.status === "unsubscribed" || !inCooldown;

      await client.query(
        `UPDATE partner_leads
         SET name = $2,
             organization = $3,
             role = $4,
             region = $5,
             interests_json = $6::jsonb,
             status = 'pending',
             source = $7,
             confirmation_token_hash = CASE WHEN $11 THEN $8 ELSE confirmation_token_hash END,
             confirmation_token_expires_at = CASE WHEN $11 THEN $9 ELSE confirmation_token_expires_at END,
             confirmation_sent_at = CASE WHEN $11 THEN $10 ELSE confirmation_sent_at END,
             terms_accepted_at = COALESCE(terms_accepted_at, $10),
             privacy_accepted_at = COALESCE(privacy_accepted_at, $10),
             marketing_opt_in = CASE WHEN $12 THEN true ELSE marketing_opt_in END,
             marketing_opt_in_at = CASE
               WHEN $12 AND marketing_opt_in_at IS NULL THEN $10
               ELSE marketing_opt_in_at
             END,
             updated_at = $10
         WHERE id = $1`,
        [
          existing.id,
          input.name,
          input.organization,
          input.role,
          input.region,
          JSON.stringify(input.interests),
          input.source,
          input.confirmationTokenHash,
          input.confirmationTokenExpiresAt,
          input.acceptedAt,
          shouldSendConfirm,
          input.marketingOptIn
        ]
      );

      await this.insertPartnerConsentEvent(client, existing.id, "partner_interest_submitted", input.acceptedAt, {
        source: input.source,
        interests: input.interests
      });

      if (marketingUpgrade) {
        await this.insertPartnerConsentEvent(
          client,
          existing.id,
          "partner_marketing_opted_in",
          input.acceptedAt,
          {
            source: input.source
          }
        );
      }

      await client.query("COMMIT");
      return {
        status: shouldSendConfirm ? "pending_resent" : "pending_cooldown",
        shouldSendConfirm
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async confirmPartnerByToken(tokenHash: string, now: Date): Promise<PartnerConfirmResult> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query<PartnerLeadRow>(
        `SELECT id, email, status, marketing_opt_in, confirmation_sent_at, confirmation_token_expires_at
         FROM partner_leads
         WHERE confirmation_token_hash = $1
         FOR UPDATE`,
        [tokenHash]
      );

      if (result.rowCount === 0) {
        await client.query("COMMIT");
        return { status: "invalid" };
      }

      const lead = result.rows[0] as PartnerLeadRow;

      if (lead.status === "confirmed") {
        await client.query("COMMIT");
        return { status: "already_confirmed" };
      }

      if (lead.confirmation_token_expires_at && lead.confirmation_token_expires_at.getTime() < now.getTime()) {
        await client.query("COMMIT");
        return { status: "expired" };
      }

      await client.query(
        `UPDATE partner_leads
         SET status = 'confirmed',
             confirmed_at = COALESCE(confirmed_at, $2),
             updated_at = $2
         WHERE id = $1`,
        [lead.id, now]
      );

      await this.insertPartnerConsentEvent(client, lead.id, "partner_interest_confirmed", now, {});
      await client.query("COMMIT");

      return { status: "confirmed", email: lead.email };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async insertConsentEvent(
    client: { query: (queryText: string, values?: unknown[]) => Promise<unknown> },
    leadId: string,
    eventType: "waitlist_submitted" | "marketing_opted_in" | "waitlist_confirmed",
    occurredAt: Date,
    metadata: Record<string, unknown>
  ): Promise<void> {
    await client.query(
      `INSERT INTO consent_events (lead_id, event_type, occurred_at, metadata_json)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [leadId, eventType, occurredAt, JSON.stringify(metadata)]
    );
  }

  private async insertPartnerConsentEvent(
    client: { query: (queryText: string, values?: unknown[]) => Promise<unknown> },
    leadId: string,
    eventType:
      | "partner_interest_submitted"
      | "partner_marketing_opted_in"
      | "partner_interest_confirmed",
    occurredAt: Date,
    metadata: Record<string, unknown>
  ): Promise<void> {
    await client.query(
      `INSERT INTO partner_consent_events (partner_lead_id, event_type, occurred_at, metadata_json)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [leadId, eventType, occurredAt, JSON.stringify(metadata)]
    );
  }
}
