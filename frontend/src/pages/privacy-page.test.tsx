import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PrivacyPage } from "./privacy-page";

describe("PrivacyPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("separates waitlist updates from optional marketing", () => {
    render(<PrivacyPage />);

    expect(
      screen.getByText(
        /Opdateringer om Glød og lancering er en del af venteliste-tilmeldingen. Markedsføring om events, tilbud og samarbejdspartnere er altid et separat tilvalg\./
      )
    ).toBeInTheDocument();
    expect(screen.getByText("At sende opdateringer om Glød, vores fremdrift og besked om lancering.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "At sende markedsføring om events, tilbud og samarbejder, kun hvis du har givet særskilt samtykke."
      )
    ).toBeInTheDocument();
  });
});
