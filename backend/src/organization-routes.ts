import type { Hono, MiddlewareHandler } from "hono";
import type { AuthService, MembershipRepository } from "./types";
import type {
  EventCategory,
  EventLevel,
  EventRepository,
  EventStatus
} from "./events";
import { eventToPublicSafeJson } from "./event-routes";
import type {
  OrganizationRecord,
  OrganizationRepository,
  OrgRole
} from "./organization";
import { isValidEmail, normalizeEmail } from "./validators";
import type { UploadStore } from "./uploads";

type AuthSessionData = {
  user: { id: string; email: string; role?: string | null };
  session: { id: string; userId: string; expiresAt: Date | string };
};

type OrganizationDeps = {
  authService: AuthService;
  organizationRepository: OrganizationRepository;
  eventRepository: EventRepository;
  membershipRepository: MembershipRepository;
  // Valgfri: når sat kan organisationer uploade et logo.
  uploadStore?: UploadStore;
};

const CATEGORIES: EventCategory[] = ["single_only", "couple_only", "mixed"];
const LEVELS: EventLevel[] = ["sensual_social", "sensual", "explicit"];
const ORGANIZER_EVENT_STATUSES: EventStatus[] = ["draft", "published"];
const ORG_ROLES: OrgRole[] = ["owner", "editor"];

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

function asStringIdArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    // Danske bogstaver translittereres som i projektets eget navn
    // ("Glød" → "gloed", jf. domænet findgloed).
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function organizationToJson(org: OrganizationRecord) {
  return {
    id: org.id,
    slug: org.slug,
    name: org.name,
    description: org.description,
    region: org.region,
    contact_email: org.contact_email,
    logo_path: org.logo_path,
    status: org.status,
    created_at: org.created_at.toISOString(),
    updated_at: org.updated_at.toISOString()
  };
}

// Offentlig org-repræsentation: ingen kontakt-email, status eller interne
// tidsstempler — kun det der må vises til alle (privatliv på en følsom platform).
function organizationToPublicJson(org: OrganizationRecord) {
  return {
    id: org.id,
    slug: org.slug,
    name: org.name,
    description: org.description,
    region: org.region,
    logo_path: org.logo_path
  };
}

