import { describe, expect, test } from "bun:test";
import { createApp } from "../src/app";
import type { AuthService, MembershipProfile, MembershipRepository } from "../src/types";
import type {
  EventInsert,
  EventRecord,
  EventRepository,
  EventUpdate
} from "../src/events";
import type {
  EventOrganizationLink,
  OrganizationMember,
  OrganizationRecord,
  OrganizationRepository,
  OrgRole
} from "../src/organization";

// ---------- In-memory stubs ----------

function profile(id: string, email: string, role = "user"): MembershipProfile {
  return {
    user_id: id,
    email,
    display_name: email.split("@")[0],
    birth_year: 1985,
    region: "København",
    bio: null,
    initiator_role: null,
    face_visibility: "after_interest",
    verification_status: "verified",
    verified_at: new Date(),
    verified_via: "temporary",
    future_verification_accepted_at: null,
    onboarded_at: new Date(),
    paused_at: null,
    role,
    created_at: new Date()
  } as MembershipProfile;
}

function createMembership(users: MembershipProfile[]): MembershipRepository {
  const byId = new Map(users.map((u) => [u.user_id, u]));
  return {
    async getProfile(userId: string) {
      return byId.get(userId) ?? null;
    },
    async getProfileIncludingDeleted(userId: string) {
      return byId.get(userId) ?? null;
    },
    async findProfileByEmail(email: string) {
      return [...byId.values()].find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
    }
  } as unknown as MembershipRepository;
}

function auth(user: { id: string; email: string; role?: string }): AuthService {
  return {
    handler: async () => new Response("ok"),
    getSession: async () => ({
      user: { id: user.id, email: user.email, role: user.role ?? "user" },
      session: { id: "s", userId: user.id, expiresAt: new Date() }
    }),
    ensureSuperAdmin: async () => undefined
  } as unknown as AuthService;
}

function anonAuth(): AuthService {
  return {
    handler: async () => new Response("ok"),
    getSession: async () => null,
    ensureSuperAdmin: async () => undefined
  } as unknown as AuthService;
}

function org(id: string, slug: string, name: string, createdBy: string): OrganizationRecord {
  return {
    id,
    slug,
    name,
    description: null,
    region: null,
    contact_email: null,
    logo_path: null,
    status: "active",
    created_by: createdBy,
    created_at: new Date(),
    updated_at: new Date()
  };
}

