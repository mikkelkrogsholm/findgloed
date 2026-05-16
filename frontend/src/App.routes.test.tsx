import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "./App";

describe("App routing", () => {
  afterEach(() => {
    cleanup();
    document.title = "Glød";
    vi.unstubAllGlobals();
  });

  it("renders vision page on /vision", () => {
    window.history.pushState({}, "", "/vision");
    render(<App />);

    expect(screen.getByRole("heading", { name: "Et voksent fællesskab, bygget omkring oplevelser" })).toBeInTheDocument();
    expect(document.title).toBe("Glød - Vision");
  });

  it("renders partner confirm page on /partner/confirm", () => {
    window.history.pushState({}, "", "/partner/confirm");
    render(<App />);

    expect(screen.getByRole("heading", { name: "Bekræft samarbejdspartner-forespørgsel" })).toBeInTheDocument();
    expect(document.title).toBe("Glød - Bekræft samarbejde");
  });

  it("shows a dedicated vision link in the shared header", () => {
    window.history.pushState({}, "", "/");
    render(<App />);

    expect(screen.getByRole("link", { name: "Vision" })).toHaveAttribute("href", "/vision");
  });

  it("shows a DKSA partner link in the shared header", () => {
    window.history.pushState({}, "", "/");
    render(<App />);

    expect(screen.getByRole("link", { name: "I samarbejde med Dansk Sexologisk Akademi" })).toHaveAttribute(
      "href",
      "https://www.dksa.dk/"
    );
  });

  it("renders login page on /login", () => {
    window.history.pushState({}, "", "/login");
    render(<App />);

    expect(screen.getByRole("heading", { name: "Log ind" })).toBeInTheDocument();
    expect(document.title).toBe("Glød - Log ind");
  });

  it("renders code of conduct page on /code-of-conduct", () => {
    window.history.pushState({}, "", "/code-of-conduct");
    render(<App />);

    expect(screen.getByRole("heading", { name: "Code of conduct", level: 1 })).toBeInTheDocument();
    expect(document.title).toBe("Glød - Code of conduct");
  });

  it("renders terms page on /terms", () => {
    window.history.pushState({}, "", "/terms");
    render(<App />);

    expect(screen.getByRole("heading", { name: "Handelsbetingelser", level: 1 })).toBeInTheDocument();
    expect(document.title).toBe("Glød - Handelsbetingelser");
  });

  it("renders admin page on /admin", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 401,
        ok: false,
        json: async () => ({ ok: false })
      } as Response)
    );

    window.history.pushState({}, "", "/admin");
    render(<App />);

    expect(screen.getByRole("heading", { name: "Admin-overblik: Tilmeldte" })).toBeInTheDocument();
    expect(document.title).toBe("Glød - Admin");
  });
});
