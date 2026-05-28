import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OrganizationsPage } from "./organizations-page";

const { listPublicOrganizations, navigate } = vi.hoisted(() => ({
  listPublicOrganizations: vi.fn(),
  navigate: vi.fn()
}));

vi.mock("@/lib/api", () => ({ api: { listPublicOrganizations } }));
vi.mock("@/lib/nav", () => ({ navigate }));

describe("OrganizationsPage", () => {
  beforeEach(() => {
    listPublicOrganizations.mockResolvedValue({
      ok: true,
      organizations: [
        {
          id: "o1",
          slug: "klub",
          name: "Klub Glød",
          description: "Nærvær og sanselighed.",
          region: "København",
          logo_path: null
        }
      ]
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("lists public organizations", async () => {
    render(<OrganizationsPage />);
    await waitFor(() => expect(screen.getByText("Klub Glød")).toBeInTheDocument());
    expect(screen.getByText("København")).toBeInTheDocument();
  });

  it("shows empty state when there are none", async () => {
    listPublicOrganizations.mockResolvedValue({ ok: true, organizations: [] });
    render(<OrganizationsPage />);
    await waitFor(() =>
      expect(screen.getByText(/Ingen arrangører endnu/)).toBeInTheDocument()
    );
  });
});
