import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "./App";

type MatchMediaController = {
  matchMedia: (query: string) => MediaQueryList;
  setMatches: (nextValue: boolean) => void;
};

function createMatchMediaController(initialMatch: boolean): MatchMediaController {
  let currentValue = initialMatch;
  const listeners: Array<(event: MediaQueryListEvent) => void> = [];
  const addListener = (listener: (event: MediaQueryListEvent) => void) => {
    listeners.push(listener);
  };
  const removeListener = (listener: (event: MediaQueryListEvent) => void) => {
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
  const mediaQueryList = {
    get matches() {
      return currentValue;
    },
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => addListener(listener),
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => removeListener(listener),
    addListener,
    removeListener,
    dispatchEvent: () => true
  } as MediaQueryList;

  return {
    matchMedia: (_query: string) => mediaQueryList,
    setMatches: (nextValue: boolean) => {
      currentValue = nextValue;
      listeners.forEach((listener) => listener({ matches: currentValue } as MediaQueryListEvent));
    }
  };
}

describe("App theming and motion handling", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-motion");
  });

  it("applies default theme and updates reduced-motion attribute on preference change", () => {
    const mediaController = createMatchMediaController(false);
    vi.stubGlobal("matchMedia", mediaController.matchMedia);

    render(<App />);

    expect(document.documentElement.getAttribute("data-theme")).toBe("anthro-v1");
    expect(document.documentElement.getAttribute("data-motion")).toBe("default");

    act(() => {
      mediaController.setMatches(true);
    });

    expect(document.documentElement.getAttribute("data-motion")).toBe("reduced");
  });

  it("falls back to default motion mode when matchMedia is unavailable", () => {
    vi.stubGlobal("matchMedia", undefined);

    render(<App />);

    expect(document.documentElement.getAttribute("data-motion")).toBe("default");
  });
});
