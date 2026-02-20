import { describe, expect, it } from "vitest";

import { getMotionMode, hoverLiftVariants, revealVariants, staggerContainerVariants } from "./motion";

describe("motion helpers", () => {
  it("resolves reduced mode from root attribute", () => {
    document.documentElement.setAttribute("data-motion", "reduced");
    expect(getMotionMode()).toBe("reduced");
  });

  it("falls back to default mode when motion attribute is absent", () => {
    document.documentElement.removeAttribute("data-motion");
    expect(getMotionMode()).toBe("default");
  });

  it("returns deterministic reduced-motion variants", () => {
    const reveal = revealVariants("reduced");
    const stagger = staggerContainerVariants("reduced");
    const hover = hoverLiftVariants("reduced");

    expect(reveal.hidden).toMatchObject({ opacity: 1, y: 0 });
    expect(reveal.visible).toMatchObject({ opacity: 1, y: 0 });
    expect(stagger.visible).toMatchObject({
      transition: { delayChildren: 0, staggerChildren: 0 }
    });
    expect(hover.rest).toMatchObject({ y: 0 });
    expect(hover.hover).toMatchObject({ y: 0 });
  });
});
