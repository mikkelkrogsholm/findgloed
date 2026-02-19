import { createHash } from "node:crypto";
import type { RedisClientType } from "redis";
import type { RateLimitCheckInput, RateLimitCheckResult, RateLimiter } from "./types";

export type RateLimiterOptions = {
  waitlistMax: number;
  waitlistWindowSeconds: number;
  confirmMax: number;
  confirmWindowSeconds: number;
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

export class RedisRateLimiter implements RateLimiter {
  constructor(
    private readonly client: RedisClientType,
    private readonly options: RateLimiterOptions
  ) {}

  async check(input: RateLimitCheckInput): Promise<RateLimitCheckResult> {
    const nowMs = Date.now();
    const isWaitlist = input.scope === "waitlist" || input.scope === "partner_interest";
    const max = isWaitlist ? this.options.waitlistMax : this.options.confirmMax;
    const windowSeconds = isWaitlist
      ? this.options.waitlistWindowSeconds
      : this.options.confirmWindowSeconds;
    const windowBucket = toWindowBucket(windowSeconds, nowMs);

    const emailPart = isWaitlist ? `:${hashShort(input.email ?? "")}` : "";
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
