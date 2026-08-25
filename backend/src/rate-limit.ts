import { createHash } from "node:crypto";
import type { RedisClientType } from "redis";
import type { RateLimitCheckInput, RateLimitCheckResult, RateLimitScope, RateLimiter } from "./types";

// Issue B13: Per-scope rate-limit konfiguration. Hver scope har sin egen
// max/window og besluttes ved konstruktion. Vi tilføjer scopes løbende
// (login_attempt, message_send, etc.) og lader rate-limiteren slå max op via
// SCOPE_CONFIG-mappet — så vi undgår en lang switch-kæde.
export type RateLimiterOptions = {
  waitlistMax: number;
  waitlistWindowSeconds: number;
  confirmMax: number;
  confirmWindowSeconds: number;
  loginMax: number;
  loginWindowSeconds: number;
  signupMax: number;
  signupWindowSeconds: number;
  messageMax: number;
  messageWindowSeconds: number;
  interestMax: number;
  interestWindowSeconds: number;
  uploadMax: number;
  uploadWindowSeconds: number;
  searchMax: number;
  searchWindowSeconds: number;
};

function hashShort(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function toWindowBucket(windowSeconds: number, nowMs: number): number {
  return Math.floor(nowMs / (windowSeconds * 1000));
}

function retryAfter(windowSeconds: number, nowMs: number): number {
  const remaining = windowSeconds - Math.floor((nowMs / 1000) % windowSeconds);
  return Math.max(1, remaining);
}

// Hvilke scopes der har email/userId-discriminator (dvs. egen bucket pr.
// konto eller bruger). De andre er kun fingerprint-baseret.
const SCOPES_WITH_EMAIL_BUCKET: ReadonlySet<RateLimitScope> = new Set<RateLimitScope>([
  "waitlist",
  "partner_interest",
  "login_attempt",
  "message_send",
  "interest_signal",
  "upload"
]);

export class RedisRateLimiter implements RateLimiter {
  constructor(
    private readonly client: RedisClientType,
    private readonly options: RateLimiterOptions
  ) {}

  private resolveConfig(scope: RateLimitScope): { max: number; windowSeconds: number } {
    switch (scope) {
      case "waitlist":
      case "partner_interest":
        return {
          max: this.options.waitlistMax,
          windowSeconds: this.options.waitlistWindowSeconds
        };
      case "confirm":
      case "partner_confirm":
        return {
          max: this.options.confirmMax,
          windowSeconds: this.options.confirmWindowSeconds
        };
      case "login_attempt":
        return {
          max: this.options.loginMax,
          windowSeconds: this.options.loginWindowSeconds
        };
      case "signup_attempt":
        return {
          max: this.options.signupMax,
          windowSeconds: this.options.signupWindowSeconds
        };
      case "message_send":
        return {
          max: this.options.messageMax,
          windowSeconds: this.options.messageWindowSeconds
        };
      case "interest_signal":
        return {
          max: this.options.interestMax,
          windowSeconds: this.options.interestWindowSeconds
        };
      case "article_search":
        return {
          max: this.options.searchMax,
          windowSeconds: this.options.searchWindowSeconds
        };
      case "upload":
        return {
          max: this.options.uploadMax,
          windowSeconds: this.options.uploadWindowSeconds
        };
    }
  }

  async check(input: RateLimitCheckInput): Promise<RateLimitCheckResult> {
    const nowMs = Date.now();
    const { max, windowSeconds } = this.resolveConfig(input.scope);
    const windowBucket = toWindowBucket(windowSeconds, nowMs);

    const useEmailBucket = SCOPES_WITH_EMAIL_BUCKET.has(input.scope);
    const emailPart = useEmailBucket ? `:${hashShort(input.email ?? "")}` : "";
    const key = `rl:${input.scope}:${hashShort(input.fingerprint)}${emailPart}:${windowBucket}`;

    const count = await this.client.incr(key);
    if (count === 1) {
      await this.client.expire(key, windowSeconds);
    }

    return {
      limited: count > max,
      retryAfterSeconds: retryAfter(windowSeconds, nowMs)
    };
  }

  async close(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }
}
