import { serve } from "bun";
import { createClient } from "redis";
import { createApp } from "./app";
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

  const app = createApp({
    leadRepository: new PostgresLeadRepository(pool),
    emailService: new ResendEmailService(
      config.resendApiKey,
      config.resendFromEmail,
      config.supportEmail
    ),
    rateLimiter,
    corsOrigins: config.corsOrigins,
    appUrl: config.appUrl,
    waitlistConfirmPath: config.waitlistConfirmPath,
    confirmationTokenTtlHours: config.waitlistTokenTtlHours,
    resendCooldownMinutes: config.waitlistResendCooldownMinutes,
    rateLimitEnabled: config.rateLimitEnabled,
    rateLimitFailOpen: config.rateLimitFailOpen,
    trustProxy: config.trustProxy,
    enableHsts: config.enableHsts,
    hstsMaxAgeSeconds: config.hstsMaxAgeSeconds
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
