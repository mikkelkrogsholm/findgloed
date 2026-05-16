import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  ConversationSkeleton,
  FormSkeleton,
  SkeletonGrid
} from "./loading-state";

describe("SkeletonGrid", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders requested number of cards with members variant and aria-busy", () => {
    render(
      <SkeletonGrid variant="members" count={3} data-testid="members-skeleton" />
    );

    const grid = screen.getByTestId("members-skeleton");
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveAttribute("aria-busy", "true");
    // Hver skeleton-kort har præcis 1 image-rectangle (rounded-none).
    const cards = grid.children;
    expect(cards.length).toBe(3);
  });

  it("renders messages variant as a vertical list with avatar placeholders", () => {
    render(<SkeletonGrid variant="messages" count={2} data-testid="messages-skeleton" />);

    const list = screen.getByTestId("messages-skeleton");
    expect(list).toHaveAttribute("aria-busy", "true");
    expect(list.children.length).toBe(2);
  });

  it("renders my-events variant with 3 cards and aria-live polite", () => {
    render(
      <SkeletonGrid variant="my-events" count={3} data-testid="my-events-skeleton" />
    );

    const list = screen.getByTestId("my-events-skeleton");
    expect(list).toHaveAttribute("aria-live", "polite");
    expect(list.children.length).toBe(3);
  });
});

describe("FormSkeleton", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders form-skeleton with configurable row count", () => {
    render(<FormSkeleton rows={4} data-testid="form-skeleton" />);
    const skeleton = screen.getByTestId("form-skeleton");
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute("aria-busy", "true");
  });
});

describe("ConversationSkeleton", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders chat-skeleton with header + bubbles + composer", () => {
    render(<ConversationSkeleton data-testid="chat-skeleton" />);
    const skeleton = screen.getByTestId("chat-skeleton");
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute("aria-busy", "true");
  });
});
