import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoupleProfilePage } from "./couple-profile-page";

const {
  getMe,
  listCoupleInvitations,
  inviteCouple,
  acceptCoupleInvitation,
  declineCoupleInvitation,
  cancelCoupleInvitation,
  updateCouple,
  deleteCouple,
  navigate
} = vi.hoisted(() => ({
  getMe: vi.fn(),
  listCoupleInvitations: vi.fn(),
  inviteCouple: vi.fn(),
  acceptCoupleInvitation: vi.fn(),
  declineCoupleInvitation: vi.fn(),
  cancelCoupleInvitation: vi.fn(),
  updateCouple: vi.fn(),
  deleteCouple: vi.fn(),
  navigate: vi.fn()
}));

vi.mock("@/lib/api", () => ({
  api: {
    asset: (path: string) => path,
    getMe,
    listCoupleInvitations,
    inviteCouple,
    acceptCoupleInvitation,
    declineCoupleInvitation,
    cancelCoupleInvitation,
    updateCouple,
    deleteCouple
  }
}));

vi.mock("@/lib/nav", () => ({
  navigate
}));

const baseProfile = {
  user_id: "u1",
  email: "u@example.com",
  display_name: "Bruger",
  birth_year: 1985,
  age: 41,
  region: "København",
  bio: null,
  initiator_role: "balanced" as const,
  face_visibility: "after_interest" as const,
  verification_status: "verified" as const,
  onboarded_at: "2026-04-01T00:00:00Z",
  paused_at: null,
  verified_at: "2026-04-01T00:00:00Z",
  verified_via: "temporary" as const,
  future_verification_accepted_at: null,
  role: "user",
  can_see_face: true
};

describe("CoupleProfilePage", () => {
  beforeEach(() => {
    getMe.mockResolvedValue({
      ok: true,
      profile: baseProfile,
      couple: null,
      photos: []
    });
    listCoupleInvitations.mockResolvedValue({
      ok: true,
      incoming: [],
      outgoing: []
    });
  });

  afterEach(() => {
    cleanup();
    getMe.mockReset();
    listCoupleInvitations.mockReset();
    inviteCouple.mockReset();
    acceptCoupleInvitation.mockReset();
    declineCoupleInvitation.mockReset();
    cancelCoupleInvitation.mockReset();
    updateCouple.mockReset();
    deleteCouple.mockReset();
    navigate.mockReset();
  });

  it("renders the invite form when user has no couple and no invitations", async () => {
    render(<CoupleProfilePage />);
    await waitFor(() =>
      expect(screen.getByTestId("couple-invite-form")).toBeInTheDocument()
    );
    expect(screen.getByLabelText("Partner-email")).toBeInTheDocument();
  });

  it("sends an invitation when the form is filled", async () => {
    inviteCouple.mockResolvedValue({
      ok: true,
      invitation: {
        id: "inv1",
        status: "pending",
        partner_email: "p@example.com"
      }
    });
    listCoupleInvitations.mockResolvedValueOnce({
      ok: true,
      incoming: [],
      outgoing: []
    });

    render(<CoupleProfilePage />);
    await waitFor(() => expect(screen.getByTestId("couple-invite-form")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Partner-email"), "partner@example.com");
    await user.type(screen.getByLabelText("Parnavn"), "Os to");
    await user.click(screen.getByTestId("send-invitation"));

    await waitFor(() => {
      expect(inviteCouple).toHaveBeenCalledWith(
        expect.objectContaining({
          partner_email: "partner@example.com",
          display_name: "Os to"
        })
      );
    });
  });

  it("shows incoming invitations with accept/decline buttons", async () => {
    listCoupleInvitations.mockResolvedValue({
      ok: true,
      incoming: [
        {
          id: "inv1",
          primary_user_id: "u2",
          partner_user_id: "u1",
          display_name: "Os to",
          bio: null,
          region: "København",
          open_to_singles: false,
          accepts_mixed_events: false,
          status: "pending",
          expires_at: "2030-01-01T00:00:00Z",
          created_at: "2026-05-01T00:00:00Z",
          responded_at: null,
          primary_email: "primaer@example.com",
          primary_display_name: "Primaer",
          partner_email: "u@example.com",
          partner_display_name: "Bruger"
        }
      ],
      outgoing: []
    });

    render(<CoupleProfilePage />);
    await waitFor(() =>
      expect(screen.getByTestId("couple-incoming-invitations")).toBeInTheDocument()
    );
    expect(screen.getByText(/Primaer/)).toBeInTheDocument();
    expect(screen.getByTestId("accept-invitation")).toBeInTheDocument();
  });

  it("shows existing couple edit form when user is in a couple", async () => {
    getMe.mockResolvedValue({
      ok: true,
      profile: baseProfile,
      couple: {
        id: "couple1",
        primary_user_id: "u1",
        partner_user_id: "u2",
        display_name: "Os to",
        bio: "Vi tester sammen.",
        region: "København",
        open_to_singles: true,
        accepts_mixed_events: false,
        paused_at: null
      },
      photos: []
    });

    render(<CoupleProfilePage />);
    await waitFor(() => expect(screen.getByTestId("couple-edit-card")).toBeInTheDocument());
    expect(screen.getByLabelText("Parnavn")).toHaveValue("Os to");
    expect(screen.getByTestId("dissolve-couple")).toBeInTheDocument();
  });

  it("shows outgoing pending invitation with cancel option", async () => {
    listCoupleInvitations.mockResolvedValue({
      ok: true,
      incoming: [],
      outgoing: [
        {
          id: "inv1",
          primary_user_id: "u1",
          partner_user_id: "u2",
          display_name: "Os to",
          bio: null,
          region: null,
          open_to_singles: false,
          accepts_mixed_events: false,
          status: "pending",
          expires_at: "2030-01-01T00:00:00Z",
          created_at: "2026-05-01T00:00:00Z",
          responded_at: null,
          primary_email: "u@example.com",
          primary_display_name: "Bruger",
          partner_email: "partner@example.com",
          partner_display_name: "Partner"
        }
      ]
    });

    render(<CoupleProfilePage />);
    await waitFor(() =>
      expect(screen.getByTestId("couple-outgoing-invitations")).toBeInTheDocument()
    );
    expect(screen.getByText(/Venter på partners accept/)).toBeInTheDocument();
  });

  it("renders human-readable error when partner email is unknown", async () => {
    inviteCouple.mockResolvedValue({
      ok: false,
      code: "PARTNER_NOT_FOUND_OR_NOT_VERIFIED"
    });

    render(<CoupleProfilePage />);
    await waitFor(() => expect(screen.getByTestId("couple-invite-form")).toBeInTheDocument());

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Partner-email"), "ukendt@example.com");
    await user.type(screen.getByLabelText("Parnavn"), "Os to");
    await user.click(screen.getByTestId("send-invitation"));

    await waitFor(() => {
      expect(screen.getByTestId("couple-error")).toHaveTextContent(
        /Vi kan ikke finde en verificeret bruger/
      );
    });
  });
});
