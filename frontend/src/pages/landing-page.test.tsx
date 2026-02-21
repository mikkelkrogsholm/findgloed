import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LandingPage } from "./landing-page";

const fetchMock = vi.fn<typeof fetch>();

describe("LandingPage", () => {
  afterEach(() => {
    cleanup();
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("blocks submit until required consent is checked", async () => {
    render(<LandingPage />);

    expect(screen.getByTestId("landing-hero-shell")).toBeInTheDocument();
    expect(screen.getByTestId("landing-signup-card")).toBeInTheDocument();
    const submitButton = screen.getByRole("button", { name: "Skriv mig op" });
    expect(submitButton).toBeDisabled();
    expect(
      screen.getByText(/Skriv dig på ventelisten/)
    ).toBeInTheDocument();
  });

  it("sends marketing_opt_in and required consent in payload", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, message: "Tjek din email for at bekræfte din tilmelding." })
    } as Response);
    vi.stubGlobal("fetch", fetchMock);

    render(<LandingPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Din email"), "gdpr@example.com");
    await user.click(screen.getByLabelText("Jeg har læst og accepterer handelsbetingelserne og persondatapolitikken."));
    await user.click(screen.getByLabelText("Ja tak - send mig eksklusive invites, nyheder og updates fra Glød."));
    await user.click(screen.getByRole("button", { name: "Skriv mig op" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const parsedBody = JSON.parse(String(requestInit.body));

    expect(parsedBody).toMatchObject({
      email: "gdpr@example.com",
      source: "landing",
      accept_terms_privacy: true,
      marketing_opt_in: true
    });
  });

  it("shows neutral success message for server-ok response", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, message: "Tjek din email for at bekræfte din tilmelding." })
    } as Response);
    vi.stubGlobal("fetch", fetchMock);

    render(<LandingPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Din email"), "duplicate@example.com");
    await user.click(screen.getByLabelText("Jeg har læst og accepterer handelsbetingelserne og persondatapolitikken."));
    await user.click(screen.getByRole("button", { name: "Skriv mig op" }));

    expect(
      await screen.findByText("Bekræft din e-mail for at aktivere din plads på ventelisten.")
    ).toBeInTheDocument();
  });
});
