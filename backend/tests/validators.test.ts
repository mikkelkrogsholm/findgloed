import { describe, expect, test } from "bun:test";
import { isValidEmail, normalizeEmail } from "../src/validators";

// Issue B20: Email-validering må ikke acceptere absurd input. Tests dækker
// både acceptér-cases og afvis-cases.
describe("isValidEmail", () => {
  test("accepts standard emails", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("first.last@sub.example.com")).toBe(true);
    expect(isValidEmail("user+tag@example.dk")).toBe(true);
    expect(isValidEmail("a1@b.co")).toBe(true);
  });

  test("rejects empty and overlength", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("a".repeat(64) + "@" + "b".repeat(200) + ".com")).toBe(false);
  });

  test("rejects too-short or malformed", () => {
    expect(isValidEmail("a@b.c")).toBe(false); // TLD < 2 chars
    expect(isValidEmail("a@b")).toBe(false); // no TLD
    expect(isValidEmail("@example.com")).toBe(false); // missing local
    expect(isValidEmail("user@")).toBe(false); // missing domain
  });

  test("rejects double dots and dot positioning", () => {
    expect(isValidEmail("user..name@example.com")).toBe(false);
    expect(isValidEmail("user@example..com")).toBe(false);
  });

  test("rejects whitespace and control chars", () => {
    expect(isValidEmail("user @example.com")).toBe(false);
    expect(isValidEmail("user@exa mple.com")).toBe(false);
    expect(isValidEmail("user\n@example.com")).toBe(false);
  });

  test("rejects multiple at-signs", () => {
    expect(isValidEmail("a@b@c.com")).toBe(false);
  });
});

describe("normalizeEmail", () => {
  test("lowercases and trims", () => {
    expect(normalizeEmail("  User@Example.COM  ")).toBe("user@example.com");
  });
});
