import { describe, expect, test } from "bun:test";
import { createApp } from "../src/app";
import { parseAdminEmails, resolveUserRole } from "../src/auth";
import type { AuthService } from "../src/types";

function createAppWithAuth(authService: AuthService | undefined) {
  return createApp({
    leadRepository: {
      upsertWaitlistLead: async () => ({ status: "created_pending", shouldSendConfirm: true }),
      confirmLeadByToken: async () => ({ status: "invalid" }),
      emailExistsInLeads: async () => true,
      listAdminLeads: async () => ({
        items: [
          {
            id: "lead-1",
            email: "lead@example.com",
            status: "confirmed",
            source: "landing",
            marketing_opt_in: true,
            created_at: new Date("2026-02-20T10:00:00.000Z"),
            confirmed_at: new Date("2026-02-20T10:10:00.000Z"),
            terms_accepted_at: new Date("2026-02-20T10:00:00.000Z"),
            privacy_accepted_at: new Date("2026-02-20T10:00:00.000Z")
          }
        ],
        meta: {
          total: 1,
          confirmed: 1,
          pending: 0
        }
      })
    },
    partnerRepository: {
      upsertPartnerInterest: async () => ({ status: "created_pending", shouldSendConfirm: true }),
      confirmPartnerByToken: async () => ({ status: "invalid" })
    },
    emailService: {
      sendWaitlistConfirm: async () => undefined,
      sendWaitlistWelcome: async () => undefined,
      sendPartnerInterestConfirm: async () => undefined,
      sendPartnerInterestReceived: async () => undefined
    },
    rateLimitEnabled: false,
    corsOrigins: ["http://localhost:4563"],
    appUrl: "http://localhost:4563",
    waitlistConfirmPath: "/waitlist/confirm",
    authService
  });
}

describe("auth role helpers", () => {
  test("parses admin email list and resolves role", () => {
    const admins = parseAdminEmails("Admin@Findgloed.dk,owner@findgloed.dk");

    expect(resolveUserRole("admin@findgloed.dk", admins)).toBe("admin");
    expect(resolveUserRole("member@findgloed.dk", admins)).toBe("user");
  });
});

describe("GET /api/admin/leads", () => {
  test("returns 401 without session", async () => {
    const app = createAppWithAuth({
      handler: async () => new Response("ok", { status: 200 }),
      getSession: async () => null
    });

    const response = await app.request("/api/admin/leads");
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      ok: false,
      code: "UNAUTHORIZED",
      message: "Log ind for at få adgang."
    });
  });

  test("returns 403 for non-admin session", async () => {
    const app = createAppWithAuth({
      handler: async () => new Response("ok", { status: 200 }),
      getSession: async () => ({
        user: { id: "u1", email: "user@example.com", role: "user" },
        session: { id: "s1", userId: "u1", expiresAt: new Date() }
      })
    });

    const response = await app.request("/api/admin/leads");
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      code: "FORBIDDEN",
      message: "Du har ikke adgang."
    });
  });

  test("returns lead overview for admin", async () => {
    const app = createAppWithAuth({
      handler: async () => new Response("ok", { status: 200 }),
      getSession: async () => ({
        user: { id: "u1", email: "admin@example.com", role: "admin" },
        session: { id: "s1", userId: "u1", expiresAt: new Date() }
      })
    });

    const response = await app.request("/api/admin/leads");
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.meta).toEqual({ total: 1, confirmed: 1, pending: 0 });
    expect(json.items[0]).toMatchObject({
      id: "lead-1",
      email: "lead@example.com",
      status: "confirmed",
      source: "landing",
      marketing_opt_in: true
    });
    expect(json.items[0].created_at).toBe("2026-02-20T10:00:00.000Z");
  });
});
