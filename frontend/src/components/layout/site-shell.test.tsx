import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SiteShell } from "./site-shell";

describe("SiteShell", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders header with stable structure groups for brand, nav and partner", () => {
    render(
      <SiteShell themePreset="anthro-v1" showDesignLink>
        <div>content</div>
      </SiteShell>
    );

    const header = screen.getByTestId("site-header");
    expect(header).toBeInTheDocument();

    const primaryNav = screen.getByTestId("header-primary-nav");
    expect(within(primaryNav).getByRole("link", { name: "Vision" })).toHaveAttribute("href", "/vision");
    expect(within(primaryNav).getByRole("link", { name: "Privatliv" })).toHaveAttribute("href", "/privacy");
    expect(within(primaryNav).getByRole("link", { name: "Log ind" })).toHaveAttribute("href", "/login");
    expect(within(primaryNav).getByRole("link", { name: "Design" })).toHaveAttribute("href", "/design");

    const partnerGroup = screen.getByTestId("header-partner-group");
    expect(
      within(partnerGroup).getByRole("link", { name: "I samarbejde med Dansk Sexologisk Akademi" })
    ).toHaveAttribute("href", "https://www.dksa.dk/");
  });

  it("hides design link when feature is disabled", () => {
    render(
      <SiteShell themePreset="anthro-v1">
        <div>content</div>
      </SiteShell>
    );

    expect(screen.queryByRole("link", { name: "Design" })).not.toBeInTheDocument();
  });
});
