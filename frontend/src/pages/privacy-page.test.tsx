import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PrivacyPage } from "./privacy-page";

describe("PrivacyPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("separates waitlist updates from optional marketing", () => {
    render(<PrivacyPage />);

    expect(screen.getByTestId("privacy-hero-shell")).toBeInTheDocument();
    expect(screen.getByTestId("privacy-content-card")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Vi indsamler kun de oplysninger, der er nødvendige for at håndtere din tilmelding og kommunikere om Glød\./
      )
    ).toBeInTheDocument();
    expect(screen.getByText("At sende praktiske opdateringer om venteliste og lancering.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "At sende markedsføring om events og tilbud, kun hvis du har givet særskilt samtykke."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Dataminimering" })).toBeInTheDocument();
  });
});
