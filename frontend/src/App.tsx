import { useEffect, useState } from "react";

import { appConfig, type AppRouteName } from "@/config/app-config";
import { SiteShell } from "@/components/layout/site-shell";
import { DesignPage } from "@/pages/design-page";
import { LandingPage } from "@/pages/landing-page";
import { NotFoundPage } from "@/pages/not-found-page";
import { PrivacyPage } from "@/pages/privacy-page";
import { VisionPage } from "@/pages/vision-page";
import { PartnerConfirmPage } from "@/pages/partner-confirm-page";
import { WaitlistConfirmPage } from "@/pages/waitlist-confirm-page";
import { LoginPage } from "@/pages/login-page";
import { AdminPage } from "@/pages/admin-page";

function resolveRoute(pathname: string): AppRouteName {
  if (pathname === "/vision" || pathname === appConfig.routes.vision) {
    return "vision";
  }
  if (pathname === "/privacy" || pathname === appConfig.routes.privacy) {
    return "privacy";
  }
  if (
    pathname === appConfig.routes.waitlistConfirm ||
    pathname === `${appConfig.routes.waitlistConfirm}/` ||
    pathname === `${appConfig.routes.waitlistConfirm}.html` ||
    pathname === "/waitlist/confirm/index.html"
  ) {
    return "waitlist-confirm";
  }
  if (
    pathname === appConfig.routes.partnerConfirm ||
    pathname === `${appConfig.routes.partnerConfirm}/` ||
    pathname === `${appConfig.routes.partnerConfirm}.html` ||
    pathname === "/partner/confirm/index.html"
  ) {
    return "partner-confirm";
  }
  if (pathname === "/design" || pathname === appConfig.routes.design) {
    return appConfig.features.designPage ? "design" : "not-found";
  }
  if (pathname === appConfig.routes.login) {
    return "login";
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
    if (route === "vision") {
      document.title = "Glød - Vision";
      return;
    }
    if (route === "privacy") {
      document.title = "Glød - Persondatapolitik";
      return;
    }
    if (route === "waitlist-confirm") {
      document.title = "Glød - Bekræft tilmelding";
      return;
    }
    if (route === "partner-confirm") {
      document.title = "Glød - Bekræft samarbejde";
      return;
    }
    if (route === "design") {
      document.title = "Glød - Design System";
      return;
    }
    if (route === "login") {
      document.title = "Glød - Log ind";
      return;
    }
    if (route === "admin") {
      document.title = "Glød - Admin";
      return;
    }
    if (route === "not-found") {
      document.title = "Glød - Side ikke fundet";
      return;
    }
    document.title = "Glød";
  }, [route]);

  return (
    <SiteShell showDesignLink={appConfig.features.designPage} themePreset={appConfig.themePreset}>
      {route === "vision" && <VisionPage />}
      {route === "privacy" && <PrivacyPage />}
      {route === "waitlist-confirm" && <WaitlistConfirmPage />}
      {route === "partner-confirm" && <PartnerConfirmPage />}
      {route === "login" && <LoginPage />}
      {route === "admin" && <AdminPage />}
      {route === "design" && <DesignPage />}
      {route === "not-found" && <NotFoundPage />}
      {route === "landing" && <LandingPage />}
    </SiteShell>
  );
}
