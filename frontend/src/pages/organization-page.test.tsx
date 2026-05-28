import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OrganizationPage } from "./organization-page";

const { getPublicOrganization, navigate } = vi.hoisted(() => ({
  getPublicOrganization: vi.fn(),
  navigate: vi.fn()
}));

vi.mock("@/lib/api", () => ({ api: { getPublicOrganization } }));
vi.mock("@/lib/nav", () => ({ navigate }));

describe("OrganizationPage", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/organizations/klub");
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    window.history.pushState({}, "", "/");
  });

  it("renders org info and its events", async () => {
    getPublicOrganization.mockResolvedValue({
      ok: true,
      organization: {
        id: "o1",
        slug: "klub",
        name: "Klub Glød",
        description: "Nærvær.",
        region: "København",
        logo_path: null
      },
      events: [
        {
          id: "evt-1",
          slug: "intro",
          title: "Intro-aften",
          category: "mixed",
          level: "sensual_social",
          starts_at: "2026-09-15T18:00:00Z"
        }
      ]
    });
    render(<OrganizationPage />);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Klub Glød" })).toBeInTheDocument()
    );
    expect(screen.getByText("Intro-aften")).toBeInTheDocument();
  });

  it("shows not-found state when org is missing", async () => {
    getPublicOrganization.mockResolvedValue({ ok: false, code: "NOT_FOUND" });
    render(<OrganizationPage />);
    await waitFor(() =>
      expect(screen.getByText(/Arrangøren findes ikke/)).toBeInTheDocument()
    );
  });
});
