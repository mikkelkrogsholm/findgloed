import { describe, expect, test } from "bun:test";
import { createApp } from "../src/app";

function createHealthApp(options?: { enableHsts?: boolean; trustProxy?: boolean }) {
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
    rateLimitEnabled: false,
    corsOrigins: ["http://localhost:4563"],
    appUrl: "http://localhost:4563",
    waitlistConfirmPath: "/waitlist/confirm",
    enableHsts: options?.enableHsts,
    trustProxy: options?.trustProxy
  });
}

describe("GET /api/health", () => {
  test("returns 200 with ok payload", async () => {
    const app = createHealthApp();
    const response = await app.request("/api/health");
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json).toEqual({ ok: true, service: "findgloed-api" });
  });

  test("returns security headers", async () => {
    const app = createHealthApp();
    const response = await app.request("/api/health");

    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("permissions-policy")).toBe("camera=(), microphone=(), geolocation=()");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");
  });

  test("adds HSTS when HTTPS is forwarded and enabled", async () => {
    const app = createHealthApp({ enableHsts: true, trustProxy: true });
    const response = await app.request("http://localhost/api/health", {
      headers: { "x-forwarded-proto": "https" }
    });

    expect(response.headers.get("strict-transport-security")).toContain("max-age=");
  });
});
