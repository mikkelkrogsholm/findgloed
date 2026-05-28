import { useEffect, useState } from "react";
import { motion } from "motion/react";

import { appConfig } from "@/config/app-config";
import { NavLink } from "@/components/layout/nav-link";
import { getMotionMode, staggerContainerVariants } from "@/lib/motion";

// B8: Konsistent sub-nav på alle admin-sider så admin altid kan navigere
// mellem leads/events/verifikationer/reports uden at jagte knapper i
// hovedet af hver side.
const ADMIN_LINKS = [
  { href: appConfig.routes.admin, label: "Leads" },
  { href: appConfig.routes.adminEvents, label: "Events" },
  { href: appConfig.routes.adminVerifications, label: "Verifikationer" },
  { href: appConfig.routes.adminReports, label: "Reports" },
  { href: appConfig.routes.adminUsers, label: "Brugere" },
  { href: appConfig.routes.adminSettings, label: "Indstillinger" }
] as const;

function isCurrent(pathname: string, href: string): boolean {
  if (href === appConfig.routes.admin) {
    // Eksakt match — ellers ville `/admin/events` også markere "Leads" som
    // aktiv (alle admin-routes starter med `/admin`).
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSubnav() {
  const motionMode = getMotionMode();
  const [pathname, setPathname] = useState<string>(() =>
    typeof window === "undefined" ? "/admin" : window.location.pathname
  );

  useEffect(() => {
    const handler = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  return (
    <motion.nav
      aria-label="Admin-navigation"
      data-testid="admin-subnav"
      className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] p-2"
      initial="hidden"
      animate="visible"
      variants={staggerContainerVariants(motionMode, "item")}
    >
      {ADMIN_LINKS.map((link) => (
        <NavLink
          key={link.href}
          href={link.href}
          label={link.label}
          active={isCurrent(pathname, link.href)}
        />
      ))}
    </motion.nav>
  );
}
