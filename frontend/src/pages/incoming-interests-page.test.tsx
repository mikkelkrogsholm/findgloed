import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IncomingInterestsPage } from "./incoming-interests-page";

const { listInterests, getMember, signalInterest, navigate } = vi.hoisted(() => ({
  listInterests: vi.fn(),
  getMember: vi.fn(),
  signalInterest: vi.fn(),
  navigate: vi.fn()
}));

vi.mock("@/lib/api", () => ({
  api: {
    asset: (path: string) => path,
    listInterests,
    getMember,
    signalInterest
  }
}));

vi.mock("@/lib/nav", () => ({
  navigate
}));

const baseProfile = {
  user_id: "alice",
  display_name: "Alice",
  birth_year: 1985,
  age: 41,
  region: "København",
  bio: null,
  initiator_role: "balanced" as const,
  face_visibility: "after_interest" as const,
  verification_status: "verified" as const,
  onboarded_at: "2026-04-01T00:00:00Z",
  paused_at: null,
  can_see_face: false
};

describe("IncomingInterestsPage", () => {
  beforeEach(() => {
    listInterests.mockResolvedValue({
      ok: true,
      incoming: [],
      outgoing: [],
      matches: []
    });
    getMember.mockResolvedValue({
      ok: true,
      profile: baseProfile,
      couple: null,
      photos: [],
      relation: "verified"
    });
  });

  afterEach(() => {
    cleanup();
    listInterests.mockReset();
    getMember.mockReset();
    signalInterest.mockReset();
    navigate.mockReset();
  });

  it("renders empty state when there are no incoming signals", async () => {
    render(<IncomingInterestsPage />);
    await waitFor(() =>
      expect(screen.getByTestId("incoming-interests-empty")).toBeInTheDocument()
    );
    expect(screen.getByText(/Ingen indkomne signaler endnu/)).toBeInTheDocument();
  });

  it("lists incoming signals with sender profile + return-interest CTA", async () => {
    listInterests.mockResolvedValue({
      ok: true,
      incoming: [
        {
          id: "sig1",
          from_user_id: "alice",
          to_user_id: "bob",
          created_at: "2026-05-10T00:00:00Z"
        }
      ],
      outgoing: [],
      matches: []
    });

    render(<IncomingInterestsPage />);
    await waitFor(() =>
      expect(screen.getByTestId("incoming-interest-alice")).toBeInTheDocument()
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByTestId("incoming-interest-return-alice")).toBeInTheDocument();
  });

  it("calls signalInterest and shows mutual-interest message when conversation opens", async () => {
    listInterests.mockResolvedValue({
      ok: true,
      incoming: [
        {
          id: "sig1",
          from_user_id: "alice",
          to_user_id: "bob",
          created_at: "2026-05-10T00:00:00Z"
        }
      ],
      outgoing: [],
      matches: []
    });
    signalInterest.mockResolvedValue({
      ok: true,
      signal: { id: "x", from_user_id: "bob", to_user_id: "alice", created_at: "2026-05-10T00:00:00Z" },
      conversation_opened: true
    });

    render(<IncomingInterestsPage />);
    await waitFor(() =>
      expect(screen.getByTestId("incoming-interest-return-alice")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId("incoming-interest-return-alice"));

    await waitFor(() => expect(signalInterest).toHaveBeenCalledWith("alice"));
    await waitFor(() =>
      expect(screen.getByTestId("incoming-interests-action-message")).toHaveTextContent(
        /samtalen er åbnet/i
      )
    );
  });
});
