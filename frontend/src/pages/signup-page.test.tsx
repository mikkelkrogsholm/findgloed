import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignupPage } from "./signup-page";

const { signUpEmail } = vi.hoisted(() => ({
  signUpEmail: vi.fn()
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signUp: { email: signUpEmail }
  }
}));

const fetchMock = vi.fn<typeof fetch>();

function stubSignupRequirements(requiresInviteCode: boolean) {
  fetchMock.mockImplementation(async (input) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url;
    if (url.includes("/api/auth/signup-requirements")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, requires_invite_code: requiresInviteCode })
      } as Response;
    }
    return { ok: false, status: 404, json: async () => ({ ok: false }) } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
}

describe("SignupPage", () => {
  beforeEach(() => {
    // Default: signup er åbent. Tests der vil have invite-code-gaten kan
    // overskrive før render.
    stubSignupRequirements(false);
  });

  afterEach(() => {
    cleanup();
    signUpEmail.mockReset();
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("renders form fields and disables submit until consent is given", () => {
    render(<SignupPage />);
    expect(screen.getByRole("heading", { name: "Bliv medlem af Glød" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Opret medlemskab" })).toBeDisabled();
  });

  it("submits when form is valid and consents are accepted", async () => {
    signUpEmail.mockResolvedValue({ data: { ok: true }, error: null });
    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(screen.getByLabelText("Navn (kun til intern brug)"), "Test Bruger");
    await user.type(screen.getByLabelText("E-mail"), "test@example.com");
    await user.type(screen.getByLabelText("Adgangskode"), "hemmeligt1234");
    await user.click(screen.getByLabelText(/Jeg er fyldt 18 år/));
    await user.click(screen.getByLabelText(/persondatapolitikken/));

    await user.click(screen.getByRole("button", { name: "Opret medlemskab" }));

    await waitFor(() => {
      expect(signUpEmail).toHaveBeenCalledWith({
        name: "Test Bruger",
        email: "test@example.com",
        password: "hemmeligt1234"
      });
    });
  });

  it("renders server error message", async () => {
    signUpEmail.mockResolvedValue({
      data: null,
      error: { message: "E-mail er allerede i brug" }
    });
    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(screen.getByLabelText("Navn (kun til intern brug)"), "Test Bruger");
    await user.type(screen.getByLabelText("E-mail"), "test@example.com");
    await user.type(screen.getByLabelText("Adgangskode"), "hemmeligt1234");
    await user.click(screen.getByLabelText(/Jeg er fyldt 18 år/));
    await user.click(screen.getByLabelText(/persondatapolitikken/));

    await user.click(screen.getByRole("button", { name: "Opret medlemskab" }));

    expect(await screen.findByText("E-mail er allerede i brug")).toBeInTheDocument();
  });

  it("viser ikke invite-code-felt når signup er åbent", async () => {
    render(<SignupPage />);
    // Vent til siden er hydreret (vi venter på navnet-feltet).
    await screen.findByLabelText("Navn (kun til intern brug)");
    expect(screen.queryByTestId("invite-code-field")).not.toBeInTheDocument();
  });

  it("viser invite-code-felt når admin har slået det til", async () => {
    stubSignupRequirements(true);
    render(<SignupPage />);

    await waitFor(() => {
      expect(screen.getByTestId("invite-code-field")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Invitationskode")).toBeInTheDocument();
  });

  it("sender invite_code med når feltet er udfyldt og krav er slået til", async () => {
    stubSignupRequirements(true);
    signUpEmail.mockResolvedValue({ data: { ok: true }, error: null });
    const user = userEvent.setup();
    render(<SignupPage />);

    await screen.findByTestId("invite-code-field");

    await user.type(screen.getByLabelText("Navn (kun til intern brug)"), "Test");
    await user.type(screen.getByLabelText("E-mail"), "test@example.com");
    await user.type(screen.getByLabelText("Adgangskode"), "hemmeligt1234");
    await user.type(screen.getByLabelText("Invitationskode"), "abc123");
    await user.click(screen.getByLabelText(/Jeg er fyldt 18 år/));
    await user.click(screen.getByLabelText(/persondatapolitikken/));

    await user.click(screen.getByRole("button", { name: "Opret medlemskab" }));

    await waitFor(() => {
      expect(signUpEmail).toHaveBeenCalledWith({
        name: "Test",
        email: "test@example.com",
        password: "hemmeligt1234",
        invite_code: "abc123"
      });
    });
  });
});
