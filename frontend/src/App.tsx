import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { appConfig, type AppRouteName } from "@/config/app-config";
import { SiteShell } from "@/components/layout/site-shell";
import { PwaUpdatePrompt } from "@/components/pwa-update-prompt";
import { DesignPage } from "@/pages/design-page";
import { LandingPage } from "@/pages/landing-page";
import { NotFoundPage } from "@/pages/not-found-page";
import { PrivacyPage } from "@/pages/privacy-page";
import { VisionPage } from "@/pages/vision-page";
import { PartnerConfirmPage } from "@/pages/partner-confirm-page";
import { WaitlistConfirmPage } from "@/pages/waitlist-confirm-page";
import { LoginPage } from "@/pages/login-page";
import { SignupPage } from "@/pages/signup-page";
import { OnboardingPage } from "@/pages/onboarding-page";
import { VerificationPage } from "@/pages/verification-page";
import { ProfilePage } from "@/pages/profile-page";
import { MembersPage } from "@/pages/members-page";
import { MemberDetailPage } from "@/pages/member-detail-page";
import { EventsPage } from "@/pages/events-page";
import { EventDetailPage } from "@/pages/event-detail-page";
import { MyEventsPage } from "@/pages/my-events-page";
import { MessagesPage } from "@/pages/messages-page";
import { ConversationPage } from "@/pages/conversation-page";
import { MembershipPage } from "@/pages/membership-page";
import { AdminEventsPage } from "@/pages/admin-events-page";
import { AdminPage } from "@/pages/admin-page";
import { getMotionMode, pageTransitionVariants } from "@/lib/motion";

function resolveRoute(pathname: string): AppRouteName {
  if (pathname === appConfig.routes.vision) {
    return "vision";
  }
  if (pathname === appConfig.routes.privacy) {
    return "privacy";
  }
  if (pathname === appConfig.routes.waitlistConfirm || pathname === `${appConfig.routes.waitlistConfirm}/`) {
    return "waitlist-confirm";
  }
  if (pathname === appConfig.routes.partnerConfirm || pathname === `${appConfig.routes.partnerConfirm}/`) {
    return "partner-confirm";
  }
  if (pathname === appConfig.routes.design) {
    return appConfig.features.designPage ? "design" : "not-found";
  }
  if (pathname === appConfig.routes.login) {
    return "login";
  }
  if (pathname === appConfig.routes.signup) {
    return "signup";
  }
  if (pathname === appConfig.routes.onboarding) {
    return "onboarding";
  }
  if (pathname === appConfig.routes.verification) {
    return "verification";
  }
  if (pathname === appConfig.routes.profile) {
    return "profile";
  }
  if (pathname === appConfig.routes.members) {
    return "members";
  }
  if (pathname.startsWith(`${appConfig.routes.members}/`)) {
    return "member-detail";
  }
  if (pathname === appConfig.routes.events) {
    return "events";
  }
  if (pathname === appConfig.routes.myEvents) {
    return "my-events";
  }
  if (pathname.startsWith(`${appConfig.routes.events}/`)) {
    return "event-detail";
  }
  if (pathname === appConfig.routes.messages) {
    return "messages";
  }
  if (pathname.startsWith(`${appConfig.routes.messages}/`)) {
    return "conversation";
  }
  if (pathname === appConfig.routes.membership) {
    return "membership";
  }
  if (pathname === appConfig.routes.adminEvents) {
    return "admin-events";
  }
  if (pathname === appConfig.routes.admin) {
    return "admin";
  }
  if (pathname !== appConfig.routes.landing) {
    return "not-found";
  }
  return "landing";
}

export default function App() {
  const [route, setRoute] = useState<AppRouteName>(() => resolveRoute(window.location.pathname));
  const motionMode = getMotionMode();
  const pageVariants = pageTransitionVariants(motionMode, "slideUp");

  useEffect(() => {
    const onPopState = () => {
      setRoute(resolveRoute(window.location.pathname));
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", appConfig.themePreset);

    if (typeof window.matchMedia !== "function") {
      root.setAttribute("data-motion", "default");
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyMotionPreference = () => {
      root.setAttribute("data-motion", mediaQuery.matches ? "reduced" : "default");
    };

    applyMotionPreference();
    mediaQuery.addEventListener("change", applyMotionPreference);
    return () => {
      mediaQuery.removeEventListener("change", applyMotionPreference);
    };
  }, []);

  useEffect(() => {
    const titles: Record<AppRouteName, string> = {
      landing: "Glød",
      vision: "Glød - Vision",
      privacy: "Glød - Persondatapolitik",
      "waitlist-confirm": "Glød - Bekræft tilmelding",
      "partner-confirm": "Glød - Bekræft samarbejde",
      design: "Glød - Design System",
      login: "Glød - Log ind",
      signup: "Glød - Opret medlemskab",
      onboarding: "Glød - Profil",
      verification: "Glød - Verificering",
      profile: "Glød - Min profil",
      members: "Glød - Medlemmer",
      "member-detail": "Glød - Medlemsprofil",
      events: "Glød - Events",
      "event-detail": "Glød - Event",
      "my-events": "Glød - Mine tilmeldinger",
      messages: "Glød - Beskeder",
      conversation: "Glød - Samtale",
      membership: "Glød - Medlemskab",
      "admin-events": "Glød - Admin events",
      admin: "Glød - Admin",
      "not-found": "Glød - Side ikke fundet"
    };
    document.title = titles[route] ?? "Glød";
  }, [route]);

  return (
    <SiteShell showDesignLink={appConfig.features.designPage} themePreset={appConfig.themePreset}>
      <AnimatePresence mode="wait">
        <motion.div
          key={route}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{ willChange: "transform, opacity, filter" }}
        >
          {route === "vision" && <VisionPage />}
          {route === "privacy" && <PrivacyPage />}
          {route === "waitlist-confirm" && <WaitlistConfirmPage />}
          {route === "partner-confirm" && <PartnerConfirmPage />}
          {route === "login" && <LoginPage />}
          {route === "signup" && <SignupPage />}
          {route === "onboarding" && <OnboardingPage />}
          {route === "verification" && <VerificationPage />}
          {route === "profile" && <ProfilePage />}
          {route === "members" && <MembersPage />}
          {route === "member-detail" && <MemberDetailPage />}
          {route === "events" && <EventsPage />}
          {route === "event-detail" && <EventDetailPage />}
          {route === "my-events" && <MyEventsPage />}
          {route === "messages" && <MessagesPage />}
          {route === "conversation" && <ConversationPage />}
          {route === "membership" && <MembershipPage />}
          {route === "admin-events" && <AdminEventsPage />}
          {route === "admin" && <AdminPage />}
          {route === "design" && <DesignPage />}
          {route === "not-found" && <NotFoundPage />}
          {route === "landing" && <LandingPage />}
        </motion.div>
      </AnimatePresence>
      <PwaUpdatePrompt />
    </SiteShell>
  );
}
