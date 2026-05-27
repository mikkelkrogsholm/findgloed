import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AdminSubnav } from "./admin-subnav";

function setPathname(pathname: string): void {
  window.history.replaceState({}, "", pathname);
}

describe("AdminSubnav", () => {
  beforeEach(() => {
    setPathname("/admin");
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the four admin destinations", () => {
    render(<AdminSubnav />);

    expect(screen.getByRole("link", { name: "Leads" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Events" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Verifikationer" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reports" })).toBeInTheDocument();
  });

  it("marks the matching link as active based on pathname", () => {
    setPathname("/admin/events");
    render(<AdminSubnav />);

    expect(screen.getByRole("link", { name: "Events" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: "Leads" })).not.toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("marks Leads as active for the exact /admin path and not for sub-routes", () => {
    setPathname("/admin");
    render(<AdminSubnav />);

    expect(screen.getByRole("link", { name: "Leads" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: "Events" })).not.toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("updates active-state when pathname changes via popstate", () => {
    setPathname("/admin");
    render(<AdminSubnav />);

    expect(screen.getByRole("link", { name: "Leads" })).toHaveAttribute(
      "aria-current",
      "page"
    );

    act(() => {
      window.history.replaceState({}, "", "/admin/reports");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(screen.getByRole("link", { name: "Reports" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });
});
