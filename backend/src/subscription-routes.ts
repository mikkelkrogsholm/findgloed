import type { Hono, MiddlewareHandler } from "hono";
import type { AuthService, MembershipRepository } from "./types";
import type { SubscriptionRepository } from "./subscriptions";

type AuthSessionData = {
  user: { id: string; email: string; role?: string | null };
  session: { id: string; userId: string; expiresAt: Date | string };
};

type SubscriptionDeps = {
  authService: AuthService;
  membershipRepository: MembershipRepository;
  subscriptionRepository: SubscriptionRepository;
};

export function registerSubscriptionRoutes(
  app: Hono<{ Variables: { authSession: AuthSessionData } }>,
  deps: SubscriptionDeps
): void {
  const { authService, membershipRepository, subscriptionRepository } = deps;

  const memberAuth: MiddlewareHandler<{ Variables: { authSession: AuthSessionData } }> =
    async (c, next) => {
      const session = await authService.getSession(c.req.raw.headers);
      if (!session) return c.json({ ok: false, code: "UNAUTHORIZED" }, 401);
      c.set("authSession", session);
      await next();
    };

  app.use("/api/me/subscription", memberAuth);
  app.use("/api/me/subscription/*", memberAuth);
  app.use("/api/plans", memberAuth);

  app.get("/api/plans", async (c) => {
    const session = c.get("authSession");
    const couple = await membershipRepository.getCoupleByUser(session.user.id);
    const plans = await subscriptionRepository.listPlans();
    const audience = couple ? "couple" : "single";
    return c.json({
      ok: true,
      audience,
      plans: plans.filter((p) => p.audience === audience)
    });
  });

  app.get("/api/me/subscription", async (c) => {
    const session = c.get("authSession");
    const subscription = await subscriptionRepository.getActiveSubscription(session.user.id);
    if (!subscription) {
      return c.json({ ok: true, subscription: null });
    }
    const plan = await subscriptionRepository.getPlan(subscription.plan_id);
    return c.json({ ok: true, subscription, plan });
  });

  app.post("/api/me/subscription", async (c) => {
    const session = c.get("authSession");
    const body = (await c.req.json().catch(() => null)) as { plan_id?: unknown } | null;
    const planId = typeof body?.plan_id === "string" ? body.plan_id : null;
    if (!planId) return c.json({ ok: false, code: "MISSING_PLAN" }, 422);

    const plan = await subscriptionRepository.getPlan(planId);
    if (!plan || !plan.is_active) {
      return c.json({ ok: false, code: "INVALID_PLAN" }, 422);
    }

    const couple = await membershipRepository.getCoupleByUser(session.user.id);
    if (plan.audience === "couple" && !couple) {
      return c.json({ ok: false, code: "COUPLE_REQUIRED" }, 422);
    }

    const existing = await subscriptionRepository.getActiveSubscription(session.user.id);
    if (existing) {
      return c.json({ ok: false, code: "ALREADY_ACTIVE", subscription: existing }, 409);
    }

    // STRIPE-MOCK: I rigtig integration ville flowet være:
    //   1. POST til Stripe Checkout Session
    //   2. Returnere checkout URL til klienten
    //   3. Webhook fra Stripe bekræfter betaling og aktiverer abonnementet
    // For nu opretter vi direkte et "active"/"trialing"-abonnement.
    const subscription = await subscriptionRepository.startSubscription(
      session.user.id,
      couple?.id ?? null,
      plan
    );

    return c.json({
      ok: true,
      subscription,
      plan,
      mock_notice:
        "Stripe er ikke aktiveret endnu. Abonnementet er oprettet som mock og du faktureres ikke."
    });
  });

  app.post("/api/me/subscription/:id/cancel", async (c) => {
    const session = c.get("authSession");
    const subscription = await subscriptionRepository.cancelAtPeriodEnd(
      c.req.param("id"),
      session.user.id
    );
    if (!subscription) return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    return c.json({ ok: true, subscription });
  });

  app.post("/api/me/subscription/:id/resume", async (c) => {
    const session = c.get("authSession");
    const subscription = await subscriptionRepository.resume(c.req.param("id"), session.user.id);
    if (!subscription) return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    return c.json({ ok: true, subscription });
  });
}
