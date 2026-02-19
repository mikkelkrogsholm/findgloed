import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { VisionPage } from "./vision-page";

describe("VisionPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders mission and core principles in Danish", () => {
    render(<VisionPage />);

    expect(screen.getByRole("heading", { name: "Et trygt sted at udforske, mødes og høre til" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Ikke kun for dating, men også for nysgerrighed, læring, fælles oplevelser og fællesskab omkring seksualitet og relationer."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vi starter med Dansk Sexologisk Akademi" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "For dig, der kommer som menneske" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "For jer, der arbejder med mennesker" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vores værdier" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tre principper i praksis" })).toBeInTheDocument();
    expect(screen.getByText("MitID-verificeret adgang")).toBeInTheDocument();
    expect(screen.getByText("Event-first struktur")).toBeInTheDocument();
    expect(screen.getByText("Tryghed og klare rammer")).toBeInTheDocument();
  });

  it("offers CTA for both waitlist and partner collaboration", async () => {
    const user = userEvent.setup();
    render(<VisionPage />);

    expect(screen.getByRole("link", { name: "Til ventelisten" })).toHaveAttribute("href", "/");
    const partnerButton = screen.getByRole("button", { name: "Bliv samarbejdspartner" });
    expect(partnerButton).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Bliv samarbejdspartner" })).not.toBeInTheDocument();

    await user.click(partnerButton);
    expect(screen.getByRole("heading", { name: "Bliv samarbejdspartner" })).toBeInTheDocument();
  });
});
