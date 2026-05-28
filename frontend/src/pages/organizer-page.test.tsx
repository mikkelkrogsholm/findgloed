import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OrganizerPage } from "./organizer-page";

const { listOrganizations, createOrganization, navigate, useSession } = vi.hoisted(() => ({
  listOrganizations: vi.fn(),
  createOrganization: vi.fn(),
  navigate: vi.fn(),
  useSession: vi.fn()
}));

vi.mock("@/lib/api", () => ({
  api: { listOrganizations, createOrganization }
}));

vi.mock("@/lib/nav", () => ({ navigate }));

vi.mock("@/lib/use-session", () => ({ useSession }));

function organizerSession() {
  return {
    status: "authenticated",
    profile: { role: "organizer", verification_status: "verified" }
  };
}

describe("OrganizerPage", () => {
  beforeEach(() => {
    useSession.mockReturnValue(organizerSession());
    listOrganizations.mockResolvedValue({
      ok: true,
      organizations: [
        {
          id: "org-1",
          slug: "klub",
          name: "Klub Glød",
          description: null,
          region: "København",
          contact_email: null,
          logo_path: null,
          status: "active",
          created_at: "2026-05-01T00:00:00Z",
          updated_at: "2026-05-01T00:00:00Z",
          org_role: "owner"
        }
      ]
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("lists the organizer's organizations", async () => {
    render(<OrganizerPage />);
    await waitFor(() => expect(screen.getByText("Klub Glød")).toBeInTheDocument());
    expect(screen.getByText("Ejer")).toBeInTheDocument();
  });

  it("blocks non-organizers", async () => {
    useSession.mockReturnValue({
      status: "authenticated",
      profile: { role: "user", verification_status: "verified" }
    });
    render(<OrganizerPage />);
    expect(
      await screen.findByText(/Denne side er kun for arrangører/)
    ).toBeInTheDocument();
  });

  it("creates an organization and navigates to it", async () => {
    listOrganizations.mockResolvedValue({ ok: true, organizations: [] });
    createOrganization.mockResolvedValue({
      ok: true,
      organization: { id: "org-9", name: "Ny Org" }
    });
    render(<OrganizerPage />);
    await waitFor(() => expect(listOrganizations).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId("toggle-create-org"));
    fireEvent.change(screen.getByLabelText("Navn"), { target: { value: "Ny Org" } });
    fireEvent.click(screen.getByRole("button", { name: "Opret organisation" }));

    await waitFor(() =>
      expect(createOrganization).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Ny Org" })
      )
    );
    expect(navigate).toHaveBeenCalledWith("/organizer/org-9");
  });
});
