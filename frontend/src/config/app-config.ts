export type ThemePreset = "legacy" | "anthro-v1";

function resolveThemePreset(rawValue: string | undefined): ThemePreset {
  if (rawValue === "legacy") {
    return "legacy";
  }

  return "anthro-v1";
}

export const appConfig = {
  routes: {
    landing: "/",
    vision: "/vision.html",
    privacy: "/privacy.html",
    waitlistConfirm: "/waitlist/confirm",
    partnerConfirm: "/partner/confirm",
    login: "/login",
    admin: "/admin",
    design: "/design.html"
  },
  features: {
    designPage: import.meta.env.VITE_ENABLE_DESIGN_PAGE === "true"
  },
  themePreset: resolveThemePreset(import.meta.env.VITE_THEME_PRESET)
} as const;

export type AppRouteName =
  | "landing"
  | "vision"
  | "privacy"
  | "waitlist-confirm"
  | "partner-confirm"
  | "login"
  | "admin"
  | "design"
  | "not-found";

export { resolveThemePreset };
