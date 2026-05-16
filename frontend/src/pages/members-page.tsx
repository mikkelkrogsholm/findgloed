import { useEffect, useState } from "react";
import { motion } from "motion/react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { SkeletonGrid } from "@/components/layout/loading-state";
import { appConfig } from "@/config/app-config";
import { api, type MembersResponse } from "@/lib/api";
import { getMotionMode, revealVariants } from "@/lib/motion";
import { navigate } from "@/lib/nav";

export function MembersPage() {
  const [data, setData] = useState<MembersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const motionMode = getMotionMode();

  useEffect(() => {
    let active = true;
    api.listMembers().then((result) => {
      if (!active) return;
      if (!result.ok) {
        setError(
          result.code === "VERIFICATION_REQUIRED"
            ? "Du skal være verificeret for at se medlemmer."
            : "Kunne ikke hente medlemmer."
        );
      } else {
        setData(result);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    // A22: Skeleton-grid matcher final-state så vi undgår layout-shift.
    return (
      <section className="mx-auto w-full max-w-5xl px-6 py-10 md:py-16">
        <PageHeader kicker="Medlemmer" title="Verificerede mennesker" />
        <SkeletonGrid variant="members" count={6} data-testid="members-loading" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto w-full max-w-md px-6 py-20">
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => navigate(appConfig.routes.profile)}>Til profil</Button>
          <Button variant="ghost" onClick={() => navigate(appConfig.routes.verification)}>
            Verificering
          </Button>
        </div>
      </section>
    );
  }

  if (!data || data.members.length === 0) {
    return (
      <section className="mx-auto w-full max-w-3xl px-6 py-20 text-center">
        <p className="body-text-muted">
          Ingen verificerede medlemmer endnu. Kig forbi igen om kort tid.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-10 md:py-16">
      <motion.div initial="hidden" animate="visible" variants={revealVariants(motionMode, "hero")}>
        <PageHeader
          kicker="Medlemmer"
          title="Verificerede mennesker"
          actions={
            <p className="text-sm text-[color:var(--color-text-secondary)]">
              {data.members.length} medlemmer
            </p>
          }
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.members.map((member) => {
            const facePhoto = member.photos.find(
              (p) => p.kind === "face" && member.can_see_face
            );
            const ambient = member.photos.find((p) => p.kind === "ambient");
            const cover = facePhoto ?? ambient ?? member.photos[0] ?? null;
            const memberHref = `${appConfig.routes.members}/${member.user_id}`;
            const memberLabel = member.display_name ?? "Medlem";
            // B23: Meningsfuld alt-tekst — face=display_name, ambient="Stemningsbillede".
            const coverAlt = cover
              ? cover.kind === "face"
                ? memberLabel
                : "Stemningsbillede"
              : "";
            return (
              // A20: Hele kortet er en <a> så Enter/Space virker uden ekstra
              // tastatur-handler; fokus-ring vises ved tastatur-fokus.
              <Card
                key={member.user_id}
                className="overflow-hidden p-0 transition-transform hover:scale-[1.01] focus-within:ring-2 focus-within:ring-[color:var(--color-link)] focus-within:ring-offset-2 focus-within:ring-offset-[color:var(--color-bg-base)]"
              >
                <a
                  href={memberHref}
                  onClick={(event) => {
                    // Tillad ctrl/cmd-klik at åbne i ny fane som normal <a>.
                    if (
                      event.defaultPrevented ||
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.button !== 0
                    ) {
                      return;
                    }
                    event.preventDefault();
                    navigate(memberHref);
                  }}
                  className="block focus:outline-none"
                  aria-label={`Se profil for ${memberLabel}`}
                >
                  <div className="relative h-44 w-full overflow-hidden bg-[color:var(--surface-glass)]">
                    {cover ? (
                      <img
                        src={api.asset(cover.url)}
                        alt={coverAlt}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-[color:var(--color-text-tertiary)]">
                        Stemningsbillede mangler
                      </div>
                    )}
                    {!member.can_see_face && (
                      <Badge variant="outline" className="absolute bottom-2 left-2 bg-black/50">
                        Ansigt vises efter interesse
                      </Badge>
                    )}
                  </div>
                  <CardContent className="space-y-2 p-5">
                    <div className="flex items-baseline justify-between">
                      <p className="font-display text-lg">{memberLabel}</p>
                      <p className="text-xs text-[color:var(--color-text-tertiary)]">
                        {member.age ? `${member.age} år` : ""}
                      </p>
                    </div>
                    {member.region && (
                      <p className="text-xs text-[color:var(--color-text-secondary)]">
                        {member.region}
                      </p>
                    )}
                    {member.bio && (
                      <p className="line-clamp-3 text-sm text-[color:var(--color-text-secondary)]">
                        {member.bio}
                      </p>
                    )}
                  </CardContent>
                </a>
              </Card>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
