import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PageHeader } from "./page-header";

describe("PageHeader", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders kicker, title and optional description in correct DOM order", () => {
    render(
      <PageHeader
        kicker="Begivenheder"
        title="Mine tilmeldinger"
        description="Du kan altid afmelde."
      />
    );

    const kicker = screen.getByText("Begivenheder");
    const heading = screen.getByRole("heading", { level: 1, name: "Mine tilmeldinger" });
    const desc = screen.getByText("Du kan altid afmelde.");

    expect(kicker).toBeInTheDocument();
    expect(heading).toBeInTheDocument();
    expect(desc).toBeInTheDocument();
    // DOM-rækkefølge er kicker → h1 → description (semantisk hierarki).
    expect(kicker.compareDocumentPosition(heading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(heading.compareDocumentPosition(desc)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it("renders actions slot when provided", () => {
    render(
      <PageHeader
        kicker="Profil"
        title="Indstillinger"
        actions={<button type="button">Log ud</button>}
        data-testid="header-with-actions"
      />
    );

    expect(screen.getByTestId("header-with-actions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log ud" })).toBeInTheDocument();
  });

  it("omits description when not provided", () => {
    render(<PageHeader kicker="Beskeder" title="Dine samtaler" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Dine samtaler" })
    ).toBeInTheDocument();
    // Ingen description-paragraph i DOM.
    expect(screen.queryByText(/./, { selector: "p.body-text-muted" })).toBeNull();
  });
});
