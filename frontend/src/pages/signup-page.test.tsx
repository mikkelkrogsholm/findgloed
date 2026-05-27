import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SignupPage } from "./signup-page";

const { signUpEmail } = vi.hoisted(() => ({
  signUpEmail: vi.fn()
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signUp: { email: signUpEmail }
  }
}));

describe("SignupPage", () => {
  afterEach(() => {
    cleanup();
    signUpEmail.mockReset();
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
});
