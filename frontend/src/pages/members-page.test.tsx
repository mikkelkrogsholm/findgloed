import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MembersPage } from "./members-page";

const { listMembers } = vi.hoisted(() => ({
  listMembers: vi.fn()
}));

vi.mock("@/lib/api", () => ({
  api: {
    asset: (path: string) => path,
    listMembers
  }
}));

vi.mock("@/lib/nav", () => ({
  navigate: vi.fn()
}));

describe("MembersPage", () => {
  beforeEach(() => {
    listMembers.mockResolvedValue({
      ok: true,
      members: [
        {
          user_id: "u1",
          display_name: "Moa",
          birth_year: 1985,
          age: 41,
          region: "København",
          bio: "Voksent og direkte.",
          initiator_role: "deciding",
          face_visibility: "after_interest",
          verification_status: "verified",
          onboarded_at: "2026-04-01T00:00:00Z",
          paused_at: null,
          can_see_face: false,
          photos: []
        }
      ]
    });
  });

  afterEach(() => {
    cleanup();
    listMembers.mockReset();
  });

  it("lists verified members with privacy badge when face is hidden", async () => {
    render(<MembersPage />);
    await waitFor(() => expect(screen.getByText("Moa")).toBeInTheDocument());
    expect(screen.getByText(/Ansigt vises efter interesse/)).toBeInTheDocument();
    expect(screen.getByText(/41 år/)).toBeInTheDocument();
    expect(screen.getByText("København")).toBeInTheDocument();
  });

  it("shows verification-required hint when API rejects unverified viewer", async () => {
    listMembers.mockResolvedValue({ ok: false, code: "VERIFICATION_REQUIRED" });
    render(<MembersPage />);
    await waitFor(() =>
      expect(
        screen.getByText(/Du skal være verificeret for at se medlemmer\./)
      ).toBeInTheDocument()
    );
  });
});
