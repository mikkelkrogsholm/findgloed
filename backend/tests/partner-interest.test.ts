import { describe, expect, test } from "bun:test";
import { createApp } from "../src/app";
import type { PartnerConfirmResult, PartnerInterestRepository, RateLimiter } from "../src/types";

function createRepository(overrides?: {
  upsertResult?: { status: "created_pending" | "pending_resent" | "pending_cooldown" | "already_confirmed"; shouldSendConfirm: boolean };
  confirmResult?: PartnerConfirmResult;
}) {
  const repository: PartnerInterestRepository = {
    upsertPartnerInterest: async () =>
      overrides?.upsertResult ?? {
        status: "created_pending",
        shouldSendConfirm: true
      },
    confirmPartnerByToken: async () => overrides?.confirmResult ?? { status: "invalid" }
  };

  return repository;
}

function createTestApp(options?: {
  rateLimiter?: RateLimiter;
  rateLimitEnabled?: boolean;
  repository?: PartnerInterestRepository;
  onConfirmEmail?: (email: string, confirmUrl: string) => Promise<void>;
  onReceivedEmail?: (email: string) => Promise<void>;
}) {
  return createApp({
    leadRepository: {
      upsertWaitlistLead: async () => ({ status: "created_pending", shouldSendConfirm: true }),
      confirmLeadByToken: async () => ({ status: "invalid" }),
      emailExistsInLeads: async () => true,
      listAdminLeads: async () => ({ items: [], meta: { total: 0, confirmed: 0, pending: 0 } })
    },
    partnerRepository: options?.repository ?? createRepository(),
    emailService: {
      sendWaitlistConfirm: async () => undefined,
      sendWaitlistWelcome: async () => undefined,
      sendPartnerInterestConfirm: options?.onConfirmEmail ?? (async () => undefined),
      sendPartnerInterestReceived: options?.onReceivedEmail ?? (async () => undefined)
    },
    rateLimiter: options?.rateLimiter,
    rateLimitEnabled: options?.rateLimitEnabled,
    corsOrigins: ["http://localhost:4563"],
    appUrl: "http://localhost:4563",
    waitlistConfirmPath: "/waitlist/confirm",
    partnerConfirmPath: "/partner/confirm"
  });
}

describe("POST /api/partner-interest", () => {
  test("requires terms/privacy consent", async () => {
    const app = createTestApp({ rateLimitEnabled: false });

    const response = await app.request("/api/partner-interest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "partner@example.com",
        name: "Pat",
        organization: "DKSA",
        role: "Forening/organisation",
        interests: ["Oprette events"],
        accept_terms_privacy: false
      })
    });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      ok: false,
      code: "CONSENT_REQUIRED",
      message: "Du skal acceptere handelsbetingelser og persondatapolitik"
    });
  });

  test("validates email format", async () => {
    const app = createTestApp({ rateLimitEnabled: false });

    const response = await app.request("/api/partner-interest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "ikke-en-email",
        name: "Pat",
        organization: "DKSA",
        role: "Forening/organisation",
        interests: ["Oprette events"],
        accept_terms_privacy: true
      })
    });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      ok: false,
      code: "INVALID_EMAIL",
      message: "Ugyldig email"
    });
  });

  test("sends partner confirmation email for pending lead", async () => {
    let confirmPayload: { email: string; confirmUrl: string } | null = null;

    const app = createTestApp({
      rateLimitEnabled: false,
      repository: createRepository({
        upsertResult: {
          status: "created_pending",
          shouldSendConfirm: true
        }
      }),
      onConfirmEmail: async (email, confirmUrl) => {
        confirmPayload = { email, confirmUrl };
      }
    });

    const response = await app.request("/api/partner-interest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "Partner@Example.com",
        name: "Pat",
        organization: "DKSA",
        role: "Forening/organisation",
        region: "Sønderjylland",
        interests: ["Oprette events", "Samarbejde om platformen"],
        accept_terms_privacy: true,
        marketing_opt_in: true
      })
    });

    expect(response.status).toBe(200);
    expect(confirmPayload).not.toBeNull();
    expect(confirmPayload?.email).toBe("partner@example.com");
    expect(confirmPayload?.confirmUrl.startsWith("http://localhost:4563/partner/confirm?token=")).toBe(true);
  });

  test("does not send confirmation email during cooldown", async () => {
    let emailSent = false;

    const app = createTestApp({
      rateLimitEnabled: false,
      repository: createRepository({
        upsertResult: {
          status: "pending_cooldown",
          shouldSendConfirm: false
        }
      }),
      onConfirmEmail: async () => {
        emailSent = true;
      }
    });

    const response = await app.request("/api/partner-interest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "partner@example.com",
        name: "Pat",
        organization: "DKSA",
        role: "Forening/organisation",
        interests: ["Oprette events"],
        accept_terms_privacy: true
      })
    });

    expect(response.status).toBe(200);
    expect(emailSent).toBe(false);
  });

  test("rate limits partner submit requests", async () => {
    const app = createTestApp({
      rateLimiter: {
        check: async () => ({ limited: true, retryAfterSeconds: 20 })
      }
    });

    const response = await app.request("/api/partner-interest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "partner@example.com",
        name: "Pat",
        organization: "DKSA",
        role: "Forening/organisation",
        interests: ["Oprette events"],
        accept_terms_privacy: true
      })
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("20");
  });
});

describe("GET /api/partner-interest/confirm", () => {
  test("sets no-store cache header", async () => {
    const app = createTestApp({ rateLimitEnabled: false });

    const response = await app.request("/api/partner-interest/confirm?token=missing");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  test("returns invalid response for unknown token", async () => {
    const app = createTestApp({
      rateLimitEnabled: false,
      repository: createRepository({ confirmResult: { status: "invalid" } })
    });

    const response = await app.request("/api/partner-interest/confirm?token=missing");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      status: "invalid",
      message: "Ugyldig bekræftelseskode."
    });
  });

  test("returns expired response", async () => {
    const app = createTestApp({
      rateLimitEnabled: false,
      repository: createRepository({ confirmResult: { status: "expired" } })
    });

    const response = await app.request("/api/partner-interest/confirm?token=expired");

    expect(response.status).toBe(410);
    expect(await response.json()).toEqual({
      ok: false,
      status: "expired",
      message: "Bekræftelseslinket er udløbet."
    });
  });

  test("returns already confirmed response", async () => {
    const app = createTestApp({
      rateLimitEnabled: false,
      repository: createRepository({ confirmResult: { status: "already_confirmed" } })
    });

    const response = await app.request("/api/partner-interest/confirm?token=existing");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      status: "already_confirmed",
      message: "Din henvendelse er allerede bekræftet."
    });
  });

  test("returns confirmed response and sends receipt email", async () => {
    let receivedEmail: string | null = null;

    const app = createTestApp({
      rateLimitEnabled: false,
      repository: createRepository({ confirmResult: { status: "confirmed", email: "partner@example.com" } }),
      onReceivedEmail: async (email) => {
        receivedEmail = email;
      }
    });

    const response = await app.request("/api/partner-interest/confirm?token=valid");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      status: "confirmed",
      message: "Din henvendelse er bekræftet. Vi vender tilbage."
    });
    expect(receivedEmail).toBe("partner@example.com");
  });

  test("rate limits partner confirm requests", async () => {
    const app = createTestApp({
      rateLimiter: {
        check: async () => ({ limited: true, retryAfterSeconds: 15 })
      }
    });

    const response = await app.request("/api/partner-interest/confirm?token=abc");

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("15");
  });
});
