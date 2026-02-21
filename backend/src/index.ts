import { serve } from "bun";
import { createClient } from "redis";
import { createApp } from "./app";
import { createAuthService, parseAdminEmails } from "./auth";
import { normalizeEmail } from "./validators";
import { readConfig } from "./config";
import { createPool, PostgresLeadRepository } from "./db";
import { ResendEmailService } from "./email";
import { RedisRateLimiter } from "./rate-limit";
import type { RateLimiter } from "./types";

async function bootstrap(): Promise<void> {
  const config = readConfig();

  const pool = createPool({
    host: config.dbHost,
    port: config.dbPort,
    user: config.dbUser,
    password: config.dbPassword,
    database: config.dbName,
    ssl: config.dbSsl,
    sslRejectUnauthorized: config.dbSslRejectUnauthorized
  });

  let rateLimiter: RateLimiter | undefined;
  if (config.rateLimitEnabled) {
    const redisClient = createClient({ url: config.redisUrl });

    try {
      await redisClient.connect();
      rateLimiter = new RedisRateLimiter(redisClient, {
        waitlistMax: config.rateLimitWaitlistMax,
        waitlistWindowSeconds: config.rateLimitWaitlistWindowSeconds,
        confirmMax: config.rateLimitConfirmMax,
        confirmWindowSeconds: config.rateLimitConfirmWindowSeconds
      });
    } catch {
      if (config.rateLimitFailOpen) {
        console.error("Rate limiter unavailable at startup, continuing in fail-open mode");
      } else {
        throw new Error("Rate limiter unavailable and fail-open is disabled");
      }
    }
  }

  const repository = new PostgresLeadRepository(pool);

  const adminEmails = parseAdminEmails(config.adminEmails);
  if (config.superAdminEmail) {
    adminEmails.add(normalizeEmail(config.superAdminEmail));
  }

  const authService = createAuthService({
    pool,
    leadRepository: repository,
    appName: config.appName,
    baseURL: config.apiUrl,
    trustedOrigins: config.corsOrigins,
    secret: config.betterAuthSecret,
    adminEmails
  });

  if (config.superAdminEmail && config.superAdminPassword) {
    await authService.ensureSuperAdmin(config.superAdminEmail, config.superAdminPassword);
  }

  const app = createApp({
    leadRepository: repository,
    partnerRepository: repository,
    emailService: new ResendEmailService(
      config.resendApiKey,
      config.resendFromEmail,
      config.supportEmail
    ),
    rateLimiter,
    corsOrigins: config.corsOrigins,
    appUrl: config.appUrl,
    waitlistConfirmPath: config.waitlistConfirmPath,
    partnerConfirmPath: config.partnerConfirmPath,
    confirmationTokenTtlHours: config.waitlistTokenTtlHours,
    resendCooldownMinutes: config.waitlistResendCooldownMinutes,
    rateLimitEnabled: config.rateLimitEnabled,
    rateLimitFailOpen: config.rateLimitFailOpen,
    trustProxy: config.trustProxy,
    enableHsts: config.enableHsts,
    hstsMaxAgeSeconds: config.hstsMaxAgeSeconds,
    authService
  });

  const server = serve({
    fetch: app.fetch,
    port: config.port
  });

  const shutdown = async () => {
    server.stop(true);
    await Promise.allSettled([
      pool.end(),
      rateLimiter?.close ? rateLimiter.close() : Promise.resolve()
    ]);
  };

  process.on("SIGINT", () => {
    shutdown().finally(() => process.exit(0));
  });

  process.on("SIGTERM", () => {
    shutdown().finally(() => process.exit(0));
  });

  console.log(`API running on :${config.port}`);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
