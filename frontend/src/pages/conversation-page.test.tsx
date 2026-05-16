import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConversationPage } from "./conversation-page";

const { getMe, getConversation, sendMessage, navigate } = vi.hoisted(() => ({
  getMe: vi.fn(),
  getConversation: vi.fn(),
  sendMessage: vi.fn(),
  navigate: vi.fn()
}));

vi.mock("@/lib/api", () => ({
  api: {
    getMe,
    getConversation,
    sendMessage
  }
}));

vi.mock("@/lib/nav", () => ({
  navigate
}));

beforeEach(() => {
  // Stub URL så conversationId-extract giver en stabil værdi.
  Object.defineProperty(window, "location", {
    writable: true,
    value: new URL("http://localhost/messages/conv-1") as unknown as Location
  });

  getMe.mockResolvedValue({
    ok: true,
    profile: { user_id: "me", email: "me@example.com" }
  });
  getConversation.mockResolvedValue({
    ok: true,
    conversation: {
      id: "conv-1",
      other: { user_id: "other", display_name: "Other", region: "København" }
    },
    messages: []
  });
});

afterEach(() => {
  cleanup();
  getMe.mockReset();
  getConversation.mockReset();
  sendMessage.mockReset();
  navigate.mockReset();
  vi.useRealTimers();
});

describe("ConversationPage — optimistic UI", () => {
  it("appends user message instantly while POST is in-flight (B30)", async () => {
    let resolveSend: ((value: { ok: true }) => void) | null = null;
    sendMessage.mockImplementation(
      () =>
        new Promise<{ ok: true }>((res) => {
          resolveSend = res;
        })
    );

    render(<ConversationPage />);
    await waitFor(() =>
      expect(screen.getByText("Other")).toBeInTheDocument()
    );

    const textarea = screen.getByLabelText("Skriv besked");
    fireEvent.change(textarea, { target: { value: "Hej!" } });
    fireEvent.click(screen.getByRole("button", { name: "Send besked" }));

    // Optimistic bubble vises straks med "sender…"-status, FØR POST resolver.
    await waitFor(() =>
      expect(screen.getByTestId("message-sending")).toBeInTheDocument()
    );
    expect(screen.getByText("Hej!")).toBeInTheDocument();

    // Når POST resolver, falder pending-state væk.
    resolveSend?.({ ok: true });
    await waitFor(() =>
      expect(screen.queryByTestId("message-sending")).not.toBeInTheDocument()
    );
  });

  it("shows failed-state with retry button when sendMessage fails (B30)", async () => {
    sendMessage.mockResolvedValueOnce({ ok: false, code: "RATE_LIMITED" });

    render(<ConversationPage />);
    await waitFor(() =>
      expect(screen.getByText("Other")).toBeInTheDocument()
    );

    const textarea = screen.getByLabelText("Skriv besked");
    fireEvent.change(textarea, { target: { value: "Hej fejl" } });
    fireEvent.click(screen.getByRole("button", { name: "Send besked" }));

    await waitFor(() =>
      expect(screen.getByTestId("message-failed")).toBeInTheDocument()
    );
    expect(screen.getByTestId("retry-message")).toBeInTheDocument();
  });
});
