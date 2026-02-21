import { ReactNode } from "react";
import { motion } from "motion/react";

import { appConfig, type ThemePreset } from "@/config/app-config";
import { getMotionMode, hoverLiftVariants, revealVariants, staggerContainerVariants } from "@/lib/motion";

type SiteShellProps = {
  children: ReactNode;
  showDesignLink?: boolean;
  themePreset: ThemePreset;
};

export function SiteShell({ children, showDesignLink = false, themePreset }: SiteShellProps) {
  const motionMode = getMotionMode();
  const hoverVariants = hoverLiftVariants(motionMode);
  const navItemVariants = { ...revealVariants(motionMode, "item"), ...hoverVariants };

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
            >
              Glød
            </a>

            <motion.nav
              className="header-primary-nav"
              data-testid="header-primary-nav"
              initial="hidden"
              animate="visible"
              variants={staggerContainerVariants(motionMode, "item")}
            >
              <motion.a
                href={appConfig.routes.vision}
                className="glass-pill hover-glow partner-pill rounded-full px-4 py-1 text-xs tracking-wider"
                variants={navItemVariants}
                initial="hidden"
                animate="visible"
                whileHover="hover"
                whileTap="hover"
                aria-label="Vision"
              >
                Vision
              </motion.a>
              <motion.a
                href={appConfig.routes.privacy}
                className="glass-pill hover-glow partner-pill rounded-full px-4 py-1 text-xs tracking-wider"
                variants={navItemVariants}
                initial="hidden"
                animate="visible"
                whileHover="hover"
                whileTap="hover"
                aria-label="Privatliv"
              >
                Privatliv
              </motion.a>
              <motion.a
                href={appConfig.routes.login}
                className="glass-pill hover-glow partner-pill rounded-full px-4 py-1 text-xs tracking-wider"
                variants={navItemVariants}
                initial="hidden"
                animate="visible"
                whileHover="hover"
                whileTap="hover"
                aria-label="Log ind"
              >
                Log ind
              </motion.a>
              {showDesignLink && (
                <motion.a
                  href={appConfig.routes.design}
                  className="glass-pill hover-glow partner-pill rounded-full px-4 py-1 text-xs tracking-wider"
                  variants={navItemVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover="hover"
                  whileTap="hover"
                  aria-label="Design"
                >
                  Design
                </motion.a>
              )}
            </motion.nav>
          </div>

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
              variants={hoverVariants}
              initial="rest"
              animate="rest"
              whileHover="hover"
              whileTap="hover"
            >
              I samarbejde med Dansk Sexologisk Akademi
            </motion.a>
          </motion.div>
        </div>
      </motion.header>

      {children}
    </main>
  );
}
