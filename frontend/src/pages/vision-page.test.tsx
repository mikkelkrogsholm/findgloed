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

    expect(screen.getByTestId("vision-hero-shell")).toBeInTheDocument();
    expect(screen.getByTestId("vision-content-card")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Et voksent fællesskab, bygget omkring oplevelser" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Glød er for mennesker, der vil mødes i virkeligheden først."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vi starter med Dansk Sexologisk Akademi" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "For dig, der deltager" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "For jer, der arrangerer" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tre principper i praksis" })).toBeInTheDocument();
    expect(screen.getByText("MitID-verificeret adgang")).toBeInTheDocument();
    expect(screen.getByText("Event-first")).toBeInTheDocument();
    expect(screen.getByText("Klare rammer")).toBeInTheDocument();
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
