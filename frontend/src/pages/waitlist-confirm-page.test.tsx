import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WaitlistConfirmPage } from "./waitlist-confirm-page";

const fetchMock = vi.fn<typeof fetch>();

describe("WaitlistConfirmPage", () => {
  afterEach(() => {
    cleanup();
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    window.history.pushState({}, "", "/");
  });

  it("shows success state for confirmed token", async () => {
    window.history.pushState({}, "", "/waitlist/confirm?token=valid-token");
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        status: "confirmed",
        message: "Din tilmelding er bekræftet."
      })
    } as Response);
    vi.stubGlobal("fetch", fetchMock);

    render(<WaitlistConfirmPage />);

    expect(await screen.findByText("Din tilmelding er bekræftet.")).toBeInTheDocument();
  });

  it("shows invalid state when token is missing", async () => {
    window.history.pushState({}, "", "/waitlist/confirm");
    vi.stubGlobal("fetch", fetchMock);

    render(<WaitlistConfirmPage />);

    expect(await screen.findByText("Ugyldig bekræftelseskode.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows expired state for expired token response", async () => {
    window.history.pushState({}, "", "/waitlist/confirm?token=expired-token");
    fetchMock.mockResolvedValue({
      ok: false,
      status: 410,
      json: async () => ({
        ok: false,
        status: "expired",
        message: "Bekræftelseslinket er udløbet."
      })
    } as Response);
    vi.stubGlobal("fetch", fetchMock);

    render(<WaitlistConfirmPage />);

    expect(await screen.findByText("Bekræftelseslinket er udløbet.")).toBeInTheDocument();
  });
});
