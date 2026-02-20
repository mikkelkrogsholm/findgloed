import type { Transition, Variants } from "framer-motion";

export type MotionMode = "default" | "reduced";
export type RevealPreset = "hero" | "section" | "item" | "shell";

const MOTION_SECONDS = {
  fast: 0.18,
  base: 0.32,
  slow: 0.5,
  sensual: 0.7
} as const;

const EASING = {
  standard: [0.2, 0.74, 0.24, 1] as [number, number, number, number],
  glod: [0.32, 0, 0.18, 1] as [number, number, number, number]
} as const;

function noMotionTransition(): Transition {
  return { duration: 0 };
}

function revealConfig(preset: RevealPreset): { distance: number; duration: number } {
  if (preset === "hero") {
    return { distance: 22, duration: MOTION_SECONDS.sensual };
  }
  if (preset === "item") {
    return { distance: 10, duration: MOTION_SECONDS.base };
  }
  if (preset === "shell") {
    return { distance: 14, duration: MOTION_SECONDS.slow };
  }
  return { distance: 16, duration: MOTION_SECONDS.slow };
}

export function getMotionMode(root?: HTMLElement): MotionMode {
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return "reduced";
    }
  }

  const target = root ?? (typeof document !== "undefined" ? document.documentElement : undefined);
  if (!target) {
    return "default";
  }
  return target.getAttribute("data-motion") === "reduced" ? "reduced" : "default";
}

export function revealVariants(mode: MotionMode, preset: RevealPreset = "section"): Variants {
  if (mode === "reduced") {
    return {
      hidden: { opacity: 1, y: 0, filter: "blur(0px)" },
      visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: noMotionTransition() }
    };
  }

  const config = revealConfig(preset);
  return {
    hidden: { opacity: 0, y: config.distance, filter: "blur(4px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        duration: config.duration,
        ease: EASING.glod
      }
    }
  };
}

export function staggerContainerVariants(mode: MotionMode, preset: RevealPreset = "section"): Variants {
  if (mode === "reduced") {
    return {
      hidden: {},
      visible: { transition: { delayChildren: 0, staggerChildren: 0 } }
    };
  }

  const isHero = preset === "hero";
  return {
    hidden: {},
    visible: {
      transition: {
        delayChildren: isHero ? 0.08 : 0.04,
        staggerChildren: isHero ? 0.12 : 0.08
      }
    }
  };
}

export function hoverLiftVariants(mode: MotionMode): Variants {
  if (mode === "reduced") {
    return {
      rest: { y: 0, scale: 1 },
      hover: { y: 0, scale: 1, transition: noMotionTransition() }
    };
  }

  return {
    rest: { y: 0, scale: 1 },
    hover: {
      y: -3,
      scale: 1.01,
      transition: {
        duration: MOTION_SECONDS.fast,
        ease: EASING.standard
      }
    }
  };
}
