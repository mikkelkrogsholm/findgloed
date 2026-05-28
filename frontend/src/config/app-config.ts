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
    terms: "/terms",
    codeOfConduct: "/code-of-conduct",
    waitlistConfirm: "/waitlist/confirm",
    partnerConfirm: "/partner/confirm",
    login: "/login",
    signup: "/signup",
    onboarding: "/onboarding",
    verification: "/onboarding/verification",
    profile: "/profile",
    coupleProfile: "/profile/couple",
    members: "/members",
    member: "/members/:id",
    incomingInterests: "/interests/incoming",
    events: "/events",
    event: "/events/:slug",
    myEvents: "/me/events",
    messages: "/messages",
    conversation: "/messages/:id",
    membership: "/membership",
    admin: "/admin",
    adminEvents: "/admin/events",
    adminVerifications: "/admin/verifications",
    adminReports: "/admin/reports",
    adminSettings: "/admin/settings",
    adminUsers: "/admin/users",
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
  | "terms"
  | "code-of-conduct"
  | "waitlist-confirm"
  | "partner-confirm"
  | "login"
  | "signup"
  | "onboarding"
  | "verification"
  | "profile"
  | "couple-profile"
  | "members"
  | "member-detail"
  | "incoming-interests"
  | "events"
  | "event-detail"
  | "my-events"
  | "messages"
  | "conversation"
  | "membership"
  | "admin"
  | "admin-events"
  | "admin-verifications"
  | "admin-reports"
  | "admin-settings"
  | "admin-users"
  | "design"
  | "not-found";

export { resolveThemePreset };
