import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OrganizerOrgPage } from "./organizer-org-page";

const {
  getOrganization,
  listOrgMembers,
  listOrgEvents,
  listOrganizations,
  addOrgMember,
  removeOrgMember,
  navigate,
  useSession
} = vi.hoisted(() => ({
  getOrganization: vi.fn(),
  listOrgMembers: vi.fn(),
  listOrgEvents: vi.fn(),
  listOrganizations: vi.fn(),
  addOrgMember: vi.fn(),
  removeOrgMember: vi.fn(),
  navigate: vi.fn(),
  useSession: vi.fn()
}));

vi.mock("@/lib/api", () => ({
  api: {
    getOrganization,
    listOrgMembers,
    listOrgEvents,
    listOrganizations,
    addOrgMember,
    removeOrgMember
  }
}));

vi.mock("@/lib/nav", () => ({ navigate }));
vi.mock("@/lib/use-session", () => ({ useSession }));

function seedOk() {
  getOrganization.mockResolvedValue({
    ok: true,
    organization: {
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
  });
  listOrgMembers.mockResolvedValue({
    ok: true,
    members: [
      {
        user_id: "o1",
        org_role: "owner",
        display_name: "Carina",
        email: "carina@x.dk",
        created_at: "2026-05-01T00:00:00Z"
      }
    ]
  });
  listOrgEvents.mockResolvedValue({
    ok: true,
    events: [
      {
        id: "evt-1",
        slug: "intro",
        title: "Intro-aften",
        description: "x",
        not_for: null,
        category: "mixed",
        level: "sensual_social",
        beginner_friendly: true,
        experience_required: false,
        facilitator_name: "Carina",
        facilitator_credential: null,
        starts_at: "2026-09-01T18:00:00Z",
        ends_at: "2026-09-01T21:00:00Z",
        capacity: 20,
        price_cents: 0,
        region: "København",
        location_label: null,
        location_address: null,
        dresscode: null,
        exit_strategy: null,
        status: "published"
      }
    ],
    meta: { total: 1 }
  });
  listOrganizations.mockResolvedValue({ ok: true, organizations: [] });
}

describe("OrganizerOrgPage", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/organizer/org-1");
    useSession.mockReturnValue({
      status: "authenticated",
      profile: { role: "organizer", verification_status: "verified" }
    });
    seedOk();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    window.history.pushState({}, "", "/");
  });

  it("renders org name, team and events", async () => {
    render(<OrganizerOrgPage />);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Klub Glød" })).toBeInTheDocument()
    );
    expect(screen.getByText("Carina")).toBeInTheDocument();
    expect(screen.getByText("Intro-aften")).toBeInTheDocument();
    // Owner ser team-tilføj-formular
    expect(screen.getByTestId("add-member-form")).toBeInTheDocument();
  });

  it("adds a team member by email", async () => {
    addOrgMember.mockResolvedValue({
      ok: true,
      member: { user_id: "u2", org_role: "editor", display_name: "Ny", email: "ny@x.dk" }
    });
    render(<OrganizerOrgPage />);
    await waitFor(() => expect(screen.getByTestId("add-member-form")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Tilføj medlem (email)"), {
      target: { value: "ny@x.dk" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Tilføj" }));

    await waitFor(() =>
      expect(addOrgMember).toHaveBeenCalledWith("org-1", {
        email: "ny@x.dk",
        org_role: "editor"
      })
    );
  });

  it("shows access alert on FORBIDDEN", async () => {
    getOrganization.mockResolvedValue({ ok: false, code: "FORBIDDEN" });
    render(<OrganizerOrgPage />);
    expect(
      await screen.findByText(/Du har ikke adgang til denne organisation/)
    ).toBeInTheDocument();
  });
});
