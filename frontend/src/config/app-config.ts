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
    vision: "/vision",
    privacy: "/privacy",
    waitlistConfirm: "/waitlist/confirm",
    partnerConfirm: "/partner/confirm",
    login: "/login",
    signup: "/signup",
    onboarding: "/onboarding",
    verification: "/onboarding/verification",
    profile: "/profile",
    members: "/members",
    member: "/members/:id",
    events: "/events",
    event: "/events/:slug",
    myEvents: "/me/events",
    messages: "/messages",
    conversation: "/messages/:id",
    admin: "/admin",
    adminEvents: "/admin/events",
    design: "/design"
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
  | "signup"
  | "onboarding"
  | "verification"
  | "profile"
  | "members"
  | "member-detail"
  | "events"
  | "event-detail"
  | "my-events"
  | "messages"
  | "conversation"
  | "admin"
  | "admin-events"
  | "design"
  | "not-found";

export { resolveThemePreset };
