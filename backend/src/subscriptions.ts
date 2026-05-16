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

export type SubscriptionEvent = {
  id: string;
  subscription_id: string;
  event_type: string;
  amount_cents: number | null;
  occurred_at: Date;
  metadata_json: Record<string, unknown>;
};

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
  // C25: Returnerer null hvis subscription er afsluttet (cancelled).
  // C27: Hvis status='trialing' og forceImmediate=true, sættes status direkte
  // til 'cancelled' (trial-cancel betyder umiddelbart adgangstab — brugeren
  // har ikke betalt og prøveperioden afbrydes).
  cancelAtPeriodEnd: (
    id: string,
    userId: string,
    options?: { forceImmediate?: boolean }
  ) => Promise<Subscription | null>;
  // C25: Kun gyldig hvis cancel_at_period_end=true OG status!='cancelled'.
  resume: (id: string, userId: string) => Promise<Subscription | null>;
  // C29: Liste over events for alle brugerens subscriptions (nyeste først).
  listEventsForUser: (userId: string, limit?: number) => Promise<SubscriptionEvent[]>;
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
    // C26: Inkludér 'pending' så vi ikke kan ende med to active subscriptions
    // når en bruger har et abonnement i venter-på-Stripe-checkout-state.
    // 'cancelled' ekskluderes — det er det eneste terminale state.
    const result = await this.pool.query(
      `SELECT id, user_id, couple_id, plan_id, status, current_period_start, current_period_end,
              cancel_at_period_end, cancelled_at, trial_ends_at, stripe_customer_id, stripe_subscription_id,
              stripe_price_id, invoice_descriptor, created_at, updated_at
       FROM subscription
       WHERE user_id = $1 AND status IN ('pending', 'active', 'trialing', 'past_due')
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

  async cancelAtPeriodEnd(
    id: string,
    userId: string,
    options?: { forceImmediate?: boolean }
  ): Promise<Subscription | null> {
    // C25: Tjek nuværende status før operation. cancel virker kun på aktive
    // subscriptions; afsluttede returnerer null (route-handler oversætter til 404).
    const current = await this.pool.query(
      `SELECT status FROM subscription WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [id, userId]
    );
    if (!current.rows[0]) return null;
    const status = current.rows[0].status as SubscriptionStatus;
    if (!["active", "trialing", "past_due", "pending"].includes(status)) {
      return null;
    }

    // C27: Trial-perioder håndteres specielt. Hvis brugeren cancellerer et
    // trial, går vi direkte til status='cancelled' i stedet for at lade dem
    // beholde adgang i en periode de aldrig har betalt for. Det matcher
    // "annullér når som helst — ingen binding" og er den normale håndtering
    // af trial-cancel hos abonnementstjenester.
    const goImmediate =
      options?.forceImmediate === true || status === "trialing";

    if (goImmediate) {
      const result = await this.pool.query(
        `UPDATE subscription
         SET cancel_at_period_end = true,
             cancelled_at = NOW(),
             status = 'cancelled',
             updated_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING id, user_id, couple_id, plan_id, status, current_period_start, current_period_end,
                   cancel_at_period_end, cancelled_at, trial_ends_at, stripe_customer_id,
                   stripe_subscription_id, stripe_price_id, invoice_descriptor, created_at, updated_at`,
        [id, userId]
      );
      if (!result.rows[0]) return null;

      await this.pool.query(
        `INSERT INTO subscription_event (subscription_id, event_type, metadata_json)
         VALUES ($1, 'cancellation_scheduled', $2::jsonb)`,
        [id, JSON.stringify({ immediate: true, reason: "trial_cancelled" })]
      );

      return rowToSubscription(result.rows[0]);
    }

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
    // C25: resume virker kun hvis cancel_at_period_end=true OG status ikke
    // er 'cancelled'. En afsluttet subscription kan ikke genoptages — brugeren
    // skal starte et nyt abonnement.
    const result = await this.pool.query(
      `UPDATE subscription
       SET cancel_at_period_end = false, cancelled_at = NULL, updated_at = NOW()
       WHERE id = $1
         AND user_id = $2
         AND cancel_at_period_end = true
         AND status <> 'cancelled'
       RETURNING id, user_id, couple_id, plan_id, status, current_period_start, current_period_end,
                 cancel_at_period_end, cancelled_at, trial_ends_at, stripe_customer_id,
                 stripe_subscription_id, stripe_price_id, invoice_descriptor, created_at, updated_at`,
      [id, userId]
    );
    if (!result.rows[0]) return null;
    return rowToSubscription(result.rows[0]);
  }

  async listEventsForUser(userId: string, limit = 50): Promise<SubscriptionEvent[]> {
    // C29: Returnér event-historik for alle brugerens subscriptions, nyeste
    // først. Joined via subscription.user_id så vi ikke eksponerer events
    // for andre brugere selv hvis subscription_id skulle lække.
    const result = await this.pool.query(
      `SELECT e.id, e.subscription_id, e.event_type, e.amount_cents,
              e.occurred_at, e.metadata_json
       FROM subscription_event e
       JOIN subscription s ON s.id = e.subscription_id
       WHERE s.user_id = $1
       ORDER BY e.occurred_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows.map((row) => ({
      id: String(row.id),
      subscription_id: String(row.subscription_id),
      event_type: String(row.event_type),
      amount_cents: row.amount_cents !== null ? Number(row.amount_cents) : null,
      occurred_at: row.occurred_at as Date,
      metadata_json: (row.metadata_json as Record<string, unknown>) ?? {}
    }));
  }
}
