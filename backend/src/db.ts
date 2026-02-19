import { Pool } from "pg";
import type {
  ConfirmLeadResult,
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
  marketing_opt_in: boolean;
  confirmation_sent_at: Date | null;
  confirmation_token_expires_at: Date | null;
};

export class PostgresLeadRepository implements WaitlistRepository {
  constructor(private readonly pool: Pool) {}

  async upsertWaitlistLead(input: WaitlistUpsertInput): Promise<WaitlistUpsertResult> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const existingResult = await client.query<LeadRow>(
        `SELECT id, email, status, marketing_opt_in, confirmation_sent_at, confirmation_token_expires_at
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
        `SELECT id, email, status, marketing_opt_in, confirmation_sent_at, confirmation_token_expires_at
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
}
