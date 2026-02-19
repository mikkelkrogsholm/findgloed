import { Hono } from "hono";
import { createHash, randomBytes } from "node:crypto";
import type { EmailService, RateLimitScope, RateLimiter, WaitlistRepository } from "./types";
import { isValidEmail, normalizeEmail } from "./validators";

type AppDeps = {
  leadRepository: WaitlistRepository;
  emailService: EmailService;
  rateLimiter?: RateLimiter;
  corsOrigins?: string[];
  appUrl: string;
  waitlistConfirmPath: string;
  confirmationTokenTtlHours?: number;
  resendCooldownMinutes?: number;
  rateLimitEnabled?: boolean;
  rateLimitFailOpen?: boolean;
  trustProxy?: boolean;
  enableHsts?: boolean;
  hstsMaxAgeSeconds?: number;
};

const DEFAULT_TOKEN_TTL_HOURS = 72;
const DEFAULT_RESEND_COOLDOWN_MINUTES = 15;
const DEFAULT_RATE_LIMIT_FAIL_OPEN = false;
const DEFAULT_HSTS_MAX_AGE_SECONDS = 31_536_000;
const CORS_METHODS = "GET,POST,OPTIONS";
const CORS_HEADERS = "Content-Type";

function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function createConfirmationToken(): string {
  return randomBytes(32).toString("base64url");
}

function buildWaitlistConfirmUrl(appUrl: string, confirmPath: string, token: string): string {
  const normalizedPath = confirmPath.startsWith("/") ? confirmPath : `/${confirmPath}`;
  const base = new URL(appUrl);
  const target = new URL(normalizedPath, base);
  target.searchParams.set("token", token);
  return target.toString();
}

export function resolveClientIp(headers: Headers, trustProxy: boolean): string {
  if (trustProxy) {
    const forwarded = headers.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0]?.trim() ?? "unknown";
    }

    const realIp = headers.get("x-real-ip");
    if (realIp) {
      return realIp.trim();
    }
  }

  return "direct";
}

function buildClientFingerprint(headers: Headers, trustProxy: boolean): string {
  const ip = resolveClientIp(headers, trustProxy);
  const userAgent = headers.get("user-agent") ?? "unknown";
  return hashToken(`${ip}|${userAgent}`).slice(0, 32);
}

function getForwardedProto(headers: Headers): string {
  const forwardedProto = headers.get("x-forwarded-proto");
  if (!forwardedProto) {
    return "";
  }

  return forwardedProto.split(",")[0]?.trim().toLowerCase() ?? "";
}

function requestIsHttps(url: string, headers: Headers, trustProxy: boolean): boolean {
  if (new URL(url).protocol === "https:") {
    return true;
  }

  return trustProxy && getForwardedProto(headers) === "https";
}

function applyCorsHeaders(c: { header: (name: string, value: string) => void }, origin: string): void {
  c.header("Access-Control-Allow-Origin", origin);
  c.header("Vary", "Origin");
  c.header("Access-Control-Allow-Methods", CORS_METHODS);
  c.header("Access-Control-Allow-Headers", CORS_HEADERS);
  c.header("Access-Control-Max-Age", "600");
}

function rateLimitedResponse(
  c: {
    header: (name: string, value: string) => void;
    json: (body: unknown, status?: number) => Response;
  },
  retryAfterSeconds: number
): Response {
  c.header("Retry-After", String(retryAfterSeconds));
  return c.json(
    {
      ok: false,
      code: "RATE_LIMITED",
      message: "For mange forsøg. Prøv igen om lidt."
    },
    429
  );
}

