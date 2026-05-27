import { describe, expect, test } from "bun:test";
import { createApp } from "../src/app";
import { APP_SETTING_KEYS, type AppSettingRepository } from "../src/app-settings";
import type { AuthService } from "../src/types";

// In-memory implementation af AppSettingRepository så vi kan teste invite-code
// flowet uden at have en rigtig database. Vi tester KUN den public-facing
// API-adfærd; PostgresAppSettingRepository selv er trivial CRUD og dækkes
// implicit af integration via prod-deploy.
function createInMemorySettings(initial: Record<string, unknown> = {}): AppSettingRepository {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    async get<T = unknown>(key: string): Promise<T | null> {
      return (store.has(key) ? (store.get(key) as T) : null);
    },
    async set<T = unknown>(key: string, value: T): Promise<void> {
      store.set(key, value);
    },
    async listAll() {
      return [...store.entries()].map(([key, value]) => ({
        key,
        value,
        updated_at: new Date(),
        updated_by: null
      }));
    }
  };
}

// auth-handler stub der kalder en spy så vi kan se hvilke requests der
// passerede gennem til Better Auth.
function createAuthStub(): { service: AuthService; calls: { url: string; body: string }[] } {
  const calls: { url: string; body: string }[] = [];
  const service: AuthService = {
    handler: async (req) => {
      const body = await req.clone().text();
      calls.push({ url: req.url, body });
      return new Response(JSON.stringify({ user: { id: "u1" }, token: "t1" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    },
    getSession: async () => null,
    ensureSuperAdmin: async () => undefined
  } as unknown as AuthService;
  return { service, calls };
}

function createTestApp(
  settings: AppSettingRepository | undefined,
  authService?: AuthService
) {
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
    authService,
    appSettings: settings
  });
}

describe("GET /api/auth/signup-requirements", () => {
  test("returnerer false når invite-code er slået fra", async () => {
    const settings = createInMemorySettings({
      [APP_SETTING_KEYS.signupRequireInviteCode]: false
    });
    const app = createTestApp(settings);

    const res = await app.request("/api/auth/signup-requirements");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, requires_invite_code: false });
  });

  test("returnerer true når invite-code er slået til", async () => {
    const settings = createInMemorySettings({
      [APP_SETTING_KEYS.signupRequireInviteCode]: true,
      [APP_SETTING_KEYS.signupInviteCode]: "hemmelig"
    });
    const app = createTestApp(settings);

    const res = await app.request("/api/auth/signup-requirements");
    const json = await res.json();
    expect(json.requires_invite_code).toBe(true);
  });

  test("lækker ALDRIG selve invite-koden", async () => {
    const settings = createInMemorySettings({
      [APP_SETTING_KEYS.signupRequireInviteCode]: true,
      [APP_SETTING_KEYS.signupInviteCode]: "super-hemmelig-kode-123"
    });
    const app = createTestApp(settings);

    const res = await app.request("/api/auth/signup-requirements");
    const body = await res.text();
    expect(body).not.toContain("super-hemmelig-kode-123");
  });

  test("returnerer false hvis appSettings ikke er konfigureret", async () => {
    const app = createTestApp(undefined);

    const res = await app.request("/api/auth/signup-requirements");
    const json = await res.json();
    expect(json.requires_invite_code).toBe(false);
  });
});

