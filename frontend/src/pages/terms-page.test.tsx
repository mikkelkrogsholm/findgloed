import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TermsPage } from "./terms-page";

describe("TermsPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders hero with title and last-updated stamp", () => {
    render(<TermsPage />);

    expect(screen.getByTestId("terms-hero-shell")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Handelsbetingelser", level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Senest opdateret:/)).toBeInTheDocument();
  });

  it("includes the key sections required by Danish consumer law and platform rules", () => {
    render(<TermsPage />);

    expect(screen.getByTestId("terms-section-operator")).toHaveTextContent("Hvem driver Glød");
    expect(screen.getByTestId("terms-section-what")).toHaveTextContent("Hvad Glød er");
    expect(screen.getByTestId("terms-section-membership")).toHaveTextContent(/14 dages fortrydelsesret/);
    expect(screen.getByTestId("terms-section-event-cancellation")).toHaveTextContent("Event-tilmeldinger og afmelding");
    expect(screen.getByTestId("terms-section-not-allowed")).toHaveTextContent("Hvad der ikke er tilladt");
    expect(screen.getByTestId("terms-section-moderation")).toHaveTextContent("Moderation og konsekvenser");
    expect(screen.getByTestId("terms-section-changes")).toHaveTextContent(/mindst 30 dages/);
    expect(screen.getByTestId("terms-section-disputes")).toHaveTextContent("Tvister og værneting");
    expect(screen.getByTestId("terms-section-contact")).toHaveTextContent("mikkel@findgloed.dk");
  });
});
