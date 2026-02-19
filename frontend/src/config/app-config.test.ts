import { describe, expect, it } from "vitest";

import { resolveThemePreset } from "./app-config";

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
