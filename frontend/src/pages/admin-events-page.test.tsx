import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminEventsPage } from "./admin-events-page";

const fetchMock = vi.fn<typeof fetch>();

const SAMPLE_EVENT = {
  id: "evt-1",
  slug: "aabent-nakkeparti-aften",
  title: "Åbent nakkeparti",
  description: "En aften med sanseligt-socialt program.",
  not_for: null,
  category: "single_only" as const,
  level: "sensual_social" as const,
  beginner_friendly: true,
  experience_required: false,
  facilitator_name: "Sara",
  facilitator_credential: "Sexolog",
  starts_at: "2026-06-01T19:00:00.000Z",
  ends_at: "2026-06-01T22:00:00.000Z",
  capacity: 12,
  price_cents: 0,
  region: "København",
  location_label: "Indre by",
  location_address: null,
  dresscode: null,
  exit_strategy: null,
  status: "draft"
};

function mockJson<T>(body: T, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body
  } as Response;
}

describe("AdminEventsPage", () => {
  afterEach(() => {
    cleanup();
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("toggles the edit form for an existing event and submits a PATCH update", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/api/admin/events") && (!init || init.method === undefined)) {
        return Promise.resolve(mockJson({ ok: true, events: [SAMPLE_EVENT] }));
      }
      if (url.endsWith("/api/admin/events/evt-1") && init?.method === "PATCH") {
        return Promise.resolve(
          mockJson({
            ok: true,
            event: { ...SAMPLE_EVENT, title: "Ny titel" }
          })
        );
      }
      return Promise.resolve(mockJson({ ok: true, events: [SAMPLE_EVENT] }));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminEventsPage />);

    expect(await screen.findByText("Åbent nakkeparti")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByTestId("edit-event-evt-1"));

    // Edit-form vises som ny Card med "Redigér:"-titel.
    expect(
      await screen.findByText("Redigér: Åbent nakkeparti")
    ).toBeInTheDocument();

    // Slug-feltet skal være disabled i edit-mode for at undgå brudt URL.
    const slugField = screen.getByLabelText("Slug") as HTMLInputElement;
    expect(slugField).toBeDisabled();

    // Skift titel + submit.
    const titleField = screen.getByLabelText("Titel") as HTMLInputElement;
    await user.clear(titleField);
    await user.type(titleField, "Ny titel");

    await user.click(screen.getByRole("button", { name: "Gem ændringer" }));

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(([, init]) => {
        return init?.method === "PATCH";
      });
      expect(patchCall).toBeDefined();
    });

    const patchCall = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
    const body = JSON.parse(String(patchCall?.[1]?.body));
    expect(body.title).toBe("Ny titel");
    // slug må ikke sendes med — vi vil ikke kunne mutere den.
    expect(body.slug).toBeUndefined();

    // Success-besked vises.
    expect(await screen.findByText("Event opdateret.")).toBeInTheDocument();
  });

  it("loads and displays the registrations list when Deltagere is clicked", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/api/admin/events")) {
        return Promise.resolve(mockJson({ ok: true, events: [SAMPLE_EVENT] }));
      }
      if (url.endsWith("/api/admin/events/evt-1/registrations")) {
        return Promise.resolve(
          mockJson({
            ok: true,
            registrations: [
              {
                id: "reg-1",
                user_id: "u-1",
                couple_id: null,
                status: "confirmed",
                registered_at: "2026-05-12T12:00:00.000Z",
                display_name: "Mia",
                email: "mia@example.com"
              }
            ]
          })
        );
      }
      return Promise.resolve(mockJson({ ok: true, events: [SAMPLE_EVENT] }));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminEventsPage />);

    expect(await screen.findByText("Åbent nakkeparti")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByTestId("toggle-registrations-evt-1"));

    expect(await screen.findByText("Mia")).toBeInTheDocument();
    expect(screen.getByText("mia@example.com")).toBeInTheDocument();
    expect(screen.getByText("Tilmeldt")).toBeInTheDocument();
  });
});
