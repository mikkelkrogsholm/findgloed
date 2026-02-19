import { afterEach, describe, expect, test } from "bun:test";
import { readConfig } from "../src/config";

const originalEnv = { ...process.env };

function resetEnv(overrides: Record<string, string | undefined> = {}): void {
  process.env = { ...originalEnv };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }
}

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("readConfig", () => {
  test("fails in production when CORS origins are missing", () => {
    resetEnv({
      NODE_ENV: "production",
      CORS_ORIGINS: undefined,
      CORS_ORIGIN: undefined
    });

    expect(() => readConfig()).toThrow("CORS_ORIGINS must be configured in production");
  });

  test("parses comma-separated CORS allowlist", () => {
    resetEnv({
      NODE_ENV: "production",
      CORS_ORIGINS: "https://findgloed.dk,https://app.findgloed.dk"
    });

    const config = readConfig();
    expect(config.corsOrigins).toEqual(["https://findgloed.dk", "https://app.findgloed.dk"]);
  });

  test("uses strict DB SSL rejectUnauthorized default when DB_SSL=true", () => {
    resetEnv({
      DB_SSL: "true",
      DB_SSL_REJECT_UNAUTHORIZED: undefined
    });

    const config = readConfig();
    expect(config.dbSsl).toBe(true);
    expect(config.dbSslRejectUnauthorized).toBe(true);
  });

  test("allows DB SSL rejectUnauthorized override via env", () => {
    resetEnv({
      DB_SSL: "true",
      DB_SSL_REJECT_UNAUTHORIZED: "false"
    });

    const config = readConfig();
    expect(config.dbSsl).toBe(true);
    expect(config.dbSslRejectUnauthorized).toBe(false);
  });
});
