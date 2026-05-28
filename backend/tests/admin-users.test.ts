import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createApp } from "../src/app";
import type {
  AuthService,
  MembershipProfile,
  MembershipRepository
} from "../src/types";

// In-memory MembershipRepository stub. Vi gemmer kun de felter vi tester
// med — resten cast'es som any så vi ikke skal stubbe hele repo'et.
function createInMemoryMembership(initialUsers: MembershipProfile[]): MembershipRepository {
  const users = new Map<string, MembershipProfile>(initialUsers.map((u) => [u.user_id, u]));
  return {
    async getProfile(userId: string) {
      return users.get(userId) ?? null;
    },
    async setUserRole(userId: string, role: "admin" | "user") {
      const u = users.get(userId);
      if (!u) return null;
      const updated = { ...u, role };
      users.set(userId, updated);
      return updated;
    },
    async listAllUsersForAdmin(options) {
      const limit = options?.limit ?? 50;
      const offset = options?.offset ?? 0;
      const all = [...users.values()];
      return {
        items: all.slice(offset, offset + limit),
        total: all.length
      };
    }
  } as unknown as MembershipRepository;
}

function profile(
  id: string,
  email: string,
  role: "admin" | "user" = "user"
): MembershipProfile {
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
  };
}

function adminAuth(userId = "admin-1", email = "admin@example.com"): AuthService {
  return {
    handler: async () => new Response("ok"),
    getSession: async () => ({
      user: { id: userId, email, role: "admin" },
      session: { id: "s1", userId, expiresAt: new Date() }
    }),
    ensureSuperAdmin: async () => undefined
  } as unknown as AuthService;
}

function userAuth(userId = "u1"): AuthService {
  return {
    handler: async () => new Response("ok"),
    getSession: async () => ({
      user: { id: userId, email: "user@example.com", role: "user" },
      session: { id: "s1", userId, expiresAt: new Date() }
    }),
    ensureSuperAdmin: async () => undefined
  } as unknown as AuthService;
}

function createTestApp(opts: {
  users: MembershipProfile[];
  authService: AuthService;
  superAdminEmail?: string;
}) {
  if (opts.superAdminEmail !== undefined) {
    process.env.SUPERADMIN_EMAIL = opts.superAdminEmail;
  } else {
    delete process.env.SUPERADMIN_EMAIL;
  }
  return createApp({
    leadRepository: {
      upsertWaitlistLead: async () => ({ status: "created_pending", shouldSendConfirm: true }),
      confirmLeadByToken: async () => ({ status: "invalid" }),
      emailExistsInLeads: async () => true,
      listAdminLeads: async () => ({ items: [], meta: { total: 0, confirmed: 0, pending: 0 } })
    },
    partnerRepository: {
      upsertPartnerInterest: async () => ({ status: "created_pending", shouldSendConfirm: true }),
      confirmPartnerByToken: async () => ({ status: "invalid" })
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
    membershipRepository: createInMemoryMembership(opts.users)
  });
}

describe("GET /api/admin/users", () => {
  afterEach(() => {
    delete process.env.SUPERADMIN_EMAIL;
  });

  test("returnerer 403 for ikke-admin", async () => {
    const app = createTestApp({
      users: [profile("u1", "user@example.com")],
      authService: userAuth()
    });

    const res = await app.request("/api/admin/users");
    expect(res.status).toBe(403);
  });

  test("returnerer brugerliste for admin", async () => {
    const app = createTestApp({
      users: [
        profile("admin-1", "admin@example.com", "admin"),
        profile("u1", "alice@example.com"),
        profile("u2", "bob@example.com")
      ],
      authService: adminAuth("admin-1", "admin@example.com")
    });

    const res = await app.request("/api/admin/users");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.items).toHaveLength(3);
    expect(json.meta.total).toBe(3);
    // Felt-shape: email, role, display_name, etc.
    const admin = json.items.find((u: { email: string }) => u.email === "admin@example.com");
    expect(admin.role).toBe("admin");
  });
});

describe("PATCH /api/admin/users/:id/role", () => {
  afterEach(() => {
    delete process.env.SUPERADMIN_EMAIL;
  });

  test("admin kan promote en bruger til admin", async () => {
    const app = createTestApp({
      users: [
        profile("admin-1", "admin@example.com", "admin"),
        profile("u1", "alice@example.com")
      ],
      authService: adminAuth("admin-1", "admin@example.com")
    });

    const res = await app.request("/api/admin/users/u1/role", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "admin" })
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.user.role).toBe("admin");
  });

  test("admin kan demote en admin tilbage til user", async () => {
    const app = createTestApp({
      users: [
        profile("admin-1", "admin@example.com", "admin"),
        profile("admin-2", "other-admin@example.com", "admin")
      ],
      authService: adminAuth("admin-1", "admin@example.com")
    });

    const res = await app.request("/api/admin/users/admin-2/role", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "user" })
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.user.role).toBe("user");
  });

  test("kan IKKE fjerne egen admin-rolle (anti-lockout)", async () => {
    const app = createTestApp({
      users: [profile("admin-1", "admin@example.com", "admin")],
      authService: adminAuth("admin-1", "admin@example.com")
    });

    const res = await app.request("/api/admin/users/admin-1/role", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "user" })
    });
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.code).toBe("CANNOT_DEMOTE_SELF");
  });

  test("kan IKKE demote superadmin", async () => {
    const app = createTestApp({
      users: [
        profile("super-1", "super@findgloed.dk", "admin"),
        profile("admin-2", "other-admin@example.com", "admin")
      ],
      authService: adminAuth("admin-2", "other-admin@example.com"),
      superAdminEmail: "super@findgloed.dk"
    });

    const res = await app.request("/api/admin/users/super-1/role", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "user" })
    });
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.code).toBe("CANNOT_DEMOTE_SUPERADMIN");
  });

  test("afviser ugyldig role", async () => {
    const app = createTestApp({
      users: [profile("admin-1", "admin@example.com", "admin")],
      authService: adminAuth("admin-1", "admin@example.com")
    });

    const res = await app.request("/api/admin/users/admin-1/role", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "superuser" })
    });
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.code).toBe("INVALID_ROLE");
  });

  test("returnerer 404 hvis target ikke findes", async () => {
    const app = createTestApp({
      users: [profile("admin-1", "admin@example.com", "admin")],
      authService: adminAuth("admin-1", "admin@example.com")
    });

    const res = await app.request("/api/admin/users/nonexistent/role", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "admin" })
    });
    expect(res.status).toBe(404);
  });

  test("afviser ikke-admin med 403", async () => {
    const app = createTestApp({
      users: [
        profile("u1", "user@example.com"),
        profile("u2", "other@example.com")
      ],
      authService: userAuth("u1")
    });

    const res = await app.request("/api/admin/users/u2/role", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "admin" })
    });
    expect(res.status).toBe(403);
  });
});
