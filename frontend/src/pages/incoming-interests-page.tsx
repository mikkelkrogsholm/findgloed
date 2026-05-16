import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Heart, MessageCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { SkeletonGrid } from "@/components/layout/loading-state";
import { appConfig } from "@/config/app-config";
import { api, type ProfileSummary, type PhotoSummary, type InterestSignal } from "@/lib/api";
import { getMotionMode, revealVariants } from "@/lib/motion";
import { navigate } from "@/lib/nav";

type IncomingProfile = ProfileSummary & { photos: PhotoSummary[] };

// B1: Indkomne interesse-signaler. Backend understøtter
// GET /api/me/interests (returnerer { incoming, outgoing, matches }).
// Her viser vi hver afsender som et kort med kicker + ansigt-blur
// (hvis face_visibility=after_interest), så modtageren kan beslutte at
// signalere tilbage og dermed åbne en samtale. Hvis afsenderen er en
// "fully visible" person, vises deres ansigt direkte.
export function IncomingInterestsPage() {
  const [signals, setSignals] = useState<InterestSignal[]>([]);
  const [outgoingMap, setOutgoingMap] = useState<Set<string>>(new Set());
  const [profiles, setProfiles] = useState<Map<string, IncomingProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const motionMode = getMotionMode();

  async function reload() {
    setLoading(true);
    const interests = await api.listInterests();
    if (!interests.ok) {
      setError(
        interests.code === "VERIFICATION_REQUIRED"
          ? "Du skal være verificeret for at se interesse-signaler."
          : "Kunne ikke hente interesser."
      );
      setLoading(false);
      return;
    }
    setSignals(interests.incoming);
    setOutgoingMap(new Set(interests.outgoing.map((s) => s.to_user_id)));

    // Berig hver indkommen signal med profil-data så vi kan vise
    // display_name, region, age + ambient billede. Vi kalder /api/members/:id
    // for hvert signal — det er N kald, men typisk er der få indkomne.
    const profilesMap = new Map<string, IncomingProfile>();
    await Promise.all(
      interests.incoming.map(async (signal) => {
        const result = await api.getMember(signal.from_user_id);
        if (result.ok) {
          profilesMap.set(signal.from_user_id, {
            ...result.profile,
            photos: result.photos
          });
        }
      })
    );
    setProfiles(profilesMap);
    setError("");
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, []);

  async function handleSignalBack(userId: string) {
    setPendingId(userId);
    setActionMessage("");
    const result = await api.signalInterest(userId);
    setPendingId(null);
    if (!result.ok) {
      setActionMessage("Kunne ikke sende interesse tilbage.");
      return;
    }
    if (result.conversation_opened) {
      setActionMessage("Gensidig interesse — samtalen er åbnet. Find den under Beskeder.");
    } else {
      setActionMessage("Interesse sendt.");
    }
    setOutgoingMap((prev) => {
      const next = new Set(prev);
      next.add(userId);
      return next;
    });
  }

  if (loading) {
    // A22: Skeleton matcher final-state med liste af row-skeletons.
    return (
      <section className="mx-auto w-full max-w-3xl px-6 py-10 md:py-16">
        <PageHeader
          kicker="Interesse-signaler"
          title="Hvem har vist interesse for dig"
          description="Når du viser interesse tilbage, åbnes en samtale mellem jer."
        />
        <SkeletonGrid variant="messages" count={3} data-testid="incoming-interests-loading" />
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-10 md:py-16">
      <motion.div initial="hidden" animate="visible" variants={revealVariants(motionMode, "hero")}>
        <Button
          variant="ghost"
          onClick={() => navigate(appConfig.routes.profile)}
          className="mb-4"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Tilbage til profil
        </Button>

        <PageHeader
          kicker="Interesse-signaler"
          title="Hvem har vist interesse for dig"
          description="Når du viser interesse tilbage, åbnes en samtale mellem jer."
        />

        {error && (
          <Alert className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {actionMessage && (
          <Alert className="mb-4" data-testid="incoming-interests-action-message">
            <AlertDescription>{actionMessage}</AlertDescription>
          </Alert>
        )}

        {signals.length === 0 ? (
          <Card className="p-8 text-center" data-testid="incoming-interests-empty">
            <p className="body-text-muted mb-4 text-sm">
              Ingen indkomne signaler endnu. Når andre medlemmer viser
              interesse for dig, dukker de op her.
            </p>
            <Button onClick={() => navigate(appConfig.routes.members)}>
              Udforsk medlemmer
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4" data-testid="incoming-interests-list">
            {signals.map((signal) => {
              const profile = profiles.get(signal.from_user_id);
              const alreadyReturned = outgoingMap.has(signal.from_user_id);
              const ambient = profile?.photos.find((p) => p.kind === "ambient");
              const face = profile?.photos.find(
                (p) => p.kind === "face" && profile.can_see_face
              );
              const cover = face ?? ambient ?? profile?.photos[0] ?? null;
              const memberHref = `${appConfig.routes.members}/${signal.from_user_id}`;
              const memberLabel = profile?.display_name ?? "Anonym";
              const coverAlt = cover
                ? cover.kind === "face"
                  ? memberLabel
                  : "Stemningsbillede"
                : "";
              return (
                <Card
                  key={signal.id}
                  className="overflow-hidden p-0 focus-within:ring-2 focus-within:ring-[color:var(--color-link)] focus-within:ring-offset-2 focus-within:ring-offset-[color:var(--color-bg-base)]"
                  data-testid={`incoming-interest-${signal.from_user_id}`}
                >
                  {/* A20: <a> sikrer tastatur-fokus + Enter/Space åbner profilen */}
                  <a
                    href={memberHref}
                    onClick={(e) => {
                      if (
                        e.defaultPrevented ||
                        e.metaKey ||
                        e.ctrlKey ||
                        e.shiftKey ||
                        e.button !== 0
                      ) {
                        return;
                      }
                      e.preventDefault();
                      navigate(memberHref);
                    }}
                    className="flex gap-4 p-4 focus:outline-none"
                    aria-label={`Se profil for ${memberLabel}`}
                  >
                    <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-[color:var(--surface-glass)]">
                      {cover ? (
                        <img
                          src={api.asset(cover.url)}
                          alt={coverAlt}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-[color:var(--color-text-tertiary)]">
                          —
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <p className="font-display text-lg">{memberLabel}</p>
                        <p className="text-xs text-[color:var(--color-text-secondary)]">
                          {profile?.age ? `${profile.age} år` : ""}
                          {profile?.region ? ` · ${profile.region}` : ""}
                        </p>
                        {profile && !profile.can_see_face && (
                          <Badge variant="outline" className="mt-1">
                            Ansigt vises efter interesse
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-[color:var(--color-text-tertiary)]">
                        Sendt {new Date(signal.created_at).toLocaleDateString("da-DK")}
                      </p>
                    </div>
                  </a>
                  <CardContent className="flex flex-wrap gap-2 border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] p-4">
                    {alreadyReturned ? (
                      <Button
                        variant="outline"
                        onClick={() => navigate(appConfig.routes.messages)}
                        data-testid={`incoming-interest-go-to-chat-${signal.from_user_id}`}
                      >
                        <MessageCircle className="mr-1 h-4 w-4" />
                        Til samtaler
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleSignalBack(signal.from_user_id)}
                        disabled={pendingId === signal.from_user_id}
                        className="glow-cta"
                        data-testid={`incoming-interest-return-${signal.from_user_id}`}
                      >
                        <Heart className="mr-1 h-4 w-4" />
                        Vis interesse tilbage
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      onClick={() =>
                        navigate(`${appConfig.routes.members}/${signal.from_user_id}`)
                      }
                    >
                      Se profil
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </motion.div>
    </section>
  );
}
