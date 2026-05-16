import type { Pool } from "pg";

export type PlanAudience = "single" | "couple";
export type SubscriptionStatus =
  | "pending"
  | "active"
  | "past_due"
  | "cancelled"
  | "trialing";

export type MembershipPlan = {
  id: string;
  name: string;
  audience: PlanAudience;
  monthly_price_cents: number;
  intro_price_cents: number | null;
  intro_months: number;
  trial_days: number;
  is_active: boolean;
};

export type Subscription = {
  id: string;
  user_id: string;
  couple_id: string | null;
  plan_id: string;
  status: SubscriptionStatus;
  current_period_start: Date | null;
  current_period_end: Date | null;
  cancel_at_period_end: boolean;
  cancelled_at: Date | null;
  trial_ends_at: Date | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  invoice_descriptor: string;
  created_at: Date;
  updated_at: Date;
};

function rowToPlan(row: Record<string, unknown>): MembershipPlan {
  return {
    id: String(row.id),
    name: String(row.name),
    audience: row.audience as PlanAudience,
    monthly_price_cents: Number(row.monthly_price_cents),
    intro_price_cents: row.intro_price_cents !== null ? Number(row.intro_price_cents) : null,
    intro_months: Number(row.intro_months),
    trial_days: Number(row.trial_days),
    is_active: Boolean(row.is_active)
  };
}

function rowToSubscription(row: Record<string, unknown>): Subscription {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    couple_id: (row.couple_id as string | null) ?? null,
    plan_id: String(row.plan_id),
    status: row.status as SubscriptionStatus,
    current_period_start: (row.current_period_start as Date | null) ?? null,
    current_period_end: (row.current_period_end as Date | null) ?? null,
    cancel_at_period_end: Boolean(row.cancel_at_period_end),
    cancelled_at: (row.cancelled_at as Date | null) ?? null,
    trial_ends_at: (row.trial_ends_at as Date | null) ?? null,
    stripe_customer_id: (row.stripe_customer_id as string | null) ?? null,
    stripe_subscription_id: (row.stripe_subscription_id as string | null) ?? null,
    stripe_price_id: (row.stripe_price_id as string | null) ?? null,
    invoice_descriptor: String(row.invoice_descriptor),
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date
  };
}

export type SubscriptionRepository = {
  listPlans: () => Promise<MembershipPlan[]>;
  getPlan: (id: string) => Promise<MembershipPlan | null>;
  getActiveSubscription: (userId: string) => Promise<Subscription | null>;
  // WARN (issue A18): I production med rigtig Stripe må denne metode KUN
  // kaldes fra webhook-handleren (typisk på checkout.session.completed eller
  // customer.subscription.created), aldrig direkte fra en HTTP-route.
  // Årsag: hvis vi opretter et "active"-abonnement før Stripe har bekræftet
  // betaling, kan brugeren ende med subscription=active uden faktisk at have
  // betalt. I dev/mock-mode (STRIPE_SECRET_KEY tomt) kaldes den fra
  // POST /api/me/subscription som mock-flow.
  startSubscription: (
    userId: string,
    coupleId: string | null,
    plan: MembershipPlan
  ) => Promise<Subscription>;
  cancelAtPeriodEnd: (id: string, userId: string) => Promise<Subscription | null>;
  resume: (id: string, userId: string) => Promise<Subscription | null>;
};

// Issue A18: webhook-handler skal kunne logge stripe-events idempotent. Vi
// modellerer det som et eget DI-port for at undgå at koble app.ts direkte
// til en konkret SQL-repo, og for at gøre det testbart.
export type SubscriptionEventLog = {
  // Returnerer true hvis eventen blev indsat, false hvis stripe_event_id
  // allerede var logget (idempotent no-op).
  recordEvent: (input: {
    subscriptionId: string | null;
    stripeEventId: string;
    eventType: string;
    amountCents: number | null;
    metadata: Record<string, unknown>;
  }) => Promise<boolean>;
};

export class PostgresSubscriptionEventLog implements SubscriptionEventLog {
  constructor(private readonly pool: import("pg").Pool) {}

  async recordEvent(input: {
    subscriptionId: string | null;
    stripeEventId: string;
    eventType: string;
    amountCents: number | null;
    metadata: Record<string, unknown>;
  }): Promise<boolean> {
    // ON CONFLICT på det partielle UNIQUE-index (stripe_event_id IS NOT NULL)
    // sikrer at samme webhook-event aldrig logges to gange.
    // subscription_id må være NULL for webhook-events der ikke kan mappes
    // til en kendt subscription endnu (fx hvis vi modtager event før init).
    const result = await this.pool.query(
      `INSERT INTO subscription_event (
         subscription_id, stripe_event_id, event_type, amount_cents, metadata_json
       )
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (stripe_event_id) WHERE stripe_event_id IS NOT NULL DO NOTHING
       RETURNING id`,
      [
        input.subscriptionId,
        input.stripeEventId,
        input.eventType,
        input.amountCents,
        JSON.stringify(input.metadata)
      ]
    );
    return (result.rowCount ?? 0) > 0;
  }
}

