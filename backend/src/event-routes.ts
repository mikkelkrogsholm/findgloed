import type { Hono, MiddlewareHandler } from "hono";
import type {
  AuthService,
  MembershipRepository
} from "./types";
import type {
  EventCategory,
  EventLevel,
  EventRecord,
  EventRepository,
  EventStatus
} from "./events";

type AuthSessionData = {
  user: { id: string; email: string; role?: string | null };
  session: { id: string; userId: string; expiresAt: Date | string };
};

type EventDeps = {
  authService: AuthService;
  eventRepository: EventRepository;
  membershipRepository: MembershipRepository;
};

const CATEGORIES: EventCategory[] = ["single_only", "couple_only", "mixed"];
const LEVELS: EventLevel[] = ["sensual_social", "sensual", "explicit"];
const STATUSES: EventStatus[] = ["draft", "published", "cancelled", "completed"];

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

function asDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function eventToPublicJson(
  event: EventRecord,
  isRegistered: boolean,
  registrations: number
) {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    description: event.description,
    not_for: event.not_for,
    category: event.category,
    level: event.level,
    beginner_friendly: event.beginner_friendly,
    experience_required: event.experience_required,
    facilitator_name: event.facilitator_name,
    facilitator_credential: event.facilitator_credential,
    starts_at: event.starts_at.toISOString(),
    ends_at: event.ends_at.toISOString(),
    capacity: event.capacity,
    spots_taken: registrations,
    spots_left: Math.max(0, event.capacity - registrations),
    price_cents: event.price_cents,
    region: event.region,
    location_label: event.location_label,
    // Adresse vises kun til tilmeldte (beslutning fra debat).
    location_address: isRegistered ? event.location_address : null,
    dresscode: event.dresscode,
    exit_strategy: event.exit_strategy,
    cover_path: event.cover_path,
    status: event.status,
    is_registered: isRegistered
  };
}

