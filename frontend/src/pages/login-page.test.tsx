import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "./login-page";

const { signInEmail } = vi.hoisted(() => ({
  signInEmail: vi.fn()
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: { email: signInEmail }
  }
}));

describe("LoginPage", () => {
  afterEach(() => {
    cleanup();
    signInEmail.mockReset();
  });

  it("shows sign in by default", () => {
    render(<LoginPage />);

    expect(screen.getByRole("heading", { name: "Log ind" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log ind" })).toBeInTheDocument();
    expect(screen.queryByText("Ny konto")).not.toBeInTheDocument();
  });

  it("submits sign in credentials", async () => {
    signInEmail.mockResolvedValue({ data: { ok: true }, error: null });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Email"), "admin@example.com");
    await user.type(screen.getByLabelText("Adgangskode"), "password123");
    await user.click(screen.getByRole("button", { name: /^Log ind$/ }));

    await waitFor(() => {
      expect(signInEmail).toHaveBeenCalledWith({
        email: "admin@example.com",
        password: "password123"
      });
    });
  });

  it("renders server error message", async () => {
    signInEmail.mockResolvedValue({
      data: null,
      error: { message: "Ugyldig login" }
    });

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Email"), "admin@example.com");
    await user.type(screen.getByLabelText("Adgangskode"), "wrong-password");
    await user.click(screen.getByRole("button", { name: /^Log ind$/ }));

    expect(await screen.findByText("Ugyldig login")).toBeInTheDocument();
  });
});
