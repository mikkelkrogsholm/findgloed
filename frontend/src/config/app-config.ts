export const appConfig = {
  routes: {
    landing: "/",
    privacy: "/privacy.html",
    waitlistConfirm: "/waitlist/confirm",
    design: "/design.html"
  },
  features: {
    designPage: import.meta.env.VITE_ENABLE_DESIGN_PAGE === "true"
  }
} as const;

export type AppRouteName = "landing" | "privacy" | "waitlist-confirm" | "design" | "not-found";