export function createApp(deps: AppDeps): Hono {
  const app = new Hono();
  const confirmationTokenTtlHours = deps.confirmationTokenTtlHours ?? DEFAULT_TOKEN_TTL_HOURS;
  const resendCooldownMinutes = deps.resendCooldownMinutes ?? DEFAULT_RESEND_COOLDOWN_MINUTES;
  const corsOrigins = deps.corsOrigins ?? ["http://localhost:4563"];
  const trustProxy = deps.trustProxy ?? false;
  const rateLimitEnabled = deps.rateLimitEnabled ?? true;
  const rateLimitFailOpen = deps.rateLimitFailOpen ?? DEFAULT_RATE_LIMIT_FAIL_OPEN;
  const enableHsts = deps.enableHsts ?? false;
  const hstsMaxAgeSeconds = deps.hstsMaxAgeSeconds ?? DEFAULT_HSTS_MAX_AGE_SECONDS;

  async function enforceRateLimit(
    c: {
      req: { raw: { headers: Headers } };
      header: (name: string, value: string) => void;
      json: (body: unknown, status?: number) => Response;
    },
    scope: RateLimitScope,
    email?: string
  ): Promise<Response | null> {
    if (!rateLimitEnabled || !deps.rateLimiter) {
      return null;
    }

    const fingerprint = buildClientFingerprint(c.req.raw.headers, trustProxy);

    try {
      const result = await deps.rateLimiter.check({
        scope,
        fingerprint,
        email
      });

      if (result.limited) {
        return rateLimitedResponse(c, result.retryAfterSeconds);
      }

      return null;
    } catch {
      console.error("Rate limiter check failed");
      if (rateLimitFailOpen) {
        return null;
      }

      return rateLimitedResponse(c, 60);
    }
  }

  app.use("*", async (c, next) => {
    await next();

    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    c.header("Referrer-Policy", "no-referrer");
    c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    c.header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");

    if (enableHsts && requestIsHttps(c.req.url, c.req.raw.headers, trustProxy)) {
      c.header("Strict-Transport-Security", `max-age=${hstsMaxAgeSeconds}; includeSubDomains`);
    }
  });

  app.use("/api/*", async (c, next) => {
    const origin = c.req.raw.headers.get("origin");
    if (!origin) {
      if (c.req.method === "OPTIONS") {
        return c.body(null, 204);
      }

      await next();
      return;
    }

    if (!corsOrigins.includes(origin)) {
      return c.json(
        {
          ok: false,
          code: "ORIGIN_NOT_ALLOWED",
          message: "Origin er ikke tilladt."
        },
        403
      );
    }

    applyCorsHeaders(c, origin);
    if (c.req.method === "OPTIONS") {
      return c.body(null, 204);
    }

    await next();
    applyCorsHeaders(c, origin);
  });

  app.get("/api/health", (c) => {
    return c.json({ ok: true, service: "findgloed-api" });
  });

  app.post("/api/waitlist", async (c) => {
    const body = await c.req.json().catch(() => null);
    const emailRaw = typeof body?.email === "string" ? body.email : "";
    const source = body?.source === "landing" ? "landing" : "landing";
    const acceptedTermsPrivacy = body?.accept_terms_privacy === true;
    const marketingOptIn = body?.marketing_opt_in === true;

    const email = normalizeEmail(emailRaw);

    if (!isValidEmail(email)) {
      return c.json(
        {
          ok: false,
          code: "INVALID_EMAIL",
          message: "Ugyldig email"
        },
        422
      );
    }

    if (!acceptedTermsPrivacy) {
      return c.json(
        {
          ok: false,
          code: "CONSENT_REQUIRED",
          message: "Du skal acceptere handelsbetingelser og persondatapolitik"
        },
        422
      );
    }

    const waitlistRateLimitResponse = await enforceRateLimit(c, "waitlist", email);
    if (waitlistRateLimitResponse) {
      return waitlistRateLimitResponse;
    }

    const acceptedAt = new Date();
    const confirmationToken = createConfirmationToken();
    const confirmationTokenHash = hashToken(confirmationToken);
    const confirmationTokenExpiresAt = new Date(
      acceptedAt.getTime() + confirmationTokenTtlHours * 60 * 60 * 1000
    );

    const result = await deps.leadRepository.upsertWaitlistLead({
      email,
      source,
      acceptedAt,
      marketingOptIn,
      confirmationTokenHash,
      confirmationTokenExpiresAt,
      resendCooldownMinutes
    });

    if (result.shouldSendConfirm) {
      const confirmUrl = buildWaitlistConfirmUrl(deps.appUrl, deps.waitlistConfirmPath, confirmationToken);
      deps.emailService.sendWaitlistConfirm(email, confirmUrl).catch(() => {
        console.error("Failed to send waitlist confirmation email");
      });
    }

    return c.json(
      {
        ok: true,
        message: "Tjek din email for at bekræfte din tilmelding."
      },
      200
    );
  });

  app.get("/api/waitlist/confirm", async (c) => {
    c.header("Cache-Control", "no-store");

    const confirmRateLimitResponse = await enforceRateLimit(c, "confirm");
    if (confirmRateLimitResponse) {
      return confirmRateLimitResponse;
    }

    const tokenRaw = c.req.query("token");
    if (!tokenRaw) {
      return c.json(
        {
          ok: false,
          status: "invalid",
          message: "Ugyldig bekræftelseskode."
        },
        400
      );
    }

    const token = tokenRaw.trim();
    if (token.length === 0) {
      return c.json(
        {
          ok: false,
          status: "invalid",
          message: "Ugyldig bekræftelseskode."
        },
        400
      );
    }

    const confirmation = await deps.leadRepository.confirmLeadByToken(hashToken(token), new Date());

    if (confirmation.status === "invalid") {
      return c.json(
        {
          ok: false,
          status: "invalid",
          message: "Ugyldig bekræftelseskode."
        },
        400
      );
    }

    if (confirmation.status === "expired") {
      return c.json(
        {
          ok: false,
          status: "expired",
          message: "Bekræftelseslinket er udløbet."
        },
        410
      );
    }

    if (confirmation.status === "already_confirmed") {
      return c.json(
        {
          ok: true,
          status: "already_confirmed",
          message: "Din tilmelding er allerede bekræftet."
        },
        200
      );
    }

    deps.emailService.sendWaitlistWelcome(confirmation.email).catch(() => {
      console.error("Failed to send waitlist welcome email");
    });

    return c.json(
      {
        ok: true,
        status: "confirmed",
        message: "Din tilmelding er bekræftet."
      },
      200
    );
  });

  return app;
}
