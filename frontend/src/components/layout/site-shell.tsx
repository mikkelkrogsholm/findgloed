import { ReactNode, useEffect, useState } from "react";
import { motion } from "motion/react";

import { appConfig, type ThemePreset } from "@/config/app-config";
import { NavLink } from "@/components/layout/nav-link";
import { authClient } from "@/lib/auth-client";
import { clearSession, useSession } from "@/lib/use-session";
import {
  getMotionMode,
  hoverLiftVariants,
  revealVariants,
  staggerContainerVariants
} from "@/lib/motion";
import { navigate } from "@/lib/nav";

type SiteShellProps = {
  children: ReactNode;
  showDesignLink?: boolean;
  themePreset: ThemePreset;
};

const MEMBER_NAV: Array<{ href: string; label: string; verifiedOnly?: boolean }> = [
  { href: appConfig.routes.profile, label: "Profil" },
  { href: appConfig.routes.members, label: "Medlemmer", verifiedOnly: true },
  { href: appConfig.routes.events, label: "Events", verifiedOnly: true },
  { href: appConfig.routes.messages, label: "Beskeder", verifiedOnly: true },
  { href: appConfig.routes.membership, label: "Medlemskab" }
];

function isCurrent(pathname: string, href: string): boolean {
  if (href === appConfig.routes.landing) {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteShell({ children, showDesignLink = false, themePreset }: SiteShellProps) {
  const motionMode = getMotionMode();
  const session = useSession();
  const [pathname, setPathname] = useState<string>(() =>
    typeof window === "undefined" ? "/" : window.location.pathname
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  // Luk mobile-menu ved route-skift
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    await authClient.signOut();
    clearSession();
    navigate(appConfig.routes.landing);
  }

  const isAuthenticated = session.status === "authenticated";
  const isVerified = isAuthenticated && session.profile.verification_status === "verified";
  const isAdmin = isAuthenticated && session.profile.role === "admin";
  const isOrganizer =
    isAuthenticated &&
    (session.profile.role === "organizer" || session.profile.role === "admin");
  const hasAcceptedFutureVerification =
    isAuthenticated && session.profile.future_verification_accepted_at !== null;
  const isTemporaryVerified =
    isAuthenticated && session.profile.verified_via === "temporary";

  const memberLinks = MEMBER_NAV.filter((link) => !link.verifiedOnly || isVerified);

  return (
    <main className="background-grain font-context theme-page" data-theme={themePreset}>
      <div className="theme-orb-a" />
      <div className="theme-orb-b" />
      <div className="theme-orb-c" />

      <motion.header
        className="theme-header sticky top-0 z-10"
        data-testid="site-header"
        initial="hidden"
        animate="visible"
        variants={revealVariants(motionMode, "shell")}
      >
        <div className="mx-auto grid w-full max-w-6xl gap-3 px-6 py-4">
          <div className="header-primary-row">
            <a
              href={appConfig.routes.landing}
              className="noxus-title brand-mark text-2xl font-semibold md:text-3xl"
              data-testid="header-brand"
              onClick={(event) => {
                event.preventDefault();
                navigate(appConfig.routes.landing);
              }}
            >
              Glød
            </a>

            {/* Desktop-nav */}
            <motion.nav
              className="header-primary-nav hidden md:flex"
              data-testid="header-primary-nav"
              initial="hidden"
              animate="visible"
              variants={staggerContainerVariants(motionMode, "item")}
            >
              {isAuthenticated ? (
                <>
                  {memberLinks.map((link) => (
                    <NavLink
                      key={link.href}
                      href={link.href}
                      label={link.label}
                      active={isCurrent(pathname, link.href)}
                    />
                  ))}
                  {isOrganizer && (
                    <NavLink
                      href={appConfig.routes.organizer}
                      label="Organisationer"
                      active={isCurrent(pathname, appConfig.routes.organizer)}
                    />
                  )}
                  {isAdmin && (
                    <NavLink
                      href={appConfig.routes.admin}
                      label="Admin"
                      active={isCurrent(pathname, appConfig.routes.admin)}
                    />
                  )}
                  <motion.button
                    type="button"
                    onClick={handleSignOut}
                    className="glass-pill hover-glow partner-pill rounded-full px-4 py-1 text-xs tracking-wider"
                    variants={hoverLiftVariants(motionMode)}
                    initial="rest"
                    animate="rest"
                    whileHover="hover"
                    whileTap="hover"
                  >
                    Log ud
                  </motion.button>
                </>
              ) : (
                <>
                  <NavLink
                    href={appConfig.routes.vision}
                    label="Vision"
                    active={isCurrent(pathname, appConfig.routes.vision)}
                  />
                  <NavLink
                    href={appConfig.routes.codeOfConduct}
                    label="Code of conduct"
                    active={isCurrent(pathname, appConfig.routes.codeOfConduct)}
                  />
                  <NavLink
                    href={appConfig.routes.privacy}
                    label="Privatliv"
                    active={isCurrent(pathname, appConfig.routes.privacy)}
                  />
                  <NavLink
                    href={appConfig.routes.login}
                    label="Log ind"
                    active={isCurrent(pathname, appConfig.routes.login)}
                  />
                  <NavLink
                    href={appConfig.routes.signup}
                    label="Bliv medlem"
                    variant="primary"
                    active={isCurrent(pathname, appConfig.routes.signup)}
                  />
                  {showDesignLink && (
                    <NavLink
                      href={appConfig.routes.design}
                      label="Design"
                      active={isCurrent(pathname, appConfig.routes.design)}
                    />
                  )}
                </>
              )}
            </motion.nav>

            {/* Mobile burger */}
            <button
              type="button"
              className="glass-pill hover-glow partner-pill md:hidden inline-flex items-center justify-center min-h-11 min-w-11 rounded-full px-4 text-xs tracking-wider"
              aria-label={mobileOpen ? "Luk menu" : "Åbn menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((prev) => !prev)}
            >
              {mobileOpen ? "Luk" : "Menu"}
            </button>
          </div>

          {/* Mobile-nav (under burger) */}
          {mobileOpen && (
            <motion.nav
              className="flex flex-col gap-2 pt-2 md:hidden"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              data-testid="header-mobile-nav"
            >
              {isAuthenticated ? (
                <>
                  {memberLinks.map((link) => (
                    <NavLink
                      key={link.href}
                      href={link.href}
                      label={link.label}
                      active={isCurrent(pathname, link.href)}
                    />
                  ))}
                  {isOrganizer && (
                    <NavLink
                      href={appConfig.routes.organizer}
                      label="Organisationer"
                      active={isCurrent(pathname, appConfig.routes.organizer)}
                    />
                  )}
                  {isAdmin && (
                    <NavLink
                      href={appConfig.routes.admin}
                      label="Admin"
                      active={isCurrent(pathname, appConfig.routes.admin)}
                    />
                  )}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="glass-pill hover-glow partner-pill rounded-full px-4 py-1 text-xs tracking-wider"
                  >
                    Log ud
                  </button>
                </>
              ) : (
                <>
                  <NavLink href={appConfig.routes.vision} label="Vision" />
                  <NavLink href={appConfig.routes.codeOfConduct} label="Code of conduct" />
                  <NavLink href={appConfig.routes.privacy} label="Privatliv" />
                  <NavLink href={appConfig.routes.login} label="Log ind" />
                  <NavLink
                    href={appConfig.routes.signup}
                    label="Bliv medlem"
                    variant="primary"
                  />
                  {showDesignLink && (
                    <NavLink href={appConfig.routes.design} label="Design" />
                  )}
                </>
              )}
            </motion.nav>
          )}

          {/* Partner-pill — kun synlig for ikke-loggede så medlemmer får mindre footer */}
          {!isAuthenticated && (
            <motion.div
              className="header-partner-group"
              data-testid="header-partner-group"
              variants={revealVariants(motionMode, "item")}
            >
              <motion.a
                href="https://www.dksa.dk/"
                target="_blank"
                rel="noopener noreferrer"
                className="glass-pill hover-glow partner-pill header-partner-pill rounded-full px-4 py-1 text-[0.66rem] uppercase tracking-wider"
                variants={hoverLiftVariants(motionMode)}
                initial="rest"
                animate="rest"
                whileHover="hover"
                whileTap="hover"
              >
                I samarbejde med Dansk Sexologisk Akademi
              </motion.a>
            </motion.div>
          )}

          {/* Reminder hvis bruger er midlertidigt verificeret men ikke har
              accepteret at gennemgå rigtig MitID-verificering senere. */}
          {isAuthenticated && isTemporaryVerified && !hasAcceptedFutureVerification && (
            <div className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] px-4 py-2 text-xs text-[color:var(--color-text-secondary)]">
              Du er midlertidigt verificeret. Bekræft{" "}
              <button
                type="button"
                className="link-inline"
                onClick={() => navigate(appConfig.routes.verification)}
              >
                samtykke til fremtidig MitID-verificering
              </button>
              .
            </div>
          )}
        </div>
      </motion.header>

      {children}

      {!isFocusedRoute(pathname) && (
        <footer
          className="mx-auto w-full max-w-6xl px-6 py-8 text-xs text-[color:var(--color-text-tertiary)]"
          data-testid="site-footer"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--border-subtle)] pt-6">
            <p>© Glød {new Date().getFullYear()}</p>
            <nav
              aria-label="Sidefod"
              className="flex flex-wrap gap-x-4 gap-y-2"
              data-testid="site-footer-nav"
            >
              <a
                href={appConfig.routes.privacy}
                className="link-inline"
                onClick={(event) => {
                  event.preventDefault();
                  navigate(appConfig.routes.privacy);
                }}
              >
                Privatliv
              </a>
              <a
                href={appConfig.routes.terms}
                className="link-inline"
                onClick={(event) => {
                  event.preventDefault();
                  navigate(appConfig.routes.terms);
                }}
              >
                Vilkår
              </a>
              <a
                href={appConfig.routes.codeOfConduct}
                className="link-inline"
                onClick={(event) => {
                  event.preventDefault();
                  navigate(appConfig.routes.codeOfConduct);
                }}
              >
                Code of conduct
              </a>
              <a href="mailto:mikkel@findgloed.dk" className="link-inline">
                Kontakt
              </a>
            </nav>
          </div>
        </footer>
      )}
    </main>
  );
}

function isFocusedRoute(pathname: string): boolean {
  // Skjul footer i fokuserede flows hvor den vil skygge for indhold
  if (pathname.startsWith(`${appConfig.routes.messages}/`)) {
    return true;
  }
  return false;
}
