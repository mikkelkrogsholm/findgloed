import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingPage } from "./onboarding-page";

const { getMe, updateMe } = vi.hoisted(() => ({
  getMe: vi.fn(),
  updateMe: vi.fn()
}));

vi.mock("@/lib/api", () => ({
  api: {
    asset: (path: string) => path,
    getMe,
    updateMe,
    uploadPhoto: vi.fn()
  }
}));

vi.mock("@/lib/nav", () => ({
  navigate: vi.fn()
}));

describe("OnboardingPage", () => {
  beforeEach(() => {
    getMe.mockResolvedValue({
      ok: true,
      profile: {
        user_id: "u1",
        email: "u@example.com",
        display_name: null,
        birth_year: null,
        age: null,
        region: null,
        bio: null,
        initiator_role: null,
        face_visibility: "after_interest",
        verification_status: "unverified",
        onboarded_at: null,
        paused_at: null,
        verified_at: null,
        role: "user",
        can_see_face: true
      },
      couple: null,
      photos: []
    });
    updateMe.mockResolvedValue({
      ok: true,
      profile: { face_visibility: "after_interest" }
    });
  });

  afterEach(() => {
    cleanup();
    getMe.mockReset();
    updateMe.mockReset();
  });

  it("walks through role and face steps and saves selections", async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /Hvem inviterer i jeres relation\?/ })
      ).toBeInTheDocument()
    );

    await user.click(screen.getByText("Den der inviterer"));
    await user.click(screen.getByRole("button", { name: /Fortsæt/ }));

    await waitFor(() => {
      expect(updateMe).toHaveBeenCalledWith({ initiator_role: "inviting" });
    });

    expect(
      await screen.findByRole("heading", { name: /Hvordan vises dit ansigt\?/ })
    ).toBeInTheDocument();
  });
});
