import { serve } from "bun";
import { createClient } from "redis";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { createApp } from "./app";
import { MeilisearchArticleSearch } from "./article-search";
import { createAuthService, parseAdminEmails } from "./auth";
import { normalizeEmail } from "./validators";
import { readConfig } from "./config";
import { createPool, PostgresLeadRepository } from "./db";
import { ResendEmailService } from "./email";
import { PostgresAppSettingRepository } from "./app-settings";
import { PostgresEventRepository } from "./events";
import { PostgresOrganizationRepository } from "./organization";
import { PostgresMembershipRepository } from "./membership";
import { PostgresMessagingRepository } from "./messaging";
import { RedisRateLimiter } from "./rate-limit";
import { PostgresSubscriptionEventLog, PostgresSubscriptionRepository } from "./subscriptions";
import { createLocalUploadStore } from "./uploads";
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
        confirmWindowSeconds: config.rateLimitConfirmWindowSeconds,
        loginMax: config.rateLimitLoginMax,
        loginWindowSeconds: config.rateLimitLoginWindowSeconds,
        signupMax: config.rateLimitSignupMax,
        signupWindowSeconds: config.rateLimitSignupWindowSeconds,
        messageMax: config.rateLimitMessageMax,
        messageWindowSeconds: config.rateLimitMessageWindowSeconds,
        interestMax: config.rateLimitInterestMax,
        interestWindowSeconds: config.rateLimitInterestWindowSeconds,
        uploadMax: config.rateLimitUploadMax,
        uploadWindowSeconds: config.rateLimitUploadWindowSeconds,
        searchMax: config.rateLimitSearchMax,
        searchWindowSeconds: config.rateLimitSearchWindowSeconds
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
    adminEmails,
    isProduction: config.isProduction
  });

  if (config.superAdminEmail && config.superAdminPassword) {
    await authService.ensureSuperAdmin(config.superAdminEmail, config.superAdminPassword);
  }

  const eventRepository = new PostgresEventRepository(pool);
  const organizationRepository = new PostgresOrganizationRepository(pool);
  const messagingRepository = new PostgresMessagingRepository(pool);
  const subscriptionRepository = new PostgresSubscriptionRepository(pool);
  const uploadsRoot = process.env.UPLOADS_ROOT ?? join(process.cwd(), "uploads");
  const uploadStore = createLocalUploadStore(uploadsRoot);
  // membership-repoet får upload-store så hardDelete kan slette fysiske
  // filer ved konto-anonymisering (issue A10).
  const membershipRepository = new PostgresMembershipRepository(pool, uploadStore);
  // Issue A2: Wire match-checkeren ind så getPublicProfile kan returnere
  // relation="match" og photo-endpoint kan releasere match-visibility-billeder
  // ved gensidig interesse. messagingRepository implementerer MatchChecker
  // via hasMutualInterest. Cirkulær DI undgået ved sen-binding.
  membershipRepository.setMatchChecker(messagingRepository);
  const meiliSearchKey = config.meiliSearchKeyFile
    ? readFileSync(config.meiliSearchKeyFile, "utf8").trim()
    : config.meiliSearchKey;
  const articleSearchService = meiliSearchKey
    ? new MeilisearchArticleSearch({
        host: config.meiliHost,
        apiKey: meiliSearchKey,
        indexUid: config.meiliArticleIndex
      })
    : undefined;

  const app = createApp({
    leadRepository: repository,
    partnerRepository: repository,
    emailService: new ResendEmailService(
      config.resendApiKey,
      config.resendFromEmail,
      config.supportEmail,
      config.dataControllerName,
      config.dataControllerEmail
    ),
    rateLimiter,
    corsOrigins: config.corsOrigins,
    appUrl: config.appUrl,
    apiUrl: config.apiUrl,
    waitlistConfirmPath: config.waitlistConfirmPath,
    partnerConfirmPath: config.partnerConfirmPath,
    confirmationTokenTtlHours: config.waitlistTokenTtlHours,
    resendCooldownMinutes: config.waitlistResendCooldownMinutes,
    rateLimitEnabled: config.rateLimitEnabled,
    rateLimitFailOpen: config.rateLimitFailOpen,
    trustProxy: config.trustProxy,
    enableHsts: config.enableHsts,
    hstsMaxAgeSeconds: config.hstsMaxAgeSeconds,
    authService,
    membershipRepository,
    uploadStore,
    eventRepository,
    organizationRepository,
    messagingRepository,
    subscriptionRepository,
    tokenHashSecret: config.betterAuthSecret,
    stripeWebhookSecret: config.stripeWebhookSecret,
    subscriptionEventLog: new PostgresSubscriptionEventLog(pool),
    appSettings: new PostgresAppSettingRepository(pool),
    articleSearchService
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