export function registerOrganizationRoutes(
  app: Hono<{ Variables: { authSession: AuthSessionData } }>,
  deps: OrganizationDeps
): void {
  const { authService, organizationRepository, eventRepository, membershipRepository, uploadStore } = deps;

  // ---------- Offentlige org-routes (uden auth, til opdagelse) ----------
  // Skal registreres FØR auth-middleware på /api/organizations* (de ligger
  // dog på /api/public/* så de fanges alligevel ikke af den).

  app.get("/api/public/organizations", async (c) => {
    const url = new URL(c.req.url);
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit")) || 50));
    const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
    const { items, total } = await organizationRepository.listPublic({ limit, offset });
    return c.json({
      ok: true,
      organizations: items.map(organizationToPublicJson),
      meta: { total, limit, offset, has_more: offset + items.length < total }
    });
  });

  app.get("/api/public/organizations/:slug", async (c) => {
    const org = await organizationRepository.getPublicBySlug(c.req.param("slug"));
    if (!org) return c.json({ ok: false, code: "NOT_FOUND" }, 404);

    const events = await organizationRepository.listPublishedEventsForOrg(org.id, { limit: 50 });
    const counts = await eventRepository.countConfirmedForEvents(events.map((e) => e.id));

    return c.json({
      ok: true,
      organization: organizationToPublicJson(org),
      events: events.map((e) => eventToPublicSafeJson(e, counts.get(e.id) ?? 0))
    });
  });

  // Offentligt logo-stream (kun aktive orgs). Bruges af både SSR og SPA.
  app.get("/api/public/organizations/:slug/logo", async (c) => {
    const org = await organizationRepository.getPublicBySlug(c.req.param("slug"));
    if (!org || !org.logo_path || !uploadStore) {
      return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    }
    try {
      const file = await uploadStore.read(org.logo_path);
      return new Response(new Uint8Array(file.data) as unknown as BodyInit, {
        headers: {
          "Content-Type": file.mimeType,
          "Cache-Control": "public, max-age=300, stale-while-revalidate=3600"
        }
      });
    } catch {
      return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    }
  });

  // Alle org-routes kræver login. Selve role/medlemskab-gaten håndteres
  // pr. route nedenfor.
  const authMiddleware: MiddlewareHandler<{ Variables: { authSession: AuthSessionData } }> =
    async (c, next) => {
      const session = await authService.getSession(c.req.raw.headers);
      if (!session) return c.json({ ok: false, code: "UNAUTHORIZED" }, 401);
      c.set("authSession", session);
      await next();
    };

  app.use("/api/organizations", authMiddleware);
  app.use("/api/organizations/*", authMiddleware);

  const isAdmin = (c: { get: (k: "authSession") => AuthSessionData }) =>
    c.get("authSession").user.role === "admin";

  const canCreateOrg = (role: string | null | undefined) =>
    role === "organizer" || role === "admin";

  // Genbrugt gate: henter org + kalderens medlemskab. Admins har altid adgang.
  async function loadOrgAccess(
    orgId: string,
    userId: string,
    admin: boolean
  ): Promise<
    | { ok: true; org: OrganizationRecord; orgRole: OrgRole | null }
    | { ok: false; status: 403 | 404 }
  > {
    const org = await organizationRepository.getById(orgId);
    if (!org) return { ok: false, status: 404 };
    const membership = await organizationRepository.getMembership(orgId, userId);
    if (!membership && !admin) return { ok: false, status: 403 };
    return { ok: true, org, orgRole: membership?.org_role ?? null };
  }

  // ---------- Organizations ----------

  app.get("/api/organizations", async (c) => {
    const session = c.get("authSession");
    const orgs = await organizationRepository.listForUser(session.user.id);
    return c.json({
      ok: true,
      organizations: orgs.map((o) => ({ ...organizationToJson(o), org_role: o.org_role }))
    });
  });

  app.post("/api/organizations", async (c) => {
    const session = c.get("authSession");
    if (!canCreateOrg(session.user.role)) {
      return c.json(
        {
          ok: false,
          code: "FORBIDDEN",
          message: "Kun organizers kan oprette organisationer."
        },
        403
      );
    }

    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return c.json({ ok: false, code: "INVALID_BODY" }, 400);

    const name = asString(body.name);
    if (!name) return c.json({ ok: false, code: "MISSING_FIELDS", message: "name er påkrævet." }, 422);

    const contactEmailRaw = asString(body.contact_email);
    if (contactEmailRaw && !isValidEmail(normalizeEmail(contactEmailRaw))) {
      return c.json({ ok: false, code: "INVALID_EMAIL" }, 422);
    }

    // Slug: brug medsendt slug, ellers afled fra navn. Sikr unikhed.
    let slug = asString(body.slug);
    slug = slug ? slugify(slug) : slugify(name);
    if (!slug) slug = "org";
    let candidate = slug;
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await organizationRepository.getBySlug(candidate);
      if (!existing) break;
      candidate = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const created = await organizationRepository.create(
      {
        slug: candidate,
        name,
        description: asString(body.description),
        region: asString(body.region),
        contact_email: contactEmailRaw ? normalizeEmail(contactEmailRaw) : null,
        logo_path: asString(body.logo_path)
      },
      session.user.id
    );
    return c.json({ ok: true, organization: organizationToJson(created) });
  });

  app.get("/api/organizations/:id", async (c) => {
    const session = c.get("authSession");
    const access = await loadOrgAccess(c.req.param("id"), session.user.id, isAdmin(c));
    if (!access.ok) return c.json({ ok: false, code: access.status === 404 ? "NOT_FOUND" : "FORBIDDEN" }, access.status);
    return c.json({
      ok: true,
      organization: { ...organizationToJson(access.org), org_role: access.orgRole }
    });
  });

  app.patch("/api/organizations/:id", async (c) => {
    const session = c.get("authSession");
    const admin = isAdmin(c);
    const access = await loadOrgAccess(c.req.param("id"), session.user.id, admin);
    if (!access.ok) return c.json({ ok: false, code: access.status === 404 ? "NOT_FOUND" : "FORBIDDEN" }, access.status);
    if (access.orgRole !== "owner" && !admin) {
      return c.json({ ok: false, code: "FORBIDDEN", message: "Kun owners kan redigere." }, 403);
    }

    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return c.json({ ok: false, code: "INVALID_BODY" }, 400);

    const update: Parameters<typeof organizationRepository.update>[1] = {};
    if ("name" in body) {
      const name = asString(body.name);
      if (name) update.name = name;
    }
    if ("description" in body) update.description = asString(body.description);
    if ("region" in body) update.region = asString(body.region);
    if ("contact_email" in body) {
      const email = asString(body.contact_email);
      if (email && !isValidEmail(normalizeEmail(email))) {
        return c.json({ ok: false, code: "INVALID_EMAIL" }, 422);
      }
      update.contact_email = email ? normalizeEmail(email) : null;
    }
    if ("logo_path" in body) update.logo_path = asString(body.logo_path);
    // Kun admins kan suspendere/aktivere en org.
    if ("status" in body && admin && (body.status === "active" || body.status === "suspended")) {
      update.status = body.status;
    }

    const updated = await organizationRepository.update(c.req.param("id"), update);
    if (!updated) return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    return c.json({ ok: true, organization: organizationToJson(updated) });
  });

  app.delete("/api/organizations/:id", async (c) => {
    const session = c.get("authSession");
    const admin = isAdmin(c);
    const access = await loadOrgAccess(c.req.param("id"), session.user.id, admin);
    if (!access.ok) return c.json({ ok: false, code: access.status === 404 ? "NOT_FOUND" : "FORBIDDEN" }, access.status);
    if (access.orgRole !== "owner" && !admin) {
      return c.json({ ok: false, code: "FORBIDDEN", message: "Kun owners kan slette." }, 403);
    }
    const ok = await organizationRepository.delete(c.req.param("id"));
    if (!ok) return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    return c.json({ ok: true });
  });

  // Logo-upload (kun owner/admin). Multipart — body-limit hæves for denne
  // path i app.ts. Gammelt logo slettes efter nyt er gemt.
  app.post("/api/organizations/:id/logo", async (c) => {
    if (!uploadStore) return c.json({ ok: false, code: "NOT_AVAILABLE" }, 503);
    const session = c.get("authSession");
    const admin = isAdmin(c);
    const orgId = c.req.param("id");
    const access = await loadOrgAccess(orgId, session.user.id, admin);
    if (!access.ok) return c.json({ ok: false, code: access.status === 404 ? "NOT_FOUND" : "FORBIDDEN" }, access.status);
    if (access.orgRole !== "owner" && !admin) {
      return c.json({ ok: false, code: "FORBIDDEN", message: "Kun owners kan ændre logo." }, 403);
    }

    let formData: FormData;
    try {
      formData = await c.req.formData();
    } catch {
      return c.json({ ok: false, code: "INVALID_MULTIPART" }, 400);
    }
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return c.json({ ok: false, code: "FILE_REQUIRED" }, 422);
    }

    let upload;
    try {
      upload = await uploadStore.saveImage("organization", orgId, file);
    } catch (error) {
      const message = (error as Error).message;
      if (message === "UNSUPPORTED_MIME_TYPE") return c.json({ ok: false, code: "UNSUPPORTED_MIME_TYPE" }, 422);
      if (message === "FILE_TOO_LARGE") return c.json({ ok: false, code: "FILE_TOO_LARGE" }, 413);
      if (message === "MIME_MISMATCH") return c.json({ ok: false, code: "MIME_MISMATCH" }, 422);
      throw error;
    }

    const oldPath = access.org.logo_path;
    const updated = await organizationRepository.update(orgId, { logo_path: upload.storagePath });
    if (oldPath && oldPath !== upload.storagePath) {
      await uploadStore.delete(oldPath).catch(() => undefined);
    }
    if (!updated) return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    return c.json({ ok: true, organization: organizationToJson(updated) });
  });

  // ---------- Members ----------

  app.get("/api/organizations/:id/members", async (c) => {
    const session = c.get("authSession");
    const access = await loadOrgAccess(c.req.param("id"), session.user.id, isAdmin(c));
    if (!access.ok) return c.json({ ok: false, code: access.status === 404 ? "NOT_FOUND" : "FORBIDDEN" }, access.status);

    const members = await organizationRepository.listMembers(c.req.param("id"));
    const enriched = await Promise.all(
      members.map(async (m) => {
        const profile = await membershipRepository.getProfileIncludingDeleted(m.user_id);
        return {
          user_id: m.user_id,
          org_role: m.org_role,
          display_name: profile?.display_name ?? null,
          email: profile?.email ?? null,
          created_at: m.created_at.toISOString()
        };
      })
    );
    return c.json({ ok: true, members: enriched });
  });

  app.post("/api/organizations/:id/members", async (c) => {
    const session = c.get("authSession");
    const admin = isAdmin(c);
    const orgId = c.req.param("id");
    const access = await loadOrgAccess(orgId, session.user.id, admin);
    if (!access.ok) return c.json({ ok: false, code: access.status === 404 ? "NOT_FOUND" : "FORBIDDEN" }, access.status);
    if (access.orgRole !== "owner" && !admin) {
      return c.json({ ok: false, code: "FORBIDDEN", message: "Kun owners kan tilføje medlemmer." }, 403);
    }

    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return c.json({ ok: false, code: "INVALID_BODY" }, 400);

    const emailRaw = asString(body.email);
    const role = body.org_role;
    if (!emailRaw) return c.json({ ok: false, code: "MISSING_FIELDS", message: "email er påkrævet." }, 422);
    if (!ORG_ROLES.includes(role as OrgRole)) {
      return c.json({ ok: false, code: "INVALID_ROLE", message: "org_role skal være 'owner' eller 'editor'." }, 422);
    }

    const target = await membershipRepository.findProfileByEmail(normalizeEmail(emailRaw));
    if (!target) return c.json({ ok: false, code: "USER_NOT_FOUND", message: "Ingen bruger med den email." }, 404);

    const member = await organizationRepository.addMember(orgId, target.user_id, role as OrgRole);
    return c.json({
      ok: true,
      member: {
        user_id: member.user_id,
        org_role: member.org_role,
        display_name: target.display_name,
        email: target.email,
        created_at: member.created_at.toISOString()
      }
    });
  });

  app.delete("/api/organizations/:id/members/:userId", async (c) => {
    const session = c.get("authSession");
    const admin = isAdmin(c);
    const orgId = c.req.param("id");
    const targetUserId = c.req.param("userId");
    const access = await loadOrgAccess(orgId, session.user.id, admin);
    if (!access.ok) return c.json({ ok: false, code: access.status === 404 ? "NOT_FOUND" : "FORBIDDEN" }, access.status);
    if (access.orgRole !== "owner" && !admin) {
      return c.json({ ok: false, code: "FORBIDDEN", message: "Kun owners kan fjerne medlemmer." }, 403);
    }

    // Anti-orphan: org skal altid have mindst én owner tilbage.
    const target = await organizationRepository.getMembership(orgId, targetUserId);
    if (!target) return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    if (target.org_role === "owner") {
      const owners = await organizationRepository.countOwners(orgId);
      if (owners <= 1) {
        return c.json(
          {
            ok: false,
            code: "LAST_OWNER",
            message: "Organisationen skal have mindst én owner."
          },
          422
        );
      }
    }

    const ok = await organizationRepository.removeMember(orgId, targetUserId);
    if (!ok) return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    return c.json({ ok: true });
  });

  // ---------- Org-events ----------

  app.get("/api/organizations/:id/events", async (c) => {
    const session = c.get("authSession");
    const access = await loadOrgAccess(c.req.param("id"), session.user.id, isAdmin(c));
    if (!access.ok) return c.json({ ok: false, code: access.status === 404 ? "NOT_FOUND" : "FORBIDDEN" }, access.status);
    const { items, total } = await organizationRepository.listEventsForOrg(c.req.param("id"));
    return c.json({ ok: true, events: items, meta: { total } });
  });

  app.post("/api/organizations/:id/events", async (c) => {
    const session = c.get("authSession");
    const admin = isAdmin(c);
    const orgId = c.req.param("id");
    const access = await loadOrgAccess(orgId, session.user.id, admin);
    if (!access.ok) return c.json({ ok: false, code: access.status === 404 ? "NOT_FOUND" : "FORBIDDEN" }, access.status);
    // Både owner og editor må oprette events; et almindeligt (ikke-medlem)
    // admin-kald er også tilladt.
    if (!access.orgRole && !admin) {
      return c.json({ ok: false, code: "FORBIDDEN" }, 403);
    }
    if (access.org.status !== "active" && !admin) {
      return c.json({ ok: false, code: "ORG_SUSPENDED", message: "Organisationen er suspenderet." }, 403);
    }

    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return c.json({ ok: false, code: "INVALID_BODY" }, 400);

    const slug = asString(body.slug);
    const title = asString(body.title);
    const description = asString(body.description);
    const startsAt = asDate(body.starts_at);
    const endsAt = asDate(body.ends_at);
    const capacity = asInt(body.capacity);
    const facilitatorName = asString(body.facilitator_name);
    if (!slug || !title || !description || !startsAt || !endsAt || !capacity || !facilitatorName) {
      return c.json({ ok: false, code: "MISSING_FIELDS" }, 422);
    }
    if (!CATEGORIES.includes(body.category as EventCategory)) {
      return c.json({ ok: false, code: "INVALID_CATEGORY" }, 422);
    }
    if (!LEVELS.includes(body.level as EventLevel)) {
      return c.json({ ok: false, code: "INVALID_LEVEL" }, 422);
    }
    if (capacity <= 0) {
      return c.json({ ok: false, code: "INVALID_CAPACITY" }, 422);
    }
    // Organizers må publicere direkte; default er draft.
    const status = ORGANIZER_EVENT_STATUSES.includes(body.status as EventStatus)
      ? (body.status as EventStatus)
      : "draft";

    // Co-host-orgs skal eksistere. Self-id frafiltreres i setEventOrganizations.
    const coHostIds = asStringIdArray(body.co_organization_ids).filter((id) => id !== orgId);
    for (const coHostId of coHostIds) {
      const coHost = await organizationRepository.getById(coHostId);
      if (!coHost) {
        return c.json({ ok: false, code: "INVALID_CO_HOST", message: `Ukendt co-host: ${coHostId}` }, 422);
      }
    }

    const created = await eventRepository.insert({
      slug,
      title,
      description,
      not_for: asString(body.not_for),
      category: body.category as EventCategory,
      level: body.level as EventLevel,
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

    await organizationRepository.setEventOrganizations(created.id, orgId, coHostIds);
    return c.json({ ok: true, event: created });
  });

  // Kun den primære (arrangerende) org kan redigere eventet. Co-host-orgs
  // ser eventet i deres liste men kan ikke ændre det.
  async function requirePrimaryHost(
    orgId: string,
    eventId: string
  ): Promise<boolean> {
    const links = await organizationRepository.listOrganizationsForEvents([eventId]);
    const primary = (links.get(eventId) ?? []).find((l) => l.is_primary);
    return primary?.organization_id === orgId;
  }

  app.patch("/api/organizations/:id/events/:eventId", async (c) => {
    const session = c.get("authSession");
    const admin = isAdmin(c);
    const orgId = c.req.param("id");
    const eventId = c.req.param("eventId");
    const access = await loadOrgAccess(orgId, session.user.id, admin);
    if (!access.ok) return c.json({ ok: false, code: access.status === 404 ? "NOT_FOUND" : "FORBIDDEN" }, access.status);
    if (!access.orgRole && !admin) {
      return c.json({ ok: false, code: "FORBIDDEN" }, 403);
    }
    if (!(await requirePrimaryHost(orgId, eventId)) && !admin) {
      return c.json({ ok: false, code: "NOT_PRIMARY_HOST", message: "Kun den arrangerende organisation kan redigere eventet." }, 403);
    }

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
      if (v && v > 0) update.capacity = v;
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
    if ("status" in body && ORGANIZER_EVENT_STATUSES.includes(body.status as EventStatus)) {
      update.status = body.status as EventStatus;
    }

    const updated = await eventRepository.update(eventId, update);
    if (!updated) return c.json({ ok: false, code: "NOT_FOUND" }, 404);

    // Co-hosts kan opdateres ved at sende co_organization_ids.
    if ("co_organization_ids" in body) {
      const coHostIds = asStringIdArray(body.co_organization_ids).filter((id) => id !== orgId);
      for (const coHostId of coHostIds) {
        const coHost = await organizationRepository.getById(coHostId);
        if (!coHost) {
          return c.json({ ok: false, code: "INVALID_CO_HOST", message: `Ukendt co-host: ${coHostId}` }, 422);
        }
      }
      await organizationRepository.setEventOrganizations(eventId, orgId, coHostIds);
    }

    return c.json({ ok: true, event: updated });
  });

  app.delete("/api/organizations/:id/events/:eventId", async (c) => {
    const session = c.get("authSession");
    const admin = isAdmin(c);
    const orgId = c.req.param("id");
    const eventId = c.req.param("eventId");
    const access = await loadOrgAccess(orgId, session.user.id, admin);
    if (!access.ok) return c.json({ ok: false, code: access.status === 404 ? "NOT_FOUND" : "FORBIDDEN" }, access.status);
    if (!access.orgRole && !admin) {
      return c.json({ ok: false, code: "FORBIDDEN" }, 403);
    }
    if (!(await requirePrimaryHost(orgId, eventId)) && !admin) {
      return c.json({ ok: false, code: "NOT_PRIMARY_HOST" }, 403);
    }
    const ok = await eventRepository.delete(eventId);
    if (!ok) return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    return c.json({ ok: true });
  });
}