describe("POST /api/auth/sign-up/email — invite-code gate", () => {
  test("tillader signup uden invite_code når feature er slået fra", async () => {
    const settings = createInMemorySettings({
      [APP_SETTING_KEYS.signupRequireInviteCode]: false
    });
    const { service: authService, calls } = createAuthStub();
    const app = createTestApp(settings, authService);

    const res = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "ny@example.com", password: "12345678", name: "Ny" })
    });
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
  });

  test("afviser signup uden invite_code når feature er slået til", async () => {
    const settings = createInMemorySettings({
      [APP_SETTING_KEYS.signupRequireInviteCode]: true,
      [APP_SETTING_KEYS.signupInviteCode]: "abc123"
    });
    const { service: authService, calls } = createAuthStub();
    const app = createTestApp(settings, authService);

    const res = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "ny@example.com", password: "12345678", name: "Ny" })
    });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.code).toBe("INVITE_CODE_REQUIRED");
    expect(calls).toHaveLength(0); // Better Auth blev aldrig kaldt
  });

  test("afviser signup med forkert invite_code", async () => {
    const settings = createInMemorySettings({
      [APP_SETTING_KEYS.signupRequireInviteCode]: true,
      [APP_SETTING_KEYS.signupInviteCode]: "abc123"
    });
    const { service: authService, calls } = createAuthStub();
    const app = createTestApp(settings, authService);

    const res = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "ny@example.com",
        password: "12345678",
        name: "Ny",
        invite_code: "forkert"
      })
    });
    expect(res.status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  test("tillader signup med korrekt invite_code", async () => {
    const settings = createInMemorySettings({
      [APP_SETTING_KEYS.signupRequireInviteCode]: true,
      [APP_SETTING_KEYS.signupInviteCode]: "abc123"
    });
    const { service: authService, calls } = createAuthStub();
    const app = createTestApp(settings, authService);

    const res = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "ny@example.com",
        password: "12345678",
        name: "Ny",
        invite_code: "abc123"
      })
    });
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
  });

  test("tom string som invite_code afvises selv hvis konfigureret kode er tom", async () => {
    // Edge case: hvis admin slår require=true til men ikke har sat en kode,
    // skal vi afvise alt så vi ikke utilsigtet tillader fri signup med "".
    const settings = createInMemorySettings({
      [APP_SETTING_KEYS.signupRequireInviteCode]: true,
      [APP_SETTING_KEYS.signupInviteCode]: ""
    });
    const { service: authService, calls } = createAuthStub();
    const app = createTestApp(settings, authService);

    const res = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "ny@example.com",
        password: "12345678",
        name: "Ny",
        invite_code: ""
      })
    });
    expect(res.status).toBe(403);
    expect(calls).toHaveLength(0);
  });
});

describe("Admin: GET/PUT /api/admin/settings", () => {
  function adminAuth(): AuthService {
    return {
      handler: async () => new Response("ok"),
      getSession: async () => ({
        user: { id: "admin-1", email: "admin@example.com", role: "admin" },
        session: { id: "s1", userId: "admin-1", expiresAt: new Date() }
      }),
      ensureSuperAdmin: async () => undefined
    } as unknown as AuthService;
  }

  function userAuth(): AuthService {
    return {
      handler: async () => new Response("ok"),
      getSession: async () => ({
        user: { id: "user-1", email: "user@example.com", role: "user" },
        session: { id: "s1", userId: "user-1", expiresAt: new Date() }
      }),
      ensureSuperAdmin: async () => undefined
    } as unknown as AuthService;
  }

  test("GET /api/admin/settings returnerer alle settings for admin", async () => {
    const settings = createInMemorySettings({
      [APP_SETTING_KEYS.signupRequireInviteCode]: true,
      [APP_SETTING_KEYS.signupInviteCode]: "code"
    });
    const app = createTestApp(settings, adminAuth());

    const res = await app.request("/api/admin/settings");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.settings).toHaveLength(2);
  });

  test("GET /api/admin/settings afviser ikke-admin med 403", async () => {
    const settings = createInMemorySettings({});
    const app = createTestApp(settings, userAuth());

    const res = await app.request("/api/admin/settings");
    expect(res.status).toBe(403);
  });

  test("PUT /api/admin/settings/:key opdaterer setting og kan læses tilbage", async () => {
    const settings = createInMemorySettings({
      [APP_SETTING_KEYS.signupRequireInviteCode]: false,
      [APP_SETTING_KEYS.signupInviteCode]: ""
    });
    const app = createTestApp(settings, adminAuth());

    const res = await app.request(
      `/api/admin/settings/${encodeURIComponent(APP_SETTING_KEYS.signupRequireInviteCode)}`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value: true })
      }
    );
    expect(res.status).toBe(200);
    expect(await settings.get(APP_SETTING_KEYS.signupRequireInviteCode)).toBe(true);
  });

  test("PUT afviser ukendt key (allowlist)", async () => {
    const settings = createInMemorySettings({});
    const app = createTestApp(settings, adminAuth());

    const res = await app.request("/api/admin/settings/some.random.key", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: true })
    });
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.code).toBe("UNKNOWN_KEY");
  });

  test("PUT type-validerer require_invite_code som boolean", async () => {
    const settings = createInMemorySettings({});
    const app = createTestApp(settings, adminAuth());

    const res = await app.request(
      `/api/admin/settings/${APP_SETTING_KEYS.signupRequireInviteCode}`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value: "true" }) // string, ikke boolean
      }
    );
    expect(res.status).toBe(422);
  });
});