// In-memory OrganizationRepository der dækker det routene bruger.
function createOrgRepo(seed?: {
  orgs?: OrganizationRecord[];
  members?: OrganizationMember[];
}): OrganizationRepository {
  const orgs = new Map<string, OrganizationRecord>((seed?.orgs ?? []).map((o) => [o.id, o]));
  const members: OrganizationMember[] = [...(seed?.members ?? [])];
  // event_id -> { orgId, isPrimary }[]
  const eventLinks = new Map<string, Array<{ orgId: string; isPrimary: boolean }>>();
  let seq = 100;

  const findMember = (orgId: string, userId: string) =>
    members.find((m) => m.organization_id === orgId && m.user_id === userId) ?? null;

  return {
    async create(input, ownerUserId) {
      const id = `org-${seq++}`;
      const record = org(id, input.slug, input.name, ownerUserId);
      record.description = input.description;
      record.region = input.region;
      record.contact_email = input.contact_email;
      record.logo_path = input.logo_path;
      orgs.set(id, record);
      members.push({
        organization_id: id,
        user_id: ownerUserId,
        org_role: "owner",
        created_at: new Date()
      });
      return record;
    },
    async getById(id) {
      return orgs.get(id) ?? null;
    },
    async getBySlug(slug) {
      return [...orgs.values()].find((o) => o.slug === slug) ?? null;
    },
    async update(id, update) {
      const existing = orgs.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...update, updated_at: new Date() } as OrganizationRecord;
      orgs.set(id, updated);
      return updated;
    },
    async delete(id) {
      return orgs.delete(id);
    },
    async listForUser(userId) {
      return members
        .filter((m) => m.user_id === userId)
        .map((m) => ({ ...(orgs.get(m.organization_id) as OrganizationRecord), org_role: m.org_role }));
    },
    async listAll() {
      return { items: [...orgs.values()], total: orgs.size };
    },
    async listPublic() {
      const active = [...orgs.values()].filter((o) => o.status === "active");
      return { items: active, total: active.length };
    },
    async getPublicBySlug(slug: string) {
      return [...orgs.values()].find((o) => o.slug === slug && o.status === "active") ?? null;
    },
    async listPublishedEventsForOrg() {
      return [];
    },
    async listMembers(orgId) {
      return members.filter((m) => m.organization_id === orgId);
    },
    async getMembership(orgId, userId) {
      return findMember(orgId, userId);
    },
    async countOwners(orgId) {
      return members.filter((m) => m.organization_id === orgId && m.org_role === "owner").length;
    },
    async addMember(orgId, userId, role: OrgRole) {
      const existing = findMember(orgId, userId);
      if (existing) {
        existing.org_role = role;
        return existing;
      }
      const member: OrganizationMember = {
        organization_id: orgId,
        user_id: userId,
        org_role: role,
        created_at: new Date()
      };
      members.push(member);
      return member;
    },
    async removeMember(orgId, userId) {
      const idx = members.findIndex((m) => m.organization_id === orgId && m.user_id === userId);
      if (idx === -1) return false;
      members.splice(idx, 1);
      return true;
    },
    async setEventOrganizations(eventId, primaryOrgId, coHostOrgIds) {
      const links = [{ orgId: primaryOrgId, isPrimary: true }];
      for (const coHostId of [...new Set(coHostOrgIds)].filter((c) => c !== primaryOrgId)) {
        links.push({ orgId: coHostId, isPrimary: false });
      }
      eventLinks.set(eventId, links);
    },
    async listEventsForOrg() {
      return { items: [], total: 0 };
    },
    async listOrganizationsForEvents(eventIds) {
      const map = new Map<string, EventOrganizationLink[]>();
      for (const eventId of eventIds) {
        const links = eventLinks.get(eventId) ?? [];
        map.set(
          eventId,
          links.map((l) => ({
            organization_id: l.orgId,
            name: orgs.get(l.orgId)?.name ?? "",
            slug: orgs.get(l.orgId)?.slug ?? "",
            is_primary: l.isPrimary
          }))
        );
      }
      return map;
    },
    async isMemberOfEventHost(eventId, userId) {
      const links = eventLinks.get(eventId) ?? [];
      return links.some((l) => findMember(l.orgId, userId) !== null);
    }
  } as OrganizationRepository;
}

function createEventRepo(): EventRepository {
  const events = new Map<string, EventRecord>();
  let seq = 1;
  return {
    async insert(input: EventInsert) {
      const id = `evt-${seq++}`;
      const record = {
        ...input,
        id,
        created_at: new Date(),
        updated_at: new Date()
      } as EventRecord;
      events.set(id, record);
      return record;
    },
    async update(id: string, update: EventUpdate) {
      const existing = events.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...update, updated_at: new Date() } as EventRecord;
      events.set(id, updated);
      return updated;
    },
    async delete(id: string) {
      return events.delete(id);
    },
    async countConfirmedForEvents() {
      return new Map<string, number>();
    }
  } as unknown as EventRepository;
}

function stubUploadStore() {
  return {
    saveImage: async () => ({
      storagePath: "organization/x/logo.png",
      mimeType: "image/png",
      byteSize: 10
    }),
    delete: async () => undefined,
    read: async () => ({ data: Buffer.from([0x89, 0x50]), mimeType: "image/png" }),
    fullPath: (p: string) => p
  };
}

function createTestApp(opts: {
  authService: AuthService;
  users: MembershipProfile[];
  orgRepo: OrganizationRepository;
  eventRepo?: EventRepository;
  uploadStore?: ReturnType<typeof stubUploadStore>;
}) {
  return createApp({
    leadRepository: {
      upsertWaitlistLead: async () => ({ status: "created_pending", shouldSendConfirm: true }),
      confirmLeadByToken: async () => ({ status: "invalid" }),
      emailExistsInLeads: async () => true,
      listAdminLeads: async () => ({ items: [], meta: { total: 0, confirmed: 0, pending: 0 } })
    },
    emailService: {
      sendWaitlistConfirm: async () => undefined,
      sendWaitlistWelcome: async () => undefined,
      sendPartnerInterestConfirm: async () => undefined,
      sendPartnerInterestReceived: async () => undefined,
      sendInterestSignal: async () => undefined,
      sendNewMessage: async () => undefined
    },
    rateLimitEnabled: false,
    corsOrigins: ["http://localhost:39563"],
    appUrl: "http://localhost:39563",
    waitlistConfirmPath: "/waitlist/confirm",
    authService: opts.authService,
    membershipRepository: createMembership(opts.users),
    organizationRepository: opts.orgRepo,
    eventRepository: opts.eventRepo ?? createEventRepo(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    uploadStore: opts.uploadStore as any
  });
}

const json = (body: unknown) => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body)
});

