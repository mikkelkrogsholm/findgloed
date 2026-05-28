import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { appConfig, type AppRouteName } from "@/config/app-config";
import { SiteShell } from "@/components/layout/site-shell";
import { PwaUpdatePrompt } from "@/components/pwa-update-prompt";
import { DesignPage } from "@/pages/design-page";
import { LandingPage } from "@/pages/landing-page";
import { NotFoundPage } from "@/pages/not-found-page";
import { PrivacyPage } from "@/pages/privacy-page";
import { TermsPage } from "@/pages/terms-page";
import { CodeOfConductPage } from "@/pages/code-of-conduct-page";
import { VisionPage } from "@/pages/vision-page";
import { PartnerConfirmPage } from "@/pages/partner-confirm-page";
import { WaitlistConfirmPage } from "@/pages/waitlist-confirm-page";
import { LoginPage } from "@/pages/login-page";
import { SignupPage } from "@/pages/signup-page";
import { OnboardingPage } from "@/pages/onboarding-page";
import { VerificationPage } from "@/pages/verification-page";
import { ProfilePage } from "@/pages/profile-page";
import { CoupleProfilePage } from "@/pages/couple-profile-page";
import { MembersPage } from "@/pages/members-page";
import { MemberDetailPage } from "@/pages/member-detail-page";
import { IncomingInterestsPage } from "@/pages/incoming-interests-page";
import { EventsPage } from "@/pages/events-page";
import { EventDetailPage } from "@/pages/event-detail-page";
import { MyEventsPage } from "@/pages/my-events-page";
import { MessagesPage } from "@/pages/messages-page";
import { ConversationPage } from "@/pages/conversation-page";
import { MembershipPage } from "@/pages/membership-page";
import { OrganizationsPage } from "@/pages/organizations-page";
import { OrganizationPage } from "@/pages/organization-page";
import { OrganizerPage } from "@/pages/organizer-page";
import { OrganizerOrgPage } from "@/pages/organizer-org-page";
import { AdminEventsPage } from "@/pages/admin-events-page";
import { AdminPage } from "@/pages/admin-page";
import { AdminReportsPage } from "@/pages/admin-reports-page";
import { AdminSettingsPage } from "@/pages/admin-settings-page";
import { AdminUsersPage } from "@/pages/admin-users-page";
import { AdminVerificationsPage } from "@/pages/admin-verifications-page";
import { getMotionMode, pageTransitionVariants } from "@/lib/motion";

function resolveRoute(pathname: string): AppRouteName {
  if (pathname === appConfig.routes.vision) {
    return "vision";
  }
  if (pathname === appConfig.routes.privacy) {
    return "privacy";
  }
  if (pathname === appConfig.routes.terms) {
    return "terms";
  }
  if (pathname === appConfig.routes.codeOfConduct) {
    return "code-of-conduct";
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
  if (pathname === appConfig.routes.coupleProfile) {
    return "couple-profile";
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
  if (pathname === appConfig.routes.incomingInterests) {
    return "incoming-interests";
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
  if (pathname === appConfig.routes.organizations) {
    return "organizations";
  }
  if (pathname.startsWith(`${appConfig.routes.organizations}/`)) {
    return "organization-detail";
  }
  if (pathname === appConfig.routes.organizer) {
    return "organizer";
  }
  if (pathname.startsWith(`${appConfig.routes.organizer}/`)) {
    return "organizer-org";
  }
  if (pathname === appConfig.routes.adminEvents) {
    return "admin-events";
  }
  if (pathname === appConfig.routes.adminVerifications) {
    return "admin-verifications";
  }
  if (pathname === appConfig.routes.adminReports) {
    return "admin-reports";
  }
  if (pathname === appConfig.routes.adminSettings) {
    return "admin-settings";
  }
  if (pathname === appConfig.routes.adminUsers) {
    return "admin-users";
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
      terms: "Glød - Handelsbetingelser",
      "code-of-conduct": "Glød - Code of conduct",
      "waitlist-confirm": "Glød - Bekræft tilmelding",
      "partner-confirm": "Glød - Bekræft samarbejde",
      design: "Glød - Design System",
      login: "Glød - Log ind",
      signup: "Glød - Opret medlemskab",
      onboarding: "Glød - Profil",
      verification: "Glød - Verificering",
      profile: "Glød - Min profil",
      "couple-profile": "Glød - Par-profil",
      members: "Glød - Medlemmer",
      "member-detail": "Glød - Medlemsprofil",
      "incoming-interests": "Glød - Indkomne interesser",
      events: "Glød - Events",
      "event-detail": "Glød - Event",
      "my-events": "Glød - Mine tilmeldinger",
      messages: "Glød - Beskeder",
      conversation: "Glød - Samtale",
      membership: "Glød - Medlemskab",
      organizations: "Glød - Arrangører",
      "organization-detail": "Glød - Arrangør",
      organizer: "Glød - Organisationer",
      "organizer-org": "Glød - Organisation",
      "admin-events": "Glød - Admin events",
      "admin-verifications": "Glød - Admin verifikationer",
      "admin-reports": "Glød - Admin anmeldelser",
      "admin-settings": "Glød - Admin indstillinger",
      "admin-users": "Glød - Admin brugere",
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
          {route === "terms" && <TermsPage />}
          {route === "code-of-conduct" && <CodeOfConductPage />}
          {route === "waitlist-confirm" && <WaitlistConfirmPage />}
          {route === "partner-confirm" && <PartnerConfirmPage />}
          {route === "login" && <LoginPage />}
          {route === "signup" && <SignupPage />}
          {route === "onboarding" && <OnboardingPage />}
          {route === "verification" && <VerificationPage />}
          {route === "profile" && <ProfilePage />}
          {route === "couple-profile" && <CoupleProfilePage />}
          {route === "members" && <MembersPage />}
          {route === "member-detail" && <MemberDetailPage />}
          {route === "incoming-interests" && <IncomingInterestsPage />}
          {route === "events" && <EventsPage />}
          {route === "event-detail" && <EventDetailPage />}
          {route === "my-events" && <MyEventsPage />}
          {route === "messages" && <MessagesPage />}
          {route === "conversation" && <ConversationPage />}
          {route === "membership" && <MembershipPage />}
          {route === "organizations" && <OrganizationsPage />}
          {route === "organization-detail" && <OrganizationPage />}
          {route === "organizer" && <OrganizerPage />}
          {route === "organizer-org" && <OrganizerOrgPage />}
          {route === "admin-events" && <AdminEventsPage />}
          {route === "admin-verifications" && <AdminVerificationsPage />}
          {route === "admin-reports" && <AdminReportsPage />}
          {route === "admin-settings" && <AdminSettingsPage />}
          {route === "admin-users" && <AdminUsersPage />}
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
