import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfilePage } from "./profile-page";

const {
  getMe,
  listCoupleInvitations,
  listInterests,
  listAlbumGrants,
  revokePrivateAlbum,
  deleteMe,
  navigate,
  signOut
} = vi.hoisted(() => ({
  getMe: vi.fn(),
  listCoupleInvitations: vi.fn(),
  listInterests: vi.fn(),
  listAlbumGrants: vi.fn(),
  revokePrivateAlbum: vi.fn(),
  deleteMe: vi.fn(),
  navigate: vi.fn(),
  signOut: vi.fn()
}));

vi.mock("@/lib/api", () => ({
  api: {
    asset: (path: string) => path,
    getMe,
    listCoupleInvitations,
    listInterests,
    listAlbumGrants,
    revokePrivateAlbum,
    deleteMe,
    updateMe: vi.fn(),
    uploadPhoto: vi.fn(),
    deletePhoto: vi.fn()
  }
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signOut
  }
}));

vi.mock("@/lib/use-session", () => ({
  clearSession: vi.fn()
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

describe("ProfilePage couple section", () => {
  beforeEach(() => {
    listCoupleInvitations.mockResolvedValue({
      ok: true,
      incoming: [],
      outgoing: []
    });
    listInterests.mockResolvedValue({
      ok: true,
      incoming: [],
      outgoing: [],
      matches: []
    });
    listAlbumGrants.mockResolvedValue({ ok: true, grants: [] });
  });

  afterEach(() => {
    cleanup();
    getMe.mockReset();
    listCoupleInvitations.mockReset();
    listInterests.mockReset();
    listAlbumGrants.mockReset();
    revokePrivateAlbum.mockReset();
    deleteMe.mockReset();
    navigate.mockReset();
    signOut.mockReset();
  });

  it("renders couple section with create-button when user has no couple", async () => {
    getMe.mockResolvedValue({
      ok: true,
      profile: baseProfile,
      couple: null,
      photos: []
    });

    render(<ProfilePage />);

    await waitFor(() =>
      expect(screen.getByTestId("profile-couple-section")).toBeInTheDocument()
    );
    expect(screen.getByTestId("create-couple")).toBeInTheDocument();
    expect(screen.getByText(/Du er ikke i et par på Glød/)).toBeInTheDocument();
  });

  it("renders couple badge with manage button when user is in a couple", async () => {
    getMe.mockResolvedValue({
      ok: true,
      profile: baseProfile,
      couple: {
        id: "couple1",
        primary_user_id: "u1",
        partner_user_id: "u2",
        display_name: "Os to",
        bio: null,
        region: "København",
        open_to_singles: true,
        accepts_mixed_events: false,
        paused_at: null
      },
      photos: []
    });

    render(<ProfilePage />);

    await waitFor(() =>
      expect(screen.getByTestId("manage-couple")).toBeInTheDocument()
    );
    expect(screen.getByText(/Os to/)).toBeInTheDocument();
  });

  it("shows an invitation banner when there is an incoming pending invitation", async () => {
    getMe.mockResolvedValue({
      ok: true,
      profile: baseProfile,
      couple: null,
      photos: []
    });
    listCoupleInvitations.mockResolvedValue({
      ok: true,
      incoming: [
        {
          id: "inv1",
          primary_user_id: "u2",
          partner_user_id: "u1",
          display_name: "Os to",
          bio: null,
          region: null,
          open_to_singles: false,
          accepts_mixed_events: false,
          status: "pending",
          expires_at: "2030-01-01T00:00:00Z",
          created_at: "2026-05-01T00:00:00Z",
          responded_at: null,
          primary_email: "andre@example.com",
          primary_display_name: "Anden Bruger",
          partner_email: "u@example.com",
          partner_display_name: "Bruger"
        }
      ],
      outgoing: []
    });

    render(<ProfilePage />);

    await waitFor(() =>
      expect(
        screen.getByTestId("profile-couple-invitation-banner")
      ).toBeInTheDocument()
    );
    expect(screen.getByText(/Anden Bruger/)).toBeInTheDocument();
    expect(screen.getByTestId("goto-couple-profile-from-banner")).toBeInTheDocument();
  });
});

describe("ProfilePage delete account", () => {
  beforeEach(() => {
    listCoupleInvitations.mockResolvedValue({
      ok: true,
      incoming: [],
      outgoing: []
    });
    listInterests.mockResolvedValue({
      ok: true,
      incoming: [],
      outgoing: [],
      matches: []
    });
    listAlbumGrants.mockResolvedValue({ ok: true, grants: [] });
    getMe.mockResolvedValue({
      ok: true,
      profile: baseProfile,
      couple: null,
      photos: []
    });
  });

  afterEach(() => {
    cleanup();
    getMe.mockReset();
    listCoupleInvitations.mockReset();
    deleteMe.mockReset();
    navigate.mockReset();
    signOut.mockReset();
  });

  it("opens the slet konto-dialog and calls api.deleteMe with hard=true when email matches", async () => {
    deleteMe.mockResolvedValue({ ok: true });
    signOut.mockResolvedValue(undefined);

    render(<ProfilePage />);

    await waitFor(() =>
      expect(screen.getByTestId("profile-delete-account-section")).toBeInTheDocument()
    );

    // Hard-delete-flow
    fireEvent.click(screen.getByTestId("open-hard-delete-dialog"));
    await waitFor(() =>
      expect(screen.getByTestId("delete-account-dialog")).toBeInTheDocument()
    );
    expect(screen.getByText(/Slet konto permanent/)).toBeInTheDocument();

    // Tast email forkert først — der må ikke kaldes deleteMe.
    fireEvent.change(screen.getByTestId("delete-confirm-email-input"), {
      target: { value: "forkert@example.com" }
    });
    fireEvent.click(screen.getByTestId("confirm-delete-account"));
    expect(deleteMe).not.toHaveBeenCalled();

    // Tast email korrekt — nu kaldes deleteMe(true).
    fireEvent.change(screen.getByTestId("delete-confirm-email-input"), {
      target: { value: baseProfile.email }
    });
    fireEvent.click(screen.getByTestId("confirm-delete-account"));

    await waitFor(() => expect(deleteMe).toHaveBeenCalledTimes(1));
    expect(deleteMe).toHaveBeenCalledWith(true);
  });
});
