import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { APP_SETTING_KEYS, type AppSettingRepository } from "./app-settings";
import {
  registerArticleSearchRoutes,
  type ArticleSearchService
} from "./article-search";
import { registerEventRoutes } from "./event-routes";
import type { EventRepository } from "./events";
import { registerOrganizationRoutes } from "./organization-routes";
import type { OrganizationRepository } from "./organization";
import { registerEventsSsr } from "./ssr-events";
import { registerOrganizationsSsr } from "./ssr-organizations";
import { registerSitemapRoutes } from "./ssr-sitemap";
import { registerMembershipRoutes } from "./membership-routes";
import { registerMessagingRoutes } from "./messaging-routes";
import type { MessagingRepository } from "./messaging";
import { registerSubscriptionRoutes } from "./subscription-routes";
import type { SubscriptionEventLog, SubscriptionRepository } from "./subscriptions";
import type {
  AuthService,
  EmailService,
  MembershipRepository,
  PartnerInterestOption,
  PartnerInterestRepository,
  PartnerRole,
  RateLimitScope,
  RateLimiter,
  WaitlistRepository
} from "./types";
import type { UploadStore } from "./uploads";
import { isValidEmail, normalizeEmail } from "./validators";

type AuthSessionData = {
  user: {
    id: string;
    email: string;
    role?: string | null;
  };
  session: {
    id: string;
    userId: string;
    expiresAt: Date | string;
  };
};

type AppVariables = {
  authSession: AuthSessionData;
};

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
  // Bruges af SSR til at bygge absolutte logo-URLs på tværs af domæner
  // (findgloed.dk-siden refererer billeder på api.findgloed.dk).
  apiUrl?: string;
  trustProxy?: boolean;
  enableHsts?: boolean;
  hstsMaxAgeSeconds?: number;
  authService?: AuthService;
  membershipRepository?: MembershipRepository;
  uploadStore?: UploadStore;
  eventRepository?: EventRepository;
  organizationRepository?: OrganizationRepository;
  messagingRepository?: MessagingRepository;
  subscriptionRepository?: SubscriptionRepository;
  // Issue B22: HMAC-secret bruges som nøgle ved hashing af confirmation-tokens
  // i DB. Uden secret bliver token-hash blot SHA-256(token), hvilket gør det
  // muligt for en database-leak at brute-force tokens. Med HMAC kan en
  // angriber ikke generere gyldige hashes selv om de har DB-dumpet.
  tokenHashSecret?: string;
  // Webhook-relateret (issue A18).
  stripeWebhookSecret?: string;
  subscriptionEventLog?: SubscriptionEventLog;
  // Invite-code-gate (admin-toggle). Hvis undefined er der ingen gate.
  appSettings?: AppSettingRepository;
  articleSearchService?: ArticleSearchService;
};

const DEFAULT_TOKEN_TTL_HOURS = 72;
const DEFAULT_RESEND_COOLDOWN_MINUTES = 15;
const DEFAULT_RATE_LIMIT_FAIL_OPEN = false;

// Timing-safe string-sammenligning. Beskytter mod timing-attacks hvor
// en angriber forsøger at brute-force en kode tegn for tegn ved at måle
// hvor lang tid det tager før sammenligningen returnerer false.
// Hvis længderne ikke matcher returnerer vi false uden at læse buffere
// (timingSafeEqual kræver samme længde), men selve buffer-comparison
// er konstant-tid.
function timingSafeEqualString(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) {
    // Vi udfører stadig en dummy-compare for at gøre length-discovery
    // marginalt sværere — selvom det er en svag forsvar.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}
const DEFAULT_HSTS_MAX_AGE_SECONDS = 31_536_000;
const CORS_METHODS = "GET,POST,PATCH,DELETE,OPTIONS";
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
  "Styrke rammer for samtykke og respekt",
  "Samarbejde om platformen"
];

