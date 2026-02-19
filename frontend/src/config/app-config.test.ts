import { describe, expect, it } from "vitest";

import { appConfig, resolveThemePreset } from "./app-config";

describe("resolveThemePreset", () => {
  it("returns anthro-v1 for explicit anthro preset", () => {
    expect(resolveThemePreset("anthro-v1")).toBe("anthro-v1");
  });

  it("returns legacy for explicit legacy preset", () => {
    expect(resolveThemePreset("legacy")).toBe("legacy");
  });

  it("falls back to anthro-v1 for unsupported values", () => {
    expect(resolveThemePreset("experimental")).toBe("anthro-v1");
    expect(resolveThemePreset(undefined)).toBe("anthro-v1");
  });
});

describe("appConfig routes", () => {
  it("includes the vision page route", () => {
    expect(appConfig.routes.vision).toBe("/vision.html");
  });

  it("includes the partner confirmation route", () => {
    expect(appConfig.routes.partnerConfirm).toBe("/partner/confirm");
  });
});