describe("POST /api/organizations", () => {
  test("organizer kan oprette org og bliver owner", async () => {
    const orgRepo = createOrgRepo();
    const app = createTestApp({
      authService: auth({ id: "o1", email: "org@x.dk", role: "organizer" }),
      users: [profile("o1", "org@x.dk", "organizer")],
      orgRepo
    });
    const res = await app.request("/api/organizations", json({ name: "Klub Glød" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.organization.name).toBe("Klub Glød");
    expect(data.organization.slug).toBe("klub-gloed");

    const membership = await orgRepo.getMembership(data.organization.id, "o1");
    expect(membership?.org_role).toBe("owner");
  });

  test("almindelig bruger kan IKKE oprette org", async () => {
    const app = createTestApp({
      authService: auth({ id: "u1", email: "u@x.dk", role: "user" }),
      users: [profile("u1", "u@x.dk")],
      orgRepo: createOrgRepo()
    });
    const res = await app.request("/api/organizations", json({ name: "Nope" }));
    expect(res.status).toBe(403);
  });

  test("admin kan også oprette org", async () => {
    const app = createTestApp({
      authService: auth({ id: "a1", email: "a@x.dk", role: "admin" }),
      users: [profile("a1", "a@x.dk", "admin")],
      orgRepo: createOrgRepo()
    });
    const res = await app.request("/api/organizations", json({ name: "Admin Org" }));
    expect(res.status).toBe(200);
  });

  test("kræver name", async () => {
    const app = createTestApp({
      authService: auth({ id: "o1", email: "org@x.dk", role: "organizer" }),
      users: [profile("o1", "org@x.dk", "organizer")],
      orgRepo: createOrgRepo()
    });
    const res = await app.request("/api/organizations", json({}));
    expect(res.status).toBe(422);
  });
});

describe("GET /api/organizations/:id (access)", () => {
  test("medlem kan læse, ikke-medlem får 403", async () => {
    const orgRepo = createOrgRepo({
      orgs: [org("org-1", "klub", "Klub", "o1")],
      members: [{ organization_id: "org-1", user_id: "o1", org_role: "owner", created_at: new Date() }]
    });
    const memberApp = createTestApp({
      authService: auth({ id: "o1", email: "org@x.dk", role: "organizer" }),
      users: [profile("o1", "org@x.dk", "organizer")],
      orgRepo
    });
    expect((await memberApp.request("/api/organizations/org-1")).status).toBe(200);

    const outsiderApp = createTestApp({
      authService: auth({ id: "o2", email: "other@x.dk", role: "organizer" }),
      users: [profile("o2", "other@x.dk", "organizer")],
      orgRepo
    });
    expect((await outsiderApp.request("/api/organizations/org-1")).status).toBe(403);
  });

  test("admin kan læse enhver org selv uden medlemskab", async () => {
    const orgRepo = createOrgRepo({ orgs: [org("org-1", "klub", "Klub", "o1")] });
    const app = createTestApp({
      authService: auth({ id: "a1", email: "a@x.dk", role: "admin" }),
      users: [profile("a1", "a@x.dk", "admin")],
      orgRepo
    });
    expect((await app.request("/api/organizations/org-1")).status).toBe(200);
  });

  test("ukendt org giver 404", async () => {
    const app = createTestApp({
      authService: auth({ id: "a1", email: "a@x.dk", role: "admin" }),
      users: [profile("a1", "a@x.dk", "admin")],
      orgRepo: createOrgRepo()
    });
    expect((await app.request("/api/organizations/nope")).status).toBe(404);
  });
});

describe("Members", () => {
  test("owner kan tilføje medlem via email", async () => {
    const orgRepo = createOrgRepo({
      orgs: [org("org-1", "klub", "Klub", "o1")],
      members: [{ organization_id: "org-1", user_id: "o1", org_role: "owner", created_at: new Date() }]
    });
    const app = createTestApp({
      authService: auth({ id: "o1", email: "org@x.dk", role: "organizer" }),
      users: [profile("o1", "org@x.dk", "organizer"), profile("u2", "new@x.dk")],
      orgRepo
    });
    const res = await app.request("/api/organizations/org-1/members", json({ email: "new@x.dk", org_role: "editor" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.member.user_id).toBe("u2");
    expect(data.member.org_role).toBe("editor");
  });

  test("editor kan IKKE tilføje medlem", async () => {
    const orgRepo = createOrgRepo({
      orgs: [org("org-1", "klub", "Klub", "o1")],
      members: [{ organization_id: "org-1", user_id: "ed", org_role: "editor", created_at: new Date() }]
    });
    const app = createTestApp({
      authService: auth({ id: "ed", email: "ed@x.dk", role: "organizer" }),
      users: [profile("ed", "ed@x.dk", "organizer"), profile("u2", "new@x.dk")],
      orgRepo
    });
    const res = await app.request("/api/organizations/org-1/members", json({ email: "new@x.dk", org_role: "editor" }));
    expect(res.status).toBe(403);
  });

  test("kan ikke fjerne sidste owner", async () => {
    const orgRepo = createOrgRepo({
      orgs: [org("org-1", "klub", "Klub", "o1")],
      members: [{ organization_id: "org-1", user_id: "o1", org_role: "owner", created_at: new Date() }]
    });
    const app = createTestApp({
      authService: auth({ id: "o1", email: "org@x.dk", role: "organizer" }),
      users: [profile("o1", "org@x.dk", "organizer")],
      orgRepo
    });
    const res = await app.request("/api/organizations/org-1/members/o1", { method: "DELETE" });
    expect(res.status).toBe(422);
    expect((await res.json()).code).toBe("LAST_OWNER");
  });
});

describe("Org-events + co-hosting", () => {
  const validEvent = (overrides: Record<string, unknown> = {}) => ({
    slug: "intro-aften",
    title: "Intro-aften",
    description: "En blød intro.",
    category: "mixed",
    level: "sensual_social",
    starts_at: "2026-09-01T18:00:00.000Z",
    ends_at: "2026-09-01T21:00:00.000Z",
    capacity: 20,
    facilitator_name: "Carina",
    status: "published",
    ...overrides
  });

  test("medlem kan oprette event med co-host", async () => {
    const orgRepo = createOrgRepo({
      orgs: [org("org-1", "klub", "Klub", "o1"), org("org-2", "co", "Co", "o9")],
      members: [{ organization_id: "org-1", user_id: "o1", org_role: "editor", created_at: new Date() }]
    });
    const app = createTestApp({
      authService: auth({ id: "o1", email: "org@x.dk", role: "organizer" }),
      users: [profile("o1", "org@x.dk", "organizer")],
      orgRepo
    });
    const res = await app.request(
      "/api/organizations/org-1/events",
      json(validEvent({ co_organization_ids: ["org-2"] }))
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.event.status).toBe("published");

    const links = await orgRepo.listOrganizationsForEvents([data.event.id]);
    const eventLinks = links.get(data.event.id) ?? [];
    expect(eventLinks.find((l) => l.is_primary)?.organization_id).toBe("org-1");
    expect(eventLinks.some((l) => l.organization_id === "org-2" && !l.is_primary)).toBe(true);
  });

  test("ukendt co-host afvises", async () => {
    const orgRepo = createOrgRepo({
      orgs: [org("org-1", "klub", "Klub", "o1")],
      members: [{ organization_id: "org-1", user_id: "o1", org_role: "owner", created_at: new Date() }]
    });
    const app = createTestApp({
      authService: auth({ id: "o1", email: "org@x.dk", role: "organizer" }),
      users: [profile("o1", "org@x.dk", "organizer")],
      orgRepo
    });
    const res = await app.request(
      "/api/organizations/org-1/events",
      json(validEvent({ co_organization_ids: ["ghost"] }))
    );
    expect(res.status).toBe(422);
    expect((await res.json()).code).toBe("INVALID_CO_HOST");
  });

  test("co-host-org kan ikke redigere eventet (kun primær)", async () => {
    const orgRepo = createOrgRepo({
      orgs: [org("org-1", "klub", "Klub", "o1"), org("org-2", "co", "Co", "o2")],
      members: [
        { organization_id: "org-1", user_id: "o1", org_role: "owner", created_at: new Date() },
        { organization_id: "org-2", user_id: "o2", org_role: "owner", created_at: new Date() }
      ]
    });
    // org-1 opretter event med org-2 som co-host.
    const primaryApp = createTestApp({
      authService: auth({ id: "o1", email: "o1@x.dk", role: "organizer" }),
      users: [profile("o1", "o1@x.dk", "organizer")],
      orgRepo
    });
    const created = await (
      await primaryApp.request("/api/organizations/org-1/events", json(validEvent({ co_organization_ids: ["org-2"] })))
    ).json();
    const eventId = created.event.id;

    // org-2 (co-host) forsøger at redigere via sin egen org → 403.
    const coHostApp = createTestApp({
      authService: auth({ id: "o2", email: "o2@x.dk", role: "organizer" }),
      users: [profile("o2", "o2@x.dk", "organizer")],
      orgRepo
    });
    const res = await coHostApp.request(`/api/organizations/org-2/events/${eventId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Hijack" })
    });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("NOT_PRIMARY_HOST");
  });
});

describe("Public organizations", () => {
  const seed = () =>
    createOrgRepo({
      orgs: [
        org("o1", "klub", "Klub Glød", "u1"),
        { ...org("o2", "skjult", "Skjult Klub", "u1"), status: "suspended" }
      ]
    });

  test("GET /api/public/organizations viser kun aktive, uden kontakt-email", async () => {
    const app = createTestApp({ authService: anonAuth(), users: [], orgRepo: seed() });
    const res = await app.request("/api/public/organizations");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.organizations).toHaveLength(1);
    expect(data.organizations[0].slug).toBe("klub");
    expect(data.organizations[0].contact_email).toBeUndefined();
  });

  test("GET /api/public/organizations/:slug — 200 for aktiv, 404 for suspenderet/ukendt", async () => {
    const app = createTestApp({ authService: anonAuth(), users: [], orgRepo: seed() });
    expect((await app.request("/api/public/organizations/klub")).status).toBe(200);
    expect((await app.request("/api/public/organizations/skjult")).status).toBe(404);
    expect((await app.request("/api/public/organizations/findes-ikke")).status).toBe(404);

    const ok = await (await app.request("/api/public/organizations/klub")).json();
    expect(ok.organization.name).toBe("Klub Glød");
    expect(Array.isArray(ok.events)).toBe(true);
  });
});

describe("SSR organizations", () => {
  test("GET /organizations returnerer HTML med arrangør-navn", async () => {
    const orgRepo = createOrgRepo({ orgs: [org("o1", "klub", "Klub Glød", "u1")] });
    const app = createTestApp({ authService: anonAuth(), users: [], orgRepo });
    const res = await app.request("/organizations");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const body = await res.text();
    expect(body).toContain("Klub Glød");
    expect(body).toContain("Arrangører");
  });

  test("GET /organizations/:slug — HTML for aktiv, 404 for suspenderet", async () => {
    const orgRepo = createOrgRepo({
      orgs: [
        org("o1", "klub", "Klub Glød", "u1"),
        { ...org("o2", "skjult", "Skjult", "u1"), status: "suspended" }
      ]
    });
    const app = createTestApp({ authService: anonAuth(), users: [], orgRepo });
    const ok = await app.request("/organizations/klub");
    expect(ok.status).toBe(200);
    expect(await ok.text()).toContain("Klub Glød");
    expect((await app.request("/organizations/skjult")).status).toBe(404);
  });
});

describe("Organization logo upload", () => {
  function logoForm() {
    const fd = new FormData();
    fd.append("file", new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "logo.png", { type: "image/png" }));
    return { method: "POST", body: fd };
  }

  test("owner kan uploade logo", async () => {
    const orgRepo = createOrgRepo({
      orgs: [org("org-1", "klub", "Klub", "o1")],
      members: [{ organization_id: "org-1", user_id: "o1", org_role: "owner", created_at: new Date() }]
    });
    const app = createTestApp({
      authService: auth({ id: "o1", email: "o1@x.dk", role: "organizer" }),
      users: [profile("o1", "o1@x.dk", "organizer")],
      orgRepo,
      uploadStore: stubUploadStore()
    });
    const res = await app.request("/api/organizations/org-1/logo", logoForm());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.organization.logo_path).toBe("organization/x/logo.png");
  });

  test("editor kan IKKE uploade logo", async () => {
    const orgRepo = createOrgRepo({
      orgs: [org("org-1", "klub", "Klub", "o1")],
      members: [{ organization_id: "org-1", user_id: "ed", org_role: "editor", created_at: new Date() }]
    });
    const app = createTestApp({
      authService: auth({ id: "ed", email: "ed@x.dk", role: "organizer" }),
      users: [profile("ed", "ed@x.dk", "organizer")],
      orgRepo,
      uploadStore: stubUploadStore()
    });
    const res = await app.request("/api/organizations/org-1/logo", logoForm());
    expect(res.status).toBe(403);
  });
});
