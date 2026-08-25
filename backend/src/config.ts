export type Config = {
  appName: string;
  runtimeEnv: string;
  isProduction: boolean;
  port: number;
  corsOrigins: string[];
  trustProxy: boolean;
  enableHsts: boolean;
  hstsMaxAgeSeconds: number;
  appUrl: string;
  apiUrl: string;
  waitlistConfirmPath: string;
  partnerConfirmPath: string;
  waitlistTokenTtlHours: number;
  waitlistResendCooldownMinutes: number;
  rateLimitEnabled: boolean;
  rateLimitFailOpen: boolean;
  rateLimitWaitlistMax: number;
  rateLimitWaitlistWindowSeconds: number;
  rateLimitConfirmMax: number;
  rateLimitConfirmWindowSeconds: number;
  // Issue B13: per-scope rate-limits for login/messaging/upload/etc.
  rateLimitLoginMax: number;
  rateLimitLoginWindowSeconds: number;
  rateLimitMessageMax: number;
  rateLimitMessageWindowSeconds: number;
  rateLimitInterestMax: number;
  rateLimitInterestWindowSeconds: number;
  rateLimitUploadMax: number;
  rateLimitUploadWindowSeconds: number;
  rateLimitSignupMax: number;
  rateLimitSignupWindowSeconds: number;
  rateLimitSearchMax: number;
  rateLimitSearchWindowSeconds: number;
  redisUrl: string;
  dbHost: string;
  dbPort: number;
  dbUser: string;
  dbPassword: string;
  dbName: string;
  dbSsl: boolean;
  dbSslRejectUnauthorized: boolean;
  resendApiKey: string;
  resendFromEmail: string;
  supportEmail: string;
  // Navngiven dataansvarlig — påkrævet under GDPR-konsensus (issue A19).
  // Bruges i email-signaturer og kan vises på privacy-page.
  dataControllerName: string;
  dataControllerEmail: string;
  betterAuthSecret: string;
  adminEmails: string;
  superAdminEmail: string;
  superAdminPassword: string;
  // Issue A18: bruges af /api/webhooks/stripe til at validere Stripe-Signature.
  // Hvis tom: webhook-endpointet returnerer 501 NOT_IMPLEMENTED.
  stripeWebhookSecret: string;
  meiliHost: string;
  meiliSearchKey: string;
  meiliSearchKeyFile: string;
  meiliArticleIndex: string;
};

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return value.trim().toLowerCase() === "true";
}

function parseInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid numeric environment variable value: ${value}`);
  }

  return Math.floor(parsed);
}

function parseOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS ?? process.env.CORS_ORIGIN ?? "";
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

// Issue B14: Production-CORS skal aldrig acceptere localhost/loopback eller
// wildcard. Hvis fx ".env" ikke er sat korrekt på serveren, og en udvikler
// glemmer at fjerne sin lokale origin, ville produktion ende med en åben
// dør. Vi validerer derfor strikt — kast hellere fejl ved boot end at
// servere requests fra ukendte origins.
export function validateProductionOrigins(origins: string[]): void {
  const blockedSubstrings = ["localhost", "127.0.0.1", "0.0.0.0"];
  for (const origin of origins) {
    if (origin === "*") {
      throw new Error(`CORS_ORIGINS må ikke indeholde wildcard "*" i production: ${origin}`);
    }
    const lower = origin.toLowerCase();
    for (const blocked of blockedSubstrings) {
      if (lower.includes(blocked)) {
        throw new Error(
          `CORS_ORIGINS må ikke indeholde "${blocked}" i production: ${origin}`
        );
      }
    }
  }
}

export function readConfig(): Config {
  const runtimeEnv = (process.env.NODE_ENV ?? process.env.APP_ENV ?? "development").toLowerCase();
  const isProduction = runtimeEnv === "production";
  const dbSsl = parseBoolean(process.env.DB_SSL, false);
  const parsedOrigins = parseOrigins();

  if (isProduction && parsedOrigins.length === 0) {
    throw new Error("CORS_ORIGINS must be configured in production");
  }

  if (isProduction) {
    validateProductionOrigins(parsedOrigins);
  }

  const corsOrigins = parsedOrigins.length > 0 ? parsedOrigins : [process.env.APP_URL ?? "http://localhost:39563"];
  const betterAuthSecret = process.env.BETTER_AUTH_SECRET ?? process.env.JWT_SECRET ?? "";

  if (isProduction && betterAuthSecret.length === 0) {
    throw new Error("BETTER_AUTH_SECRET must be configured in production");
  }

  return {
    appName: process.env.APP_NAME ?? "findgloed",
    runtimeEnv,
    isProduction,
    port: Number(process.env.PORT ?? process.env.API_PORT ?? 3000),
    corsOrigins,
    trustProxy: parseBoolean(process.env.TRUST_PROXY, false),
    enableHsts: parseBoolean(process.env.ENABLE_HSTS, isProduction),
    hstsMaxAgeSeconds: parseInteger(process.env.HSTS_MAX_AGE_SECONDS, 31_536_000),
    appUrl: process.env.APP_URL ?? "http://localhost:39563",
    apiUrl: process.env.API_URL ?? "http://localhost:39564",
    waitlistConfirmPath: process.env.WAITLIST_CONFIRM_PATH ?? "/waitlist/confirm",
    partnerConfirmPath: process.env.PARTNER_CONFIRM_PATH ?? "/partner/confirm",
    waitlistTokenTtlHours: parseInteger(process.env.WAITLIST_CONFIRM_TOKEN_TTL_HOURS, 72),
    waitlistResendCooldownMinutes: parseInteger(process.env.WAITLIST_RESEND_COOLDOWN_MINUTES, 15),
    rateLimitEnabled: parseBoolean(process.env.RATE_LIMIT_ENABLED, true),
    rateLimitFailOpen: parseBoolean(process.env.RATE_LIMIT_FAIL_OPEN, !isProduction),
    rateLimitWaitlistMax: parseInteger(process.env.RATE_LIMIT_WAITLIST_MAX, 5),
    rateLimitWaitlistWindowSeconds: parseInteger(process.env.RATE_LIMIT_WAITLIST_WINDOW_SECONDS, 60),
    rateLimitConfirmMax: parseInteger(process.env.RATE_LIMIT_CONFIRM_MAX, 10),
    rateLimitConfirmWindowSeconds: parseInteger(process.env.RATE_LIMIT_CONFIRM_WINDOW_SECONDS, 60),
    rateLimitLoginMax: parseInteger(process.env.RATE_LIMIT_LOGIN_MAX, 10),
    rateLimitLoginWindowSeconds: parseInteger(process.env.RATE_LIMIT_LOGIN_WINDOW_SECONDS, 60),
    rateLimitMessageMax: parseInteger(process.env.RATE_LIMIT_MESSAGE_MAX, 30),
    rateLimitMessageWindowSeconds: parseInteger(process.env.RATE_LIMIT_MESSAGE_WINDOW_SECONDS, 60),
    rateLimitInterestMax: parseInteger(process.env.RATE_LIMIT_INTEREST_MAX, 20),
    rateLimitInterestWindowSeconds: parseInteger(process.env.RATE_LIMIT_INTEREST_WINDOW_SECONDS, 60),
    rateLimitUploadMax: parseInteger(process.env.RATE_LIMIT_UPLOAD_MAX, 10),
    rateLimitUploadWindowSeconds: parseInteger(process.env.RATE_LIMIT_UPLOAD_WINDOW_SECONDS, 60),
    rateLimitSignupMax: parseInteger(process.env.RATE_LIMIT_SIGNUP_MAX, 5),
    rateLimitSignupWindowSeconds: parseInteger(process.env.RATE_LIMIT_SIGNUP_WINDOW_SECONDS, 3600),
    rateLimitSearchMax: parseInteger(process.env.RATE_LIMIT_SEARCH_MAX, 60),
    rateLimitSearchWindowSeconds: parseInteger(process.env.RATE_LIMIT_SEARCH_WINDOW_SECONDS, 60),
    redisUrl: process.env.REDIS_URL ?? "redis://redis:6379",
    dbHost: required("DB_HOST", "localhost"),
    dbPort: Number(process.env.DB_PORT ?? 5432),
    dbUser: required("POSTGRES_USER", "findgloed"),
    dbPassword: required("POSTGRES_PASSWORD", "findgloed"),
    dbName: required("POSTGRES_DB", "findgloed"),
    dbSsl,
    dbSslRejectUnauthorized: parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED, dbSsl),
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    resendFromEmail: process.env.RESEND_FROM_EMAIL ?? "",
    supportEmail: process.env.SUPPORT_EMAIL ?? "",
    dataControllerName: process.env.DATA_CONTROLLER_NAME ?? "Mikkel Freltoft Krogsholm",
    dataControllerEmail: process.env.DATA_CONTROLLER_EMAIL ?? "mikkel@findgloed.dk",
    betterAuthSecret,
    adminEmails: process.env.ADMIN_EMAILS ?? "",
    superAdminEmail: process.env.SUPERADMIN_EMAIL ?? "",
    superAdminPassword: process.env.SUPERADMIN_PASSWORD ?? "",
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    meiliHost: process.env.MEILI_HOST ?? "http://meilisearch:7700",
    meiliSearchKey: process.env.MEILI_SEARCH_KEY ?? "",
    meiliSearchKeyFile: process.env.MEILI_SEARCH_KEY_FILE ?? "",
    meiliArticleIndex: process.env.MEILI_ARTICLE_INDEX ?? "articles"
  };
}
