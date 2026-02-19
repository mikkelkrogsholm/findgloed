import { ReactNode } from "react";

import { appConfig, type ThemePreset } from "@/config/app-config";

type SiteShellProps = {
  children: ReactNode;
  showDesignLink?: boolean;
  themePreset: ThemePreset;
};

export function SiteShell({ children, showDesignLink = false, themePreset }: SiteShellProps) {
  return (
    <main className="background-grain font-context theme-page" data-theme={themePreset}>
      <div className="theme-orb-a" />
      <div className="theme-orb-b" />
      <div className="theme-orb-c" />

      <header className="theme-header sticky top-0 z-10">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <a href={appConfig.routes.landing} className="noxus-title brand-mark text-2xl font-semibold md:text-3xl">
            Glød
          </a>

          <div className="flex items-center gap-2">
            <a
              href={appConfig.routes.vision}
              className="glass-pill hover-glow partner-pill rounded-full px-4 py-1 text-xs tracking-wider"
            >
              Vision
            </a>
            <a
              href={appConfig.routes.privacy}
              className="glass-pill hover-glow partner-pill rounded-full px-4 py-1 text-xs tracking-wider"
            >
              Privatliv
            </a>
            {showDesignLink && (
              <a
                href={appConfig.routes.design}
                className="glass-pill hover-glow partner-pill rounded-full px-4 py-1 text-xs tracking-wider"
              >
                Design
              </a>
            )}
            <a
              href="https://www.dksa.dk/"
              target="_blank"
              rel="noopener noreferrer"
              className="glass-pill hover-glow partner-pill rounded-full px-4 py-1 text-[0.66rem] uppercase tracking-wider"
            >
              I samarbejde med Dansk Sexologisk Akademi
            </a>
          </div>
        </div>
      </header>

      {children}
    </main>
  );
}
