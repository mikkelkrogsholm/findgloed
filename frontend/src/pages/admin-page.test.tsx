import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminPage } from "./admin-page";

const fetchMock = vi.fn<typeof fetch>();

describe("AdminPage", () => {
  afterEach(() => {
    cleanup();
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("shows auth required message on 401", async () => {
    fetchMock.mockResolvedValue({ status: 401, ok: false, json: async () => ({ ok: false }) } as Response);
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminPage />);

    expect(await screen.findByText("Log ind for adgang.")).toBeInTheDocument();
  });

  it("shows forbidden message on 403", async () => {
    fetchMock.mockResolvedValue({ status: 403, ok: false, json: async () => ({ ok: false }) } as Response);
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminPage />);

    expect(await screen.findByText("Du har ikke adgang.")).toBeInTheDocument();
  });

  it("renders summary, supports filtering, and shows export actions", async () => {
    fetchMock.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        ok: true,
        meta: { total: 2, confirmed: 1, pending: 1 },
        items: [
          {
            id: "1",
            email: "one@example.com",
            status: "confirmed",
            source: "landing",
            marketing_opt_in: true,
            created_at: "2026-02-20T10:00:00.000Z",
            confirmed_at: "2026-02-20T10:10:00.000Z",
            terms_accepted_at: "2026-02-20T10:00:00.000Z",
            privacy_accepted_at: "2026-02-20T10:00:00.000Z"
          },
          {
            id: "2",
            email: "two@example.com",
            status: "pending",
            source: "landing",
            marketing_opt_in: false,
            created_at: "2026-02-21T10:00:00.000Z",
            confirmed_at: null,
            terms_accepted_at: "2026-02-21T10:00:00.000Z",
            privacy_accepted_at: "2026-02-21T10:00:00.000Z"
          }
        ]
      })
    } as Response);
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminPage />);

    expect(await screen.findByText("one@example.com")).toBeInTheDocument();
    expect(screen.getByText("Viser 2 af 2 tilmeldinger.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eksportér viste (CSV)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eksportér alle (CSV)" })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Status"), "confirmed");

    expect(await screen.findByText("Viser 1 af 2 tilmeldinger.")).toBeInTheDocument();
    expect(screen.getByText("one@example.com")).toBeInTheDocument();
    expect(screen.queryByText("two@example.com")).not.toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4564/api/admin/leads", {
      credentials: "include"
    });
  });
});
