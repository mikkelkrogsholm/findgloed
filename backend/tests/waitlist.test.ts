import { describe, expect, test } from "bun:test";
import { createApp, resolveClientIp } from "../src/app";
import type { RateLimiter } from "../src/types";

function createTestApp(options?: {
  rateLimiter?: RateLimiter;
  rateLimitEnabled?: boolean;
  rateLimitFailOpen?: boolean;
  trustProxy?: boolean;
}) {
  return createApp({
    leadRepository: {
      upsertWaitlistLead: async () => ({ status: "created_pending", shouldSendConfirm: true }),
      confirmLeadByToken: async () => ({ status: "invalid" })
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
    rateLimiter: options?.rateLimiter,
    rateLimitEnabled: options?.rateLimitEnabled,
    rateLimitFailOpen: options?.rateLimitFailOpen,
    trustProxy: options?.trustProxy,
    corsOrigins: ["http://localhost:4563"],
    appUrl: "http://localhost:4563",
    waitlistConfirmPath: "/waitlist/confirm"
  });
}

describe("POST /api/waitlist", () => {
  test("requires terms/privacy consent", async () => {
    const app = createTestApp({ rateLimitEnabled: false });

    const response = await app.request("/api/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", accept_terms_privacy: false })
    });

    expect(response.status).toBe(422);
    const json = await response.json();
    expect(json).toEqual({
      ok: false,
      code: "CONSENT_REQUIRED",
      message: "Du skal acceptere handelsbetingelser og persondatapolitik"
    });
  });

  test("creates pending lead and sends confirmation email", async () => {
    let confirmPayload: { email: string; confirmUrl: string } | null = null;

    const app = createApp({
      leadRepository: {
        upsertWaitlistLead: async () => ({ status: "created_pending", shouldSendConfirm: true }),
        confirmLeadByToken: async () => ({ status: "invalid" })
      },
      partnerRepository: {
        upsertPartnerInterest: async () => ({ status: "created_pending", shouldSendConfirm: true }),
        confirmPartnerByToken: async () => ({ status: "invalid" })
      },
      emailService: {
        sendWaitlistConfirm: async (email, confirmUrl) => {
          confirmPayload = { email, confirmUrl };
        },
        sendWaitlistWelcome: async () => undefined,
        sendPartnerInterestConfirm: async () => undefined,
        sendPartnerInterestReceived: async () => undefined
      },
      rateLimitEnabled: false,
      corsOrigins: ["http://localhost:4563"],
      appUrl: "http://localhost:4563",
      waitlistConfirmPath: "/waitlist/confirm"
    });

    const response = await app.request("/api/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "Test@Example.com",
        source: "landing",
        accept_terms_privacy: true,
        marketing_opt_in: true
      })
    });

    expect(response.status).toBe(200);
    expect(confirmPayload).not.toBeNull();
    expect(confirmPayload?.email).toBe("test@example.com");
    expect(confirmPayload?.confirmUrl.startsWith("http://localhost:4563/waitlist/confirm?token=")).toBe(true);
  });

  test("returns 429 with retry-after header when waitlist is rate limited", async () => {
    let calls = 0;
    const app = createTestApp({
      rateLimiter: {
        check: async () => {
          calls += 1;
          return { limited: true, retryAfterSeconds: 42 };
        }
      }
    });

    const response = await app.request("/api/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        source: "landing",
        accept_terms_privacy: true
      })
    });

    expect(calls).toBe(1);
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("42");
    expect(await response.json()).toEqual({
      ok: false,
      code: "RATE_LIMITED",
      message: "For mange forsøg. Prøv igen om lidt."
    });
  });

  test("rate limiter fail-open allows request", async () => {
    const app = createTestApp({
      rateLimiter: {
        check: async () => {
          throw new Error("redis down");
        }
      },
      rateLimitFailOpen: true
    });

    const response = await app.request("/api/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        source: "landing",
        accept_terms_privacy: true
      })
    });

    expect(response.status).toBe(200);
  });

  test("rate limiter fail-closed rejects request", async () => {
    const app = createTestApp({
      rateLimiter: {
        check: async () => {
          throw new Error("redis down");
        }
      },
      rateLimitFailOpen: false
    });

    const response = await app.request("/api/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        source: "landing",
        accept_terms_privacy: true
      })
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
  });
});

describe("GET /api/waitlist/confirm", () => {
  test("returns 429 with retry-after header when confirm is rate limited", async () => {
    const app = createTestApp({
      rateLimiter: {
        check: async () => ({ limited: true, retryAfterSeconds: 15 })
      }
    });

    const response = await app.request("/api/waitlist/confirm?token=abc");
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("15");
  });

  test("sets no-store cache header", async () => {
    const app = createTestApp({
      rateLimitEnabled: false
    });

    const response = await app.request("/api/waitlist/confirm?token=missing");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});

describe("CORS and proxy utilities", () => {
  test("allows request with configured CORS origin", async () => {
    const app = createTestApp({ rateLimitEnabled: false });
    const response = await app.request("/api/health", {
      headers: { origin: "http://localhost:4563" }
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:4563");
  });

  test("rejects request with disallowed CORS origin", async () => {
    const app = createTestApp({ rateLimitEnabled: false });
    const response = await app.request("/api/health", {
      headers: { origin: "https://evil.example" }
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      code: "ORIGIN_NOT_ALLOWED",
      message: "Origin er ikke tilladt."
    });
  });

  test("resolveClientIp ignores spoofed forwarded headers when trustProxy is false", () => {
    const headers = new Headers({
      "x-forwarded-for": "1.2.3.4",
      "x-real-ip": "5.6.7.8"
    });

    expect(resolveClientIp(headers, false)).toBe("direct");
  });

  test("resolveClientIp uses forwarded header when trustProxy is true", () => {
    const headers = new Headers({
      "x-forwarded-for": "1.2.3.4, 9.9.9.9",
      "x-real-ip": "5.6.7.8"
    });

    expect(resolveClientIp(headers, true)).toBe("1.2.3.4");
  });
});
