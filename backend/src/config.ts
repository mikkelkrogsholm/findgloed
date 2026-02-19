export type Config = {
  runtimeEnv: string;
  isProduction: boolean;
  port: number;
  corsOrigins: string[];
  trustProxy: boolean;
  enableHsts: boolean;
  hstsMaxAgeSeconds: number;
  appUrl: string;
  waitlistConfirmPath: string;
  waitlistTokenTtlHours: number;
  waitlistResendCooldownMinutes: number;
  rateLimitEnabled: boolean;
  rateLimitFailOpen: boolean;
  rateLimitWaitlistMax: number;
  rateLimitWaitlistWindowSeconds: number;
  rateLimitConfirmMax: number;
  rateLimitConfirmWindowSeconds: number;
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

export function readConfig(): Config {
  const runtimeEnv = (process.env.NODE_ENV ?? process.env.APP_ENV ?? "development").toLowerCase();
  const isProduction = runtimeEnv === "production";
  const dbSsl = parseBoolean(process.env.DB_SSL, false);
  const parsedOrigins = parseOrigins();

  if (isProduction && parsedOrigins.length === 0) {
    throw new Error("CORS_ORIGINS must be configured in production");
  }

  const corsOrigins = parsedOrigins.length > 0 ? parsedOrigins : [process.env.APP_URL ?? "http://localhost:4563"];

  return {
    runtimeEnv,
    isProduction,
    port: Number(process.env.PORT ?? process.env.API_PORT ?? 3000),
    corsOrigins,
    trustProxy: parseBoolean(process.env.TRUST_PROXY, false),
    enableHsts: parseBoolean(process.env.ENABLE_HSTS, isProduction),
    hstsMaxAgeSeconds: parseInteger(process.env.HSTS_MAX_AGE_SECONDS, 31_536_000),
    appUrl: process.env.APP_URL ?? "http://localhost:4563",
    waitlistConfirmPath: process.env.WAITLIST_CONFIRM_PATH ?? "/waitlist/confirm",
    waitlistTokenTtlHours: parseInteger(process.env.WAITLIST_CONFIRM_TOKEN_TTL_HOURS, 72),
    waitlistResendCooldownMinutes: parseInteger(process.env.WAITLIST_RESEND_COOLDOWN_MINUTES, 15),
    rateLimitEnabled: parseBoolean(process.env.RATE_LIMIT_ENABLED, true),
    rateLimitFailOpen: parseBoolean(process.env.RATE_LIMIT_FAIL_OPEN, !isProduction),
    rateLimitWaitlistMax: parseInteger(process.env.RATE_LIMIT_WAITLIST_MAX, 5),
    rateLimitWaitlistWindowSeconds: parseInteger(process.env.RATE_LIMIT_WAITLIST_WINDOW_SECONDS, 60),
    rateLimitConfirmMax: parseInteger(process.env.RATE_LIMIT_CONFIRM_MAX, 10),
    rateLimitConfirmWindowSeconds: parseInteger(process.env.RATE_LIMIT_CONFIRM_WINDOW_SECONDS, 60),
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
    supportEmail: process.env.SUPPORT_EMAIL ?? ""
  };
}
