import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CodeOfConductPage } from "./code-of-conduct-page";

describe("CodeOfConductPage", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/code-of-conduct");
  });

  afterEach(() => {
    cleanup();
  });

  it("renders hero with kicker, intro and tab triggers for all three levels", () => {
    render(<CodeOfConductPage />);

    expect(screen.getByTestId("coc-hero-shell")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Code of conduct", level: 1 })).toBeInTheDocument();
    expect(
      screen.getByText(/Glød bygger på samtykke\. Alle medlemmer accepterer disse principper\./)
    ).toBeInTheDocument();

    expect(screen.getByRole("tab", { name: "Sanseligt-socialt" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Sensuelt" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Eksplicit" })).toBeInTheDocument();
  });

  it("starts on sensual_social tab and reveals sensual content when user clicks the second tab", async () => {
    const user = userEvent.setup();
    render(<CodeOfConductPage />);

    // Default panel: sanseligt-socialt
    expect(screen.getByTestId("coc-panel-sensual_social")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Påklædt, samtale-drevet og flirtende\. Det er aftener hvor vi mødes som voksne/
      )
    ).toBeInTheDocument();

    // Skift til "Sensuelt"
    await user.click(screen.getByRole("tab", { name: "Sensuelt" }));

    expect(screen.getByTestId("coc-panel-sensual")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Afklædt eller delvist afklædt\. Det er aftener hvor intimiteten er mellem dig og din partner/
      )
    ).toBeInTheDocument();
  });
});
