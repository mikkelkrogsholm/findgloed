import { Hono } from "hono";
import { createHash, randomBytes } from "node:crypto";
import type {
  AuthService,
  EmailService,
  PartnerInterestOption,
  PartnerInterestRepository,
  PartnerRole,
  RateLimitScope,
  RateLimiter,
  WaitlistRepository
} from "./types";
import { isValidEmail, normalizeEmail } from "./validators";

type AppDeps = {
  leadRepository: WaitlistRepository;
  partnerRepository?: PartnerInterestRepository;
  emailService: EmailService;
  rateLimiter?: RateLimiter;
  corsOrigins?: string[];
  appUrl: string;
  waitlistConfirmPath: string;
  partnerConfirmPath?: string;
  confirmationTokenTtlHours?: number;
  resendCooldownMinutes?: number;
  rateLimitEnabled?: boolean;
  rateLimitFailOpen?: boolean;
  trustProxy?: boolean;
  enableHsts?: boolean;
  hstsMaxAgeSeconds?: number;
  authService?: AuthService;
};

const DEFAULT_TOKEN_TTL_HOURS = 72;
const DEFAULT_RESEND_COOLDOWN_MINUTES = 15;
const DEFAULT_RATE_LIMIT_FAIL_OPEN = false;
const DEFAULT_HSTS_MAX_AGE_SECONDS = 31_536_000;
const CORS_METHODS = "GET,POST,OPTIONS";
const CORS_HEADERS = "Content-Type";
const PARTNER_ROLES: PartnerRole[] = [
  "Forening/organisation",
  "Eventarrangør",
  "Fagperson/behandler",
  "Andet"
];
const PARTNER_INTERESTS: PartnerInterestOption[] = [
  "Oprette events",
  "Nå nye deltagere",
  "Styrke trygge rammer",
  "Samarbejde om platformen"
];

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

function asRequiredTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parsePartnerRole(value: unknown): PartnerRole | null {
  if (typeof value !== "string") {
    return null;
  }

  if (!PARTNER_ROLES.includes(value as PartnerRole)) {
    return null;
  }

  return value as PartnerRole;
}

