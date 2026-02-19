import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PartnerInterestModal } from "./partner-interest-modal";

const fetchMock = vi.fn<typeof fetch>();

describe("PartnerInterestModal", () => {
  afterEach(() => {
    cleanup();
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("opens modal and keeps submit disabled until required fields are valid", async () => {
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<PartnerInterestModal />);

    await user.click(screen.getByRole("button", { name: "Bliv samarbejdspartner" }));

    expect(screen.getByRole("heading", { name: "Bliv samarbejdspartner" })).toBeInTheDocument();
    const submitButton = screen.getByRole("button", { name: "Send forespørgsel" });
    expect(submitButton).toBeDisabled();

    await user.type(screen.getByLabelText("Dit navn"), "Mikkel");
    await user.type(screen.getByLabelText("Din e-mail"), "mikkel@example.com");
    await user.type(screen.getByLabelText("Organisation"), "Dansk Sexologisk Akademi");

    await user.click(screen.getByRole("combobox", { name: "Rolle" }));
    await user.click(screen.getByRole("option", { name: "Forening/organisation" }));

    await user.click(screen.getByLabelText("Oprette events"));
    await user.click(screen.getByLabelText("Jeg accepterer handelsbetingelser og persondatapolitik"));

    expect(submitButton).toBeEnabled();
  });

  it("submits form and renders success message", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        message: "Tjek din e-mail for at bekræfte din henvendelse."
      })
    } as Response);
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();

    render(<PartnerInterestModal />);

    await user.click(screen.getByRole("button", { name: "Bliv samarbejdspartner" }));

    await user.type(screen.getByLabelText("Dit navn"), "Mikkel");
    await user.type(screen.getByLabelText("Din e-mail"), "mikkel@example.com");
    await user.type(screen.getByLabelText("Organisation"), "Dansk Sexologisk Akademi");
    await user.click(screen.getByRole("combobox", { name: "Rolle" }));
    await user.click(screen.getByRole("option", { name: "Forening/organisation" }));
    await user.click(screen.getByLabelText("Oprette events"));
    await user.click(screen.getByLabelText("Jeg accepterer handelsbetingelser og persondatapolitik"));

    await user.click(screen.getByRole("button", { name: "Send forespørgsel" }));

    expect(await screen.findByText("Tak. Tjek din e-mail for at bekræfte din henvendelse.")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:4564/api/partner-interest",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("renders API error message when submit fails", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        ok: false,
        message: "Ugyldig email"
      })
    } as Response);
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();

    render(<PartnerInterestModal />);

    await user.click(screen.getByRole("button", { name: "Bliv samarbejdspartner" }));

    await user.type(screen.getByLabelText("Dit navn"), "Mikkel");
    await user.type(screen.getByLabelText("Din e-mail"), "mikkel@example.com");
    await user.type(screen.getByLabelText("Organisation"), "Dansk Sexologisk Akademi");
    await user.click(screen.getByRole("combobox", { name: "Rolle" }));
    await user.click(screen.getByRole("option", { name: "Forening/organisation" }));
    await user.click(screen.getByLabelText("Oprette events"));
    await user.click(screen.getByLabelText("Jeg accepterer handelsbetingelser og persondatapolitik"));

    await user.click(screen.getByRole("button", { name: "Send forespørgsel" }));

    expect(await screen.findByText("Ugyldig email")).toBeInTheDocument();
  });
});
