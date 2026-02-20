import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import App from "./App";

describe("App routing", () => {
  afterEach(() => {
    cleanup();
    document.title = "Glød";
  });

  it("renders vision page on /vision", () => {
    window.history.pushState({}, "", "/vision");
    render(<App />);

    expect(screen.getByRole("heading", { name: "Et voksent fællesskab, bygget omkring oplevelser" })).toBeInTheDocument();
    expect(document.title).toBe("Glød - Vision");
  });

  it("renders vision page on /vision.html", () => {
    window.history.pushState({}, "", "/vision.html");
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

  it("renders partner confirm page on /partner/confirm.html", () => {
    window.history.pushState({}, "", "/partner/confirm.html");
    render(<App />);

    expect(screen.getByRole("heading", { name: "Bekræft samarbejdspartner-forespørgsel" })).toBeInTheDocument();
    expect(document.title).toBe("Glød - Bekræft samarbejde");
  });

  it("shows a dedicated vision link in the shared header", () => {
    window.history.pushState({}, "", "/");
    render(<App />);

    expect(screen.getByRole("link", { name: "Vision" })).toHaveAttribute("href", "/vision.html");
  });

  it("shows a DKSA partner link in the shared header", () => {
    window.history.pushState({}, "", "/");
    render(<App />);

    expect(screen.getByRole("link", { name: "I samarbejde med Dansk Sexologisk Akademi" })).toHaveAttribute(
      "href",
      "https://www.dksa.dk/"
    );
  });
});