function parsePartnerInterests(value: unknown): PartnerInterestOption[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const valid = value.filter((entry): entry is PartnerInterestOption =>
    typeof entry === "string" && PARTNER_INTERESTS.includes(entry as PartnerInterestOption)
  );

  if (valid.length === 0 || valid.length !== value.length) {
    return null;
  }

  return Array.from(new Set(valid));
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
  c.header("Access-Control-Allow-Credentials", "true");
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
  const partnerRepository =
    deps.partnerRepository ??
    ({
      upsertPartnerInterest: async () => ({
        status: "created_pending",
        shouldSendConfirm: true
      }),
      confirmPartnerByToken: async () => ({ status: "invalid" })
    } satisfies PartnerInterestRepository);
  const partnerConfirmPath = deps.partnerConfirmPath ?? "/partner/confirm";
  const authService = deps.authService;

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

  app.on(["GET", "POST"], "/api/auth/*", async (c) => {
    if (!authService) {
      return c.json(
        {
          ok: false,
          code: "AUTH_NOT_CONFIGURED",
          message: "Login er midlertidigt utilgængeligt."
        },
        503
      );
    }
    return authService.handler(c.req.raw);
  });

  app.use("/api/admin/*", async (c, next) => {
    if (!authService) {
      return c.json(
        {
          ok: false,
          code: "AUTH_NOT_CONFIGURED",
          message: "Login er midlertidigt utilgængeligt."
        },
        503
      );
    }

    const authSession = await authService.getSession(c.req.raw.headers);
    if (!authSession) {
      return c.json(
        {
          ok: false,
          code: "UNAUTHORIZED",
          message: "Log ind for at få adgang."
        },
        401
      );
    }

    c.set("authSession", authSession);
    await next();
  });

  app.get("/api/admin/leads", async (c) => {
    const authSession = c.get("authSession") as { user?: { role?: string | null } } | undefined;
    const userRole = authSession?.user?.role ?? "user";

    if (userRole !== "admin") {
      return c.json(
        {
          ok: false,
          code: "FORBIDDEN",
          message: "Du har ikke adgang."
        },
        403
      );
    }

    const result = await deps.leadRepository.listAdminLeads();

    return c.json({
      ok: true,
      items: result.items.map((item) => ({
        id: item.id,
        email: item.email,
        status: item.status,
        source: item.source,
        marketing_opt_in: item.marketing_opt_in,
        created_at: item.created_at.toISOString(),
        confirmed_at: item.confirmed_at ? item.confirmed_at.toISOString() : null,
        terms_accepted_at: item.terms_accepted_at ? item.terms_accepted_at.toISOString() : null,
        privacy_accepted_at: item.privacy_accepted_at ? item.privacy_accepted_at.toISOString() : null
      })),
      meta: result.meta
    });
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

  app.post("/api/partner-interest", async (c) => {
    const body = await c.req.json().catch(() => null);
    const email = normalizeEmail(typeof body?.email === "string" ? body.email : "");
    const name = asRequiredTrimmedString(body?.name);
    const organization = asRequiredTrimmedString(body?.organization);
    const role = parsePartnerRole(body?.role);
    const regionValue = asRequiredTrimmedString(body?.region);
    const interests = parsePartnerInterests(body?.interests);
    const acceptedTermsPrivacy = body?.accept_terms_privacy === true;
    const marketingOptIn = body?.marketing_opt_in === true;

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

    if (!name || !organization || !role || !interests) {
      return c.json(
        {
          ok: false,
          code: "INVALID_PARTNER_INPUT",
          message: "Udfyld venligst alle obligatoriske felter."
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

    const partnerRateLimitResponse = await enforceRateLimit(c, "partner_interest", email);
    if (partnerRateLimitResponse) {
      return partnerRateLimitResponse;
    }

    const acceptedAt = new Date();
    const confirmationToken = createConfirmationToken();
    const confirmationTokenHash = hashToken(confirmationToken);
    const confirmationTokenExpiresAt = new Date(
      acceptedAt.getTime() + confirmationTokenTtlHours * 60 * 60 * 1000
    );

    const result = await partnerRepository.upsertPartnerInterest({
      email,
      name,
      organization,
      role,
      region: regionValue,
      interests,
      source: "vision_modal",
      acceptedAt,
      marketingOptIn,
      confirmationTokenHash,
      confirmationTokenExpiresAt,
      resendCooldownMinutes
    });

    if (result.shouldSendConfirm && deps.emailService.sendPartnerInterestConfirm) {
      const confirmUrl = buildWaitlistConfirmUrl(deps.appUrl, partnerConfirmPath, confirmationToken);
      deps.emailService.sendPartnerInterestConfirm(email, confirmUrl).catch(() => {
        console.error("Failed to send partner confirmation email");
      });
    }

    return c.json(
      {
        ok: true,
        message: "Tjek din e-mail for at bekræfte din henvendelse."
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

  app.get("/api/partner-interest/confirm", async (c) => {
    c.header("Cache-Control", "no-store");

    const confirmRateLimitResponse = await enforceRateLimit(c, "partner_confirm");
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

    const confirmation = await partnerRepository.confirmPartnerByToken(hashToken(token), new Date());

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
          message: "Din henvendelse er allerede bekræftet."
        },
        200
      );
    }

    if (deps.emailService.sendPartnerInterestReceived) {
      deps.emailService.sendPartnerInterestReceived(confirmation.email).catch(() => {
        console.error("Failed to send partner receipt email");
      });
    }

    return c.json(
      {
        ok: true,
        status: "confirmed",
        message: "Din henvendelse er bekræftet. Vi vender tilbage."
      },
      200
    );
  });

  return app;
}