export class PostgresSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly pool: Pool) {}

  async listPlans(): Promise<MembershipPlan[]> {
    const result = await this.pool.query(
      `SELECT id, name, audience, monthly_price_cents, intro_price_cents, intro_months, trial_days, is_active
       FROM membership_plan WHERE is_active = true ORDER BY audience, monthly_price_cents`
    );
    return result.rows.map(rowToPlan);
  }

  async getPlan(id: string): Promise<MembershipPlan | null> {
    const result = await this.pool.query(
      `SELECT id, name, audience, monthly_price_cents, intro_price_cents, intro_months, trial_days, is_active
       FROM membership_plan WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ? rowToPlan(result.rows[0]) : null;
  }

  async getActiveSubscription(userId: string): Promise<Subscription | null> {
    const result = await this.pool.query(
      `SELECT id, user_id, couple_id, plan_id, status, current_period_start, current_period_end,
              cancel_at_period_end, cancelled_at, trial_ends_at, stripe_customer_id, stripe_subscription_id,
              stripe_price_id, invoice_descriptor, created_at, updated_at
       FROM subscription
       WHERE user_id = $1 AND status IN ('active', 'trialing', 'past_due')
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    return result.rows[0] ? rowToSubscription(result.rows[0]) : null;
  }

  // WARN (issue A18): I production med rigtig Stripe må denne metode KUN
  // kaldes fra webhook-handleren (checkout.session.completed). I dev/mock-mode
  // kaldes den direkte fra POST /api/me/subscription. Når STRIPE_SECRET_KEY
  // sættes skal vi:
  //   1. Flytte kaldet til Stripe webhook-handler
  //   2. Returnere checkout-URL fra POST /api/me/subscription
  //   3. Lade Stripe-event-flowet styre status="active"
  async startSubscription(
    userId: string,
    coupleId: string | null,
    plan: MembershipPlan
  ): Promise<Subscription> {
    const now = new Date();
    let status: SubscriptionStatus;
    let trialEndsAt: Date | null = null;
    let periodStart: Date | null = now;
    let periodEnd: Date = new Date(now);

    if (plan.trial_days > 0) {
      status = "trialing";
      trialEndsAt = new Date(now);
      trialEndsAt.setDate(trialEndsAt.getDate() + plan.trial_days);
      periodEnd = trialEndsAt;
    } else {
      status = "active";
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // STRIPE-MOCK: I rigtig integration ville vi her oprette en Stripe Customer +
    // Subscription. Indtil videre genererer vi syntetiske ID'er der gør det nemt
    // at se i loggen at det er mock-data.
    const stripeCustomerId = `cus_mock_${userId.slice(0, 8)}`;
    const stripeSubscriptionId = `sub_mock_${Date.now()}`;
    const stripePriceId = `price_mock_${plan.id}`;

    const result = await this.pool.query(
      `INSERT INTO subscription (
         user_id, couple_id, plan_id, status, current_period_start, current_period_end,
         trial_ends_at, stripe_customer_id, stripe_subscription_id, stripe_price_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, user_id, couple_id, plan_id, status, current_period_start, current_period_end,
                 cancel_at_period_end, cancelled_at, trial_ends_at, stripe_customer_id,
                 stripe_subscription_id, stripe_price_id, invoice_descriptor, created_at, updated_at`,
      [
        userId,
        coupleId,
        plan.id,
        status,
        periodStart,
        periodEnd,
        trialEndsAt,
        stripeCustomerId,
        stripeSubscriptionId,
        stripePriceId
      ]
    );

    await this.pool.query(
      `INSERT INTO subscription_event (subscription_id, event_type, amount_cents, metadata_json)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [
        result.rows[0].id,
        plan.trial_days > 0 ? "trial_started" : "subscription_started",
        plan.intro_price_cents ?? plan.monthly_price_cents,
        JSON.stringify({ plan_id: plan.id, mock: true })
      ]
    );

    return rowToSubscription(result.rows[0]);
  }

  async cancelAtPeriodEnd(id: string, userId: string): Promise<Subscription | null> {
    const result = await this.pool.query(
      `UPDATE subscription
       SET cancel_at_period_end = true, cancelled_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id, user_id, couple_id, plan_id, status, current_period_start, current_period_end,
                 cancel_at_period_end, cancelled_at, trial_ends_at, stripe_customer_id,
                 stripe_subscription_id, stripe_price_id, invoice_descriptor, created_at, updated_at`,
      [id, userId]
    );
    if (!result.rows[0]) return null;

    await this.pool.query(
      `INSERT INTO subscription_event (subscription_id, event_type, metadata_json)
       VALUES ($1, 'cancellation_scheduled', '{}'::jsonb)`,
      [id]
    );

    return rowToSubscription(result.rows[0]);
  }

  async resume(id: string, userId: string): Promise<Subscription | null> {
    const result = await this.pool.query(
      `UPDATE subscription
       SET cancel_at_period_end = false, cancelled_at = NULL, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id, user_id, couple_id, plan_id, status, current_period_start, current_period_end,
                 cancel_at_period_end, cancelled_at, trial_ends_at, stripe_customer_id,
                 stripe_subscription_id, stripe_price_id, invoice_descriptor, created_at, updated_at`,
      [id, userId]
    );
    if (!result.rows[0]) return null;
    return rowToSubscription(result.rows[0]);
  }
}