export function registerEventRoutes(
  app: Hono<{ Variables: { authSession: AuthSessionData } }>,
  deps: EventDeps
): void {
  const { authService, eventRepository, membershipRepository } = deps;

  const memberAuthMiddleware: MiddlewareHandler<{ Variables: { authSession: AuthSessionData } }> =
    async (c, next) => {
      const authSession = await authService.getSession(c.req.raw.headers);
      if (!authSession) {
        return c.json({ ok: false, code: "UNAUTHORIZED" }, 401);
      }
      c.set("authSession", authSession);
      await next();
    };

  app.use("/api/events", memberAuthMiddleware);
  app.use("/api/events/*", memberAuthMiddleware);

  const adminMiddleware: MiddlewareHandler<{ Variables: { authSession: AuthSessionData } }> =
    async (c, next) => {
      const session = await authService.getSession(c.req.raw.headers);
      if (!session) return c.json({ ok: false, code: "UNAUTHORIZED" }, 401);
      if (session.user.role !== "admin") return c.json({ ok: false, code: "FORBIDDEN" }, 403);
      c.set("authSession", session);
      await next();
    };

  app.use("/api/admin/events", adminMiddleware);
  app.use("/api/admin/events/*", adminMiddleware);

  app.get("/api/events", async (c) => {
    const session = c.get("authSession");
    const profile = await membershipRepository.getProfile(session.user.id);
    if (!profile) return c.json({ ok: false, code: "NOT_FOUND" }, 404);

    const url = new URL(c.req.url);
    const category = url.searchParams.get("category");
    const level = url.searchParams.get("level");
    const region = url.searchParams.get("region");
    const beginner = url.searchParams.get("beginner_friendly");

    const events = await eventRepository.list({
      category: CATEGORIES.includes(category as EventCategory) ? (category as EventCategory) : undefined,
      level: LEVELS.includes(level as EventLevel) ? (level as EventLevel) : undefined,
      region: region ?? undefined,
      beginnerFriendly: beginner === "true" ? true : beginner === "false" ? false : undefined,
      upcomingOnly: true
    });

    // Filtrér per beslutning 3: par-only events kun til verificerede par,
    // mixed events kun for par der har accepts_mixed_events=true (eller for singles).
    const couple = await membershipRepository.getCoupleByUser(session.user.id);
    const userIsCouple = Boolean(couple);
    const allowedEvents = events.filter((event) => {
      if (event.category === "single_only" && userIsCouple) return false;
      if (event.category === "couple_only" && !userIsCouple) return false;
      if (event.category === "mixed" && userIsCouple && !couple?.accepts_mixed_events) return false;
      return true;
    });

    const enriched = await Promise.all(
      allowedEvents.map(async (event) => {
        const registration = await eventRepository.getRegistration(event.id, session.user.id);
        const isRegistered =
          !!registration && (registration.status === "confirmed" || registration.status === "pending");
        const count = await eventRepository.countConfirmed(event.id);
        return eventToPublicJson(event, isRegistered, count);
      })
    );

    return c.json({ ok: true, events: enriched });
  });

  app.get("/api/events/:slug", async (c) => {
    const session = c.get("authSession");
    const slug = c.req.param("slug");
    const event = await eventRepository.getBySlug(slug);
    if (!event) return c.json({ ok: false, code: "NOT_FOUND" }, 404);

    const registration = await eventRepository.getRegistration(event.id, session.user.id);
    const isRegistered =
      !!registration && (registration.status === "confirmed" || registration.status === "pending");
    const count = await eventRepository.countConfirmed(event.id);

    return c.json({
      ok: true,
      event: eventToPublicJson(event, isRegistered, count)
    });
  });

  app.post("/api/events/:slug/register", async (c) => {
    const session = c.get("authSession");
    const slug = c.req.param("slug");

    const profile = await membershipRepository.getProfile(session.user.id);
    if (!profile) return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    if (profile.verification_status !== "verified") {
      return c.json({ ok: false, code: "VERIFICATION_REQUIRED" }, 403);
    }

    const event = await eventRepository.getBySlug(slug);
    if (!event) return c.json({ ok: false, code: "NOT_FOUND" }, 404);

    const couple = await membershipRepository.getCoupleByUser(session.user.id);
    if (event.category === "single_only" && couple) {
      return c.json({ ok: false, code: "SINGLE_ONLY" }, 403);
    }
    if (event.category === "couple_only" && !couple) {
      return c.json({ ok: false, code: "COUPLE_ONLY" }, 403);
    }
    if (event.category === "mixed" && couple && !couple.accepts_mixed_events) {
      return c.json({ ok: false, code: "COUPLE_NOT_OPEN_TO_MIXED" }, 403);
    }

    const registration = await eventRepository.register(
      event.id,
      session.user.id,
      couple?.id ?? null
    );
    if (!registration) {
      return c.json({ ok: false, code: "REGISTRATION_FAILED" }, 409);
    }
    return c.json({ ok: true, registration });
  });

  app.delete("/api/events/:slug/register", async (c) => {
    const session = c.get("authSession");
    const slug = c.req.param("slug");
    const event = await eventRepository.getBySlug(slug);
    if (!event) return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    const cancelled = await eventRepository.cancelRegistration(event.id, session.user.id);
    if (!cancelled) return c.json({ ok: false, code: "NOT_REGISTERED" }, 404);
    return c.json({ ok: true });
  });

  app.get("/api/me/events", async (c) => {
    const session = c.get("authSession");
    const registrations = await eventRepository.listRegistrationsForUser(session.user.id);
    return c.json({
      ok: true,
      registrations: registrations.map((r) => ({
        id: r.id,
        status: r.status,
        registered_at: r.registered_at.toISOString(),
        event: eventToPublicJson(r.event, true, 0)
      }))
    });
  });

  // Admin
  app.get("/api/admin/events", async (c) => {
    const events = await eventRepository.listAdmin();
    return c.json({ ok: true, events });
  });

  app.post("/api/admin/events", async (c) => {
    const session = c.get("authSession");
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return c.json({ ok: false, code: "INVALID_BODY" }, 400);

    const slug = asString(body.slug);
    const title = asString(body.title);
    const description = asString(body.description);
    const category = body.category;
    const level = body.level;
    const startsAt = asDate(body.starts_at);
    const endsAt = asDate(body.ends_at);
    const capacity = asInt(body.capacity);
    const facilitatorName = asString(body.facilitator_name);

    if (!slug || !title || !description || !startsAt || !endsAt || !capacity || !facilitatorName) {
      return c.json({ ok: false, code: "MISSING_FIELDS" }, 422);
    }
    if (!CATEGORIES.includes(category as EventCategory)) {
      return c.json({ ok: false, code: "INVALID_CATEGORY" }, 422);
    }
    if (!LEVELS.includes(level as EventLevel)) {
      return c.json({ ok: false, code: "INVALID_LEVEL" }, 422);
    }
    const status = STATUSES.includes(body.status as EventStatus)
      ? (body.status as EventStatus)
      : "draft";

    const created = await eventRepository.insert({
      slug,
      title,
      description,
      not_for: asString(body.not_for),
      category: category as EventCategory,
      level: level as EventLevel,
      beginner_friendly: body.beginner_friendly === true,
      experience_required: body.experience_required === true,
      facilitator_user_id: asString(body.facilitator_user_id),
      facilitator_name: facilitatorName,
      facilitator_credential: asString(body.facilitator_credential),
      starts_at: startsAt,
      ends_at: endsAt,
      capacity,
      price_cents: asInt(body.price_cents) ?? 0,
      region: asString(body.region),
      location_label: asString(body.location_label),
      location_address: asString(body.location_address),
      dresscode: asString(body.dresscode),
      exit_strategy: asString(body.exit_strategy),
      cover_path: asString(body.cover_path),
      status,
      created_by: session.user.id
    });
    return c.json({ ok: true, event: created });
  });

  app.patch("/api/admin/events/:id", async (c) => {
    const id = c.req.param("id");
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return c.json({ ok: false, code: "INVALID_BODY" }, 400);

    const update: Parameters<typeof eventRepository.update>[1] = {};
    if ("title" in body) update.title = asString(body.title) ?? undefined;
    if ("description" in body) update.description = asString(body.description) ?? undefined;
    if ("not_for" in body) update.not_for = asString(body.not_for);
    if ("category" in body && CATEGORIES.includes(body.category as EventCategory)) {
      update.category = body.category as EventCategory;
    }
    if ("level" in body && LEVELS.includes(body.level as EventLevel)) {
      update.level = body.level as EventLevel;
    }
    if ("beginner_friendly" in body) update.beginner_friendly = body.beginner_friendly === true;
    if ("experience_required" in body) update.experience_required = body.experience_required === true;
    if ("facilitator_name" in body) update.facilitator_name = asString(body.facilitator_name) ?? undefined;
    if ("facilitator_credential" in body) update.facilitator_credential = asString(body.facilitator_credential);
    if ("starts_at" in body) {
      const d = asDate(body.starts_at);
      if (d) update.starts_at = d;
    }
    if ("ends_at" in body) {
      const d = asDate(body.ends_at);
      if (d) update.ends_at = d;
    }
    if ("capacity" in body) {
      const v = asInt(body.capacity);
      if (v) update.capacity = v;
    }
    if ("price_cents" in body) {
      const v = asInt(body.price_cents);
      if (v !== null && v >= 0) update.price_cents = v;
    }
    if ("region" in body) update.region = asString(body.region);
    if ("location_label" in body) update.location_label = asString(body.location_label);
    if ("location_address" in body) update.location_address = asString(body.location_address);
    if ("dresscode" in body) update.dresscode = asString(body.dresscode);
    if ("exit_strategy" in body) update.exit_strategy = asString(body.exit_strategy);
    if ("status" in body && STATUSES.includes(body.status as EventStatus)) {
      update.status = body.status as EventStatus;
    }

    const updated = await eventRepository.update(id, update);
    if (!updated) return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    return c.json({ ok: true, event: updated });
  });

  app.delete("/api/admin/events/:id", async (c) => {
    const id = c.req.param("id");
    const ok = await eventRepository.delete(id);
    if (!ok) return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    return c.json({ ok: true });
  });

  app.get("/api/admin/events/:id/registrations", async (c) => {
    const id = c.req.param("id");
    const registrations = await eventRepository.listRegistrationsForEvent(id);

    // B10: Berig med display_name + email så admin kan se hvem der er
    // tilmeldt uden at slå op i DB manuelt. Bruger
    // getProfileIncludingDeleted så slettede brugere stadig vises som
    // "[Slettet bruger]" i stedet for "Ukendt" — kontinuitet i A10.
    const enriched = await Promise.all(
      registrations.map(async (reg) => {
        const profile = await membershipRepository.getProfileIncludingDeleted(
          reg.user_id
        );
        return {
          ...reg,
          display_name: profile?.display_name ?? null,
          email: profile?.email ?? null
        };
      })
    );

    return c.json({ ok: true, registrations: enriched });
  });
}