// Issue B22: hashToken bruger HMAC-SHA-256 med betterAuthSecret som nøgle.
// Hvis secret IKKE er sat (fx i tests der ikke konfigurerer det), falder vi
// tilbage til ren SHA-256 — men logger en advarsel. I production tjekker
// readConfig at secret er sat.
//
// Bemærk: ved skift fra SHA-256 til HMAC bliver eksisterende confirmation_token_hash
// i DB ugyldige. Det er acceptabelt i dev, og i produktion havde ingen
// waitlist-tokens aktive sessions endnu.
function hashToken(value: string, secret?: string): string {
  if (secret && secret.length > 0) {
    return createHmac("sha256", secret).update(value).digest("hex");
  }
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

export function createApp(deps: AppDeps): Hono<{ Variables: AppVariables }> {
  const app = new Hono<{ Variables: AppVariables }>();
  const confirmationTokenTtlHours = deps.confirmationTokenTtlHours ?? DEFAULT_TOKEN_TTL_HOURS;
  const resendCooldownMinutes = deps.resendCooldownMinutes ?? DEFAULT_RESEND_COOLDOWN_MINUTES;
  const corsOrigins = deps.corsOrigins ?? ["http://localhost:39563"];
  const trustProxy = deps.trustProxy ?? false;
  const rateLimitEnabled = deps.rateLimitEnabled ?? true;
  const rateLimitFailOpen = deps.rateLimitFailOpen ?? DEFAULT_RATE_LIMIT_FAIL_OPEN;
  const enableHsts = deps.enableHsts ?? false;
  const hstsMaxAgeSeconds = deps.hstsMaxAgeSeconds ?? DEFAULT_HSTS_MAX_AGE_SECONDS;
  // Issue B22: HMAC-secret bruges til at hashe confirmation-tokens før de
  // sammenlignes med DB-værdier. Hvis secret ikke er sat (tests/legacy), falder
  // vi tilbage til ren SHA-256 i hashToken().
  const tokenHashSecret = deps.tokenHashSecret;
  const stripeWebhookSecret = deps.stripeWebhookSecret;
  const subscriptionEventLog = deps.subscriptionEventLog;
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

  // Issue A11: Body-limit for at undgå at en angriber kan sende store payloads
  // og DoS'e serveren. Vi splitter mellem to scopes:
  // - Multipart-routes (foto- + verifikations-upload): 32MB så et stort billede
  //   stadig kan uploades. uploads.saveImage validerer derudover pr. fil
  //   (8MB pr. billede), så 32MB er kun det ydre værn mod DoS.
  // - Stripe-webhooks: 1MB — events er små men signaturen valideres senere.
  // - Alle andre /api/*-routes: 64KB JSON. En typisk besked (4000 tegn) eller
  //   et bio-felt fylder langt mindre, så 64KB er rigeligt og giver
  //   beskyttelse mod tilfældig DoS.
  // Vi bruger én middleware der vælger den korrekte limit baseret på path,
  // så vi ikke får dobbelt-håndhævelse fra Hono's matcher.
  const MULTIPART_BODY_LIMIT_BYTES = 32 * 1024 * 1024;
  const WEBHOOK_BODY_LIMIT_BYTES = 1 * 1024 * 1024;
  const JSON_BODY_LIMIT_BYTES = 64 * 1024;
  const MULTIPART_PATHS = new Set(["/api/me/photos", "/api/me/verification"]);
  const WEBHOOK_PATHS = new Set(["/api/webhooks/stripe"]);
  const payloadTooLargeResponse = (c: { json: (body: unknown, status?: number) => Response }) =>
    c.json(
      {
        ok: false,
        code: "PAYLOAD_TOO_LARGE",
        message: "Indholdet er for stort."
      },
      413
    );
  const multipartLimit = bodyLimit({
    maxSize: MULTIPART_BODY_LIMIT_BYTES,
    onError: payloadTooLargeResponse
  });
  const webhookLimit = bodyLimit({
    maxSize: WEBHOOK_BODY_LIMIT_BYTES,
    onError: payloadTooLargeResponse
  });
  const jsonLimit = bodyLimit({
    maxSize: JSON_BODY_LIMIT_BYTES,
    onError: payloadTooLargeResponse
  });
  // Org-logo-upload har dynamisk :id i pathen, så den matches med regex
  // i stedet for det statiske MULTIPART_PATHS-sæt.
  const ORG_LOGO_PATH = /^\/api\/organizations\/[^/]+\/logo$/;
  app.use("/api/*", async (c, next) => {
    const path = new URL(c.req.url).pathname;
    if (MULTIPART_PATHS.has(path) || ORG_LOGO_PATH.test(path)) {
      return multipartLimit(c, next);
    }
    if (WEBHOOK_PATHS.has(path)) {
      return webhookLimit(c, next);
    }
    return jsonLimit(c, next);
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

  if (deps.articleSearchService) {
    app.use("/api/search/articles", async (c, next) => {
      const limited = await enforceRateLimit(c, "article_search");
      if (limited) {
        return limited;
      }
      return next();
    });
    registerArticleSearchRoutes(app, {
      searchService: deps.articleSearchService
    });
  }

  // Issue A18: Stripe webhook-endpoint. Vi forbereder routen FØR Stripe er
  // aktiveret, så vi har et stabilt URL Stripe kan ramme når nøglerne kommer.
  // I dev/uden STRIPE_WEBHOOK_SECRET returnerer endpointet 501 NOT_IMPLEMENTED.
  // I production validerer vi Stripe-Signature og logger event idempotent
  // via stripe_event_id-UNIQUE-index (migration 011).
  app.post("/api/webhooks/stripe", async (c) => {
    if (!stripeWebhookSecret || stripeWebhookSecret.length === 0) {
      return c.json(
        {
          ok: false,
          code: "NOT_IMPLEMENTED",
          message: "Stripe webhook er ikke konfigureret endnu."
        },
        501
      );
    }

    const signature = c.req.raw.headers.get("stripe-signature");
    if (!signature) {
      return c.json(
        { ok: false, code: "MISSING_SIGNATURE" },
        400
      );
    }

    // TODO ved Stripe-live: brug stripe.webhooks.constructEvent for at validere
    // signatur og parse event. Pseudokode:
    //
    //   import Stripe from "stripe";
    //   const stripe = new Stripe(stripeSecretKey);
    //   const rawBody = await c.req.text(); // ikke parsed JSON
    //   const event = stripe.webhooks.constructEvent(
    //     rawBody,
    //     signature,
    //     stripeWebhookSecret
    //   );
    //
    //   switch (event.type) {
    //     case "customer.subscription.created":
    //       // status='active' (eller 'trialing' hvis trial_end er sat)
    //       // gem stripe_subscription_id + current_period_start/end
    //       break;
    //     case "customer.subscription.updated":
    //       // opdatér felter: status, current_period_end, cancel_at_period_end
    //       break;
    //     case "customer.subscription.deleted":
    //       // status='cancelled', cancelled_at=NOW()
    //       break;
    //     case "invoice.payment_succeeded":
    //       // log subscription_event(event_type='payment_succeeded', amount_cents=invoice.amount_paid)
    //       break;
    //     case "invoice.payment_failed":
    //       // status='past_due'
    //       // log subscription_event(event_type='payment_failed', amount_cents=invoice.amount_due)
    //       break;
    //   }
    //
    // Bemærk: vi skal læse raw body BEFORE Hono parser den. Det kræver
    // formentlig at vi laver en sub-router der ikke bruger app.use-middleware
    // for at undgå body-konsumering før denne route.
    //
    // Indtil videre logger vi blot payloaden og returnerer 200, så Stripe
    // ikke retry'er. Idempotency via stripe_event_id-UNIQUE-index.
    let payload: Record<string, unknown> | null = null;
    try {
      payload = (await c.req.json()) as Record<string, unknown>;
    } catch {
      return c.json({ ok: false, code: "INVALID_BODY" }, 400);
    }

    const eventId = typeof payload?.id === "string" ? payload.id : null;
    const eventType = typeof payload?.type === "string" ? payload.type : "unknown";

    if (!eventId) {
      return c.json({ ok: false, code: "MISSING_EVENT_ID" }, 400);
    }

    if (subscriptionEventLog) {
      try {
        const inserted = await subscriptionEventLog.recordEvent({
          subscriptionId: null,
          stripeEventId: eventId,
          eventType: `stripe:${eventType}`,
          amountCents: null,
          metadata: { received_at: new Date().toISOString(), stub: true }
        });
        if (!inserted) {
          // Allerede logget — idempotent. Returnér 200 så Stripe ikke retry'er.
          return c.json({ ok: true, status: "duplicate" }, 200);
        }
      } catch (error) {
        console.error("Stripe webhook recordEvent failed:", error);
        // Fail-safe: returnér 200 så Stripe ikke retry'er. Bedre at miste
        // ét event end at få en retry-loop der spammer DB'en.
      }
    }

    console.log(`Stripe webhook received: ${eventType} (${eventId})`);
    return c.json({ ok: true, status: "received" }, 200);
  });

  // Public endpoint: signup-frontend tjekker dette ved load for at vise
  // invite-code-feltet kun når det faktisk kræves. Returnerer ALDRIG den
  // faktiske kode — kun et boolean-flag. Skal registreres FØR app.all(/api/auth/*)
  // ellers fanger catch-all-handleren denne route.
  app.get("/api/auth/signup-requirements", async (c) => {
    let requiresInviteCode = false;
    if (deps.appSettings) {
      const required = await deps.appSettings.get<boolean>(
        APP_SETTING_KEYS.signupRequireInviteCode
      );
      requiresInviteCode = required === true;
    }
    return c.json({ ok: true, requires_invite_code: requiresInviteCode });
  });

  app.all("/api/auth/*", async (c) => {
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

    // Issue B13: rate-limit sign-in/sign-up. Vi wrapper better-auth's handler
    // her fordi better-auth ikke giver os middleware-hooks pr. route. Vi
    // identificerer scope via path og slugger email ind hvis vi kan parse
    // request-body — ellers bruger vi kun fingerprint.
    const path = new URL(c.req.url).pathname;
    const isSignIn = path === "/api/auth/sign-in/email" && c.req.method === "POST";
    const isSignUp = path === "/api/auth/sign-up/email" && c.req.method === "POST";

    if (isSignIn || isSignUp) {
      // Læs body som tekst og forsøg JSON-parse. Vi må re-konstruere request
      // efter rate-limit-tjekket fordi body kun kan læses én gang.
      const bodyText = await c.req.raw.clone().text();
      let email: string | undefined;
      let inviteCode: string | undefined;
      try {
        const json = JSON.parse(bodyText) as { email?: unknown; invite_code?: unknown };
        if (typeof json.email === "string") {
          email = normalizeEmail(json.email);
        }
        if (typeof json.invite_code === "string") {
          inviteCode = json.invite_code;
        }
      } catch {
        // Ignorer parse-fejl — better-auth håndterer dem.
      }

      const scope: RateLimitScope = isSignIn ? "login_attempt" : "signup_attempt";
      // signup_attempt bucketes på fingerprint alene; login_attempt bucketes
      // også på email for at gøre password-spray sværere.
      const limitResponse = await enforceRateLimit(c, scope, isSignIn ? email : undefined);
      if (limitResponse) {
        return limitResponse;
      }

      // Invite-code-gate: hvis admin har slået SIGNUP_REQUIRE_INVITE_CODE
      // til, skal request indeholde invite_code der matcher den konfigurerede
      // kode. Sammenligning er timing-safe så timing-attacks ikke kan brute-
      // force kode-tegn for tegn.
      if (isSignUp && deps.appSettings) {
        const required = await deps.appSettings.get<boolean>(
          APP_SETTING_KEYS.signupRequireInviteCode
        );
        if (required === true) {
          const expected = (await deps.appSettings.get<string>(
            APP_SETTING_KEYS.signupInviteCode
          )) ?? "";
          if (!expected || !inviteCode || !timingSafeEqualString(inviteCode, expected)) {
            return c.json(
              {
                ok: false,
                code: "INVITE_CODE_REQUIRED",
                message: "Du skal bruge en gyldig invitationskode for at oprette en konto."
              },
              403
            );
          }
        }
      }
    }

    return authService.handler(c.req.raw);
  });

  // Issue A17: Globalt ghost-protection-værn.
  // Hvis en bruger er soft-deleted (deleted_at != NULL), må de IKKE
  // kunne kalde authenticated endpoints — selv ikke hvis deres
  // session-cookie stadig er gyldig. Vi tjekker profilen direkte i DB
  // og afviser med 401.
  //
  // Vi springer eksplicit `/api/auth/*` over så log-ud stadig virker
  // (vigtigt: en deleted bruger skal kunne logge ud så cookien ryddes).
  // Public endpoints (/api/health, /api/waitlist osv) påvirkes ikke
  // fordi middleware'en kun gør noget hvis der allerede er en gyldig
  // session.
  //
  // Paused_at alene blokeres IKKE her — brugeren skal kunne ophæve sin
  // egen pause via PATCH /api/me. Verifikations-status og pause håndteres
  // i de enkelte ruter (fx /api/members kræver 'verified' og ikke-paused).
  if (authService && deps.membershipRepository) {
    const membershipRepository = deps.membershipRepository;
    app.use("/api/*", async (c, next) => {
      const path = new URL(c.req.url).pathname;
      // Lad auth-handlers passere (login, logout, signup).
      if (path.startsWith("/api/auth")) {
        await next();
        return;
      }

      const session = await authService.getSession(c.req.raw.headers);
      if (!session) {
        // Ingen session = ikke vores problem her — lad de individuelle
        // ruters middleware afvise med 401 hvor relevant.
        await next();
        return;
      }

      const profile = await membershipRepository.getProfile(session.user.id);
      // getProfile returnerer null hvis deleted_at IS NOT NULL.
      if (!profile) {
        return c.json(
          {
            ok: false,
            code: "ACCOUNT_DELETED",
            message: "Kontoen findes ikke længere."
          },
          401
        );
      }

      await next();
    });
  }

  if (authService && deps.membershipRepository && deps.uploadStore) {
    registerMembershipRoutes(app, {
      authService,
      membershipRepository: deps.membershipRepository,
      uploadStore: deps.uploadStore,
      rateLimiter: deps.rateLimiter,
      rateLimitEnabled,
      rateLimitFailOpen
    });
  }

  if (authService && deps.eventRepository && deps.membershipRepository) {
    registerEventRoutes(app, {
      authService,
      eventRepository: deps.eventRepository,
      membershipRepository: deps.membershipRepository,
      organizationRepository: deps.organizationRepository
    });
  }

  if (
    authService &&
    deps.organizationRepository &&
    deps.eventRepository &&
    deps.membershipRepository
  ) {
    registerOrganizationRoutes(app, {
      authService,
      organizationRepository: deps.organizationRepository,
      eventRepository: deps.eventRepository,
      membershipRepository: deps.membershipRepository,
      uploadStore: deps.uploadStore
    });
  }

  // SEO/SSR: server-side rendered /events og /events/:slug + sitemap/robots.
  // Disse routes lever IKKE under /api/* — Caddy router /events* og
  // /sitemap.xml + /robots.txt direkte til denne container.
  if (deps.eventRepository) {
    registerEventsSsr(app, {
      eventRepository: deps.eventRepository,
      appUrl: deps.appUrl
    });
    registerSitemapRoutes(app, {
      eventRepository: deps.eventRepository,
      organizationRepository: deps.organizationRepository,
      appUrl: deps.appUrl
    });
  }

  if (deps.organizationRepository) {
    registerOrganizationsSsr(app, {
      organizationRepository: deps.organizationRepository,
      appUrl: deps.appUrl,
      apiUrl: deps.apiUrl ?? deps.appUrl
    });
  }

  if (
    authService &&
    deps.eventRepository &&
    deps.membershipRepository &&
    deps.messagingRepository
  ) {
    registerMessagingRoutes(app, {
      authService,
      eventRepository: deps.eventRepository,
      membershipRepository: deps.membershipRepository,
      messagingRepository: deps.messagingRepository,
      rateLimiter: deps.rateLimiter,
      rateLimitEnabled,
      rateLimitFailOpen,
      trustProxy,
      emailService: deps.emailService,
      appUrl: deps.appUrl
    });
  }

  if (authService && deps.membershipRepository && deps.subscriptionRepository) {
    registerSubscriptionRoutes(app, {
      authService,
      membershipRepository: deps.membershipRepository,
      subscriptionRepository: deps.subscriptionRepository
    });
  }

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

  // ---------- Admin: app-settings ----------
  // Generisk GET/PUT for de globale runtime-settings (migration 013).
  // Bruges p.t. til invite-code-gaten, men strukturen tillader fremtidige
  // settings uden nye endpoints.

  app.get("/api/admin/settings", async (c) => {
    const authSession = c.get("authSession") as { user?: { role?: string | null } } | undefined;
    if (authSession?.user?.role !== "admin") {
      return c.json({ ok: false, code: "FORBIDDEN", message: "Du har ikke adgang." }, 403);
    }
    if (!deps.appSettings) {
      return c.json({ ok: false, code: "NOT_AVAILABLE" }, 503);
    }
    const rows = await deps.appSettings.listAll();
    return c.json({
      ok: true,
      settings: rows.map((row) => ({
        key: row.key,
        value: row.value,
        updated_at: row.updated_at.toISOString(),
        updated_by: row.updated_by
      }))
    });
  });

  app.patch("/api/admin/settings/:key", async (c) => {
    const authSession = c.get("authSession") as
      | { user?: { id: string; role?: string | null } }
      | undefined;
    if (authSession?.user?.role !== "admin") {
      return c.json({ ok: false, code: "FORBIDDEN", message: "Du har ikke adgang." }, 403);
    }
    if (!deps.appSettings) {
      return c.json({ ok: false, code: "NOT_AVAILABLE" }, 503);
    }
    const key = c.req.param("key");
    // Allowlist — kun kendte nøgler kan skrives via admin-UI så vi ikke
    // åbner en generisk JSONB-injection-vej.
    const allowed: string[] = [
      APP_SETTING_KEYS.signupRequireInviteCode,
      APP_SETTING_KEYS.signupInviteCode
    ];
    if (!allowed.includes(key)) {
      return c.json({ ok: false, code: "UNKNOWN_KEY" }, 422);
    }

    const body = (await c.req.json().catch(() => null)) as { value?: unknown } | null;
    if (!body || body.value === undefined) {
      return c.json({ ok: false, code: "MISSING_VALUE" }, 422);
    }

    // Type-check pr. kendt nøgle.
    if (key === APP_SETTING_KEYS.signupRequireInviteCode && typeof body.value !== "boolean") {
      return c.json({ ok: false, code: "INVALID_VALUE", message: "boolean required" }, 422);
    }
    if (key === APP_SETTING_KEYS.signupInviteCode) {
      if (typeof body.value !== "string") {
        return c.json({ ok: false, code: "INVALID_VALUE", message: "string required" }, 422);
      }
      if (body.value.length > 200) {
        return c.json({ ok: false, code: "INVALID_VALUE", message: "max 200 chars" }, 422);
      }
    }

    await deps.appSettings.set(key, body.value, authSession?.user?.id ?? null);
    return c.json({ ok: true });
  });

  // ---------- Admin: brugere (promote/demote admin-role) ----------

  app.get("/api/admin/users", async (c) => {
    const authSession = c.get("authSession") as { user?: { role?: string | null } } | undefined;
    if (authSession?.user?.role !== "admin") {
      return c.json({ ok: false, code: "FORBIDDEN", message: "Du har ikke adgang." }, 403);
    }
    if (!deps.membershipRepository) {
      return c.json({ ok: false, code: "NOT_AVAILABLE" }, 503);
    }

    const url = new URL(c.req.url);
    const limit = Math.max(
      1,
      Math.min(200, Number(url.searchParams.get("limit")) || 50)
    );
    const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

    const result = await deps.membershipRepository.listAllUsersForAdmin({ limit, offset });
    return c.json({
      ok: true,
      items: result.items.map((u) => ({
        user_id: u.user_id,
        email: u.email,
        display_name: u.display_name,
        role: u.role ?? "user",
        verification_status: u.verification_status,
        onboarded_at: u.onboarded_at?.toISOString() ?? null,
        paused_at: u.paused_at?.toISOString() ?? null,
        created_at: u.created_at.toISOString()
      })),
      meta: { total: result.total, limit, offset, has_more: offset + result.items.length < result.total }
    });
  });

  app.patch("/api/admin/users/:id/role", async (c) => {
    const authSession = c.get("authSession") as
      | { user?: { id: string; email: string; role?: string | null } }
      | undefined;
    if (authSession?.user?.role !== "admin") {
      return c.json({ ok: false, code: "FORBIDDEN", message: "Du har ikke adgang." }, 403);
    }
    if (!deps.membershipRepository) {
      return c.json({ ok: false, code: "NOT_AVAILABLE" }, 503);
    }

    const targetId = c.req.param("id");
    const body = (await c.req.json().catch(() => null)) as { role?: unknown } | null;
    const newRole = body?.role;
    if (newRole !== "admin" && newRole !== "organizer" && newRole !== "user") {
      return c.json(
        {
          ok: false,
          code: "INVALID_ROLE",
          message: "role skal være 'admin', 'organizer' eller 'user'."
        },
        422
      );
    }

    // Anti-lockout: en admin må ikke kunne fjerne sin egen admin-rolle —
    // ellers kan vi ende uden nogen admins overhovedet hvis han laver fejl.
    if (targetId === authSession?.user?.id && newRole !== "admin") {
      return c.json(
        {
          ok: false,
          code: "CANNOT_DEMOTE_SELF",
          message: "Du kan ikke fjerne din egen admin-rolle. Bed en anden admin om at gøre det."
        },
        422
      );
    }

    // Beskyt superadmin: hvis target-bruger har samme email som SUPERADMIN_EMAIL
    // kan vedkommende ikke demotes. Sikrer at vi altid har én admin tilbage.
    const targetProfile = await deps.membershipRepository.getProfile(targetId);
    if (!targetProfile) {
      return c.json({ ok: false, code: "USER_NOT_FOUND" }, 404);
    }
    const superAdminEmail = (process.env.SUPERADMIN_EMAIL ?? "").trim().toLowerCase();
    if (
      superAdminEmail &&
      targetProfile.email.toLowerCase() === superAdminEmail &&
      newRole !== "admin"
    ) {
      return c.json(
        {
          ok: false,
          code: "CANNOT_DEMOTE_SUPERADMIN",
          message: "Superadminen kan ikke nedgraderes."
        },
        422
      );
    }

    const updated = await deps.membershipRepository.setUserRole(targetId, newRole);
    if (!updated) {
      return c.json({ ok: false, code: "USER_NOT_FOUND" }, 404);
    }

    // Audit-log: konsol-besked så vi kan trace hvem-promoverede-hvem.
    // I fremtiden kan dette flyttes til en dedikeret audit_log-tabel.
    console.log(
      `[ADMIN AUDIT] ${authSession.user.email} (${authSession.user.id}) ` +
        `set role of ${targetProfile.email} (${targetId}) to '${newRole}'`
    );

    return c.json({
      ok: true,
      user: {
        user_id: updated.user_id,
        email: updated.email,
        display_name: updated.display_name,
        role: updated.role ?? "user"
      }
    });
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
    const source = "landing";
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
    const confirmationTokenHash = hashToken(confirmationToken, tokenHashSecret);
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
    const confirmationTokenHash = hashToken(confirmationToken, tokenHashSecret);
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

    const confirmation = await deps.leadRepository.confirmLeadByToken(hashToken(token, tokenHashSecret), new Date());

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

    const confirmation = await partnerRepository.confirmPartnerByToken(hashToken(token, tokenHashSecret), new Date());

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
