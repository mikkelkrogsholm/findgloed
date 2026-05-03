import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Flag, Heart, MessageCircle, ShieldOff } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { appConfig } from "@/config/app-config";
import { api, type MemberDetailResponse } from "@/lib/api";
import { getMotionMode, revealVariants } from "@/lib/motion";
import { navigate } from "@/lib/nav";

export function MemberDetailPage() {
  const [data, setData] = useState<MemberDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [interestSent, setInterestSent] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const motionMode = getMotionMode();

  const memberId = window.location.pathname.split("/").pop() ?? "";

  async function reload() {
    const [result, interests] = await Promise.all([
      api.getMember(memberId),
      api.listInterests()
    ]);
    if (!result.ok) {
      setError(
        result.code === "MATCH_REQUIRED"
          ? "Kræver gensidig interesse."
          : "Kunne ikke hente profilen."
      );
    } else {
      setData(result);
      setError("");
    }
    if (interests.ok) {
      setInterestSent(interests.outgoing.some((s) => s.to_user_id === memberId));
    }
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, [memberId]);

  async function handleSignalInterest() {
    setActionPending(true);
    setActionMessage("");
    const result = await api.signalInterest(memberId);
    setActionPending(false);
    if (!result.ok) {
      const messages: Record<string, string> = {
        COUPLE_NOT_OPEN_TO_SINGLES: "Paret er ikke åbne for kontakt fra singles.",
        BLOCKED: "Kontakt er ikke mulig.",
        VERIFICATION_REQUIRED: "Du skal være verificeret."
      };
      setActionMessage(messages[result.code] ?? "Kunne ikke sende interesse.");
      return;
    }
    setInterestSent(true);
    if (result.conversation_opened) {
      setActionMessage("Gensidig interesse — chat åbnet. Find den under Beskeder.");
    } else {
      setActionMessage("Interesse sendt. Du får besked hvis det bliver gensidigt.");
    }
  }

  async function handleWithdraw() {
    setActionPending(true);
    await api.withdrawInterest(memberId);
    setActionPending(false);
    setInterestSent(false);
    setActionMessage("Interesse trukket tilbage.");
  }

  async function handleBlock() {
    if (!window.confirm("Bloker denne person? De kan ikke længere kontakte dig.")) return;
    const result = await api.blockUser(memberId);
    if (result.ok) {
      navigate(appConfig.routes.members);
    }
  }

  async function handleReport() {
    const reason = window.prompt("Hvad er grunden til rapporten?");
    if (!reason) return;
    const result = await api.reportUser({
      reported_user_id: memberId,
      reason
    });
    setActionMessage(
      result.ok ? "Tak. Rapporten er sendt til moderation." : "Kunne ikke sende rapport."
    );
  }

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-md px-6 py-20 text-center">
        <p className="body-text-muted">Indlæser…</p>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="mx-auto w-full max-w-md px-6 py-20">
        <Alert className="mb-4">
          <AlertDescription>{error || "Profilen findes ikke."}</AlertDescription>
        </Alert>
        <Button onClick={() => navigate(appConfig.routes.members)}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Tilbage
        </Button>
      </section>
    );
  }

  const profile = data.profile;
  const visiblePhotos = data.photos.filter((p) => {
    if (p.visibility === "private" && data.relation !== "private_grant" && data.relation !== "self") {
      return false;
    }
    if (p.kind === "face" && !profile.can_see_face) {
      return false;
    }
    return true;
  });

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-10 md:py-16">
      <motion.div initial="hidden" animate="visible" variants={revealVariants(motionMode, "hero")}>
        <Button
          variant="ghost"
          onClick={() => navigate(appConfig.routes.members)}
          className="mb-4"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Tilbage
        </Button>

        <Card className="overflow-hidden p-0">
          <div className="grid gap-2 sm:grid-cols-2">
            {visiblePhotos.length === 0 && (
              <div className="col-span-full flex h-48 items-center justify-center bg-[color:var(--surface-glass)] text-sm text-[color:var(--color-text-tertiary)]">
                Ingen synlige billeder
              </div>
            )}
            {visiblePhotos.map((photo) => (
              <img
                key={photo.id}
                src={api.asset(photo.url)}
                alt=""
                loading="lazy"
                className="h-72 w-full object-cover"
              />
            ))}
          </div>
          <CardHeader className="px-6 pt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <CardTitle>{profile.display_name ?? "Anonym"}</CardTitle>
              <p className="text-sm text-[color:var(--color-text-secondary)]">
                {profile.age ? `${profile.age} år` : ""}
                {profile.region ? ` · ${profile.region}` : ""}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary">Verificeret</Badge>
              {profile.initiator_role === "inviting" && <Badge variant="outline">Den der inviterer</Badge>}
              {profile.initiator_role === "deciding" && (
                <Badge variant="outline">Den der bestemmer tempoet</Badge>
              )}
              {!profile.can_see_face && data.relation === "verified" && (
                <Badge variant="outline">Ansigt efter interesse</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pb-6">
            {profile.bio ? (
              <p className="whitespace-pre-line text-sm text-[color:var(--color-text-primary)]">
                {profile.bio}
              </p>
            ) : (
              <p className="text-sm text-[color:var(--color-text-tertiary)]">
                Skriver endnu ikke noget.
              </p>
            )}

            {data.couple && (
              <div className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] p-4">
                <p className="font-display text-base">Par-profil: {data.couple.display_name}</p>
                {data.couple.bio && (
                  <p className="mt-1 text-sm text-[color:var(--color-text-secondary)]">
                    {data.couple.bio}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.couple.open_to_singles && <Badge variant="outline">Åbne for singles</Badge>}
                  {data.couple.accepts_mixed_events && (
                    <Badge variant="outline">Mixed events OK</Badge>
                  )}
                </div>
              </div>
            )}

            {actionMessage && (
              <Alert>
                <AlertDescription>{actionMessage}</AlertDescription>
              </Alert>
            )}

            {data.relation !== "self" && (
              <div className="space-y-3 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] p-4">
                <div className="flex flex-wrap gap-2">
                  {!interestSent ? (
                    <Button onClick={handleSignalInterest} disabled={actionPending} className="glow-cta">
                      <Heart className="mr-1 h-4 w-4" />
                      Vis interesse
                    </Button>
                  ) : (
                    <Button onClick={handleWithdraw} disabled={actionPending} variant="outline">
                      <Heart className="mr-1 h-4 w-4 fill-current" />
                      Interesse sendt — fjern
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => navigate(appConfig.routes.messages)}>
                    <MessageCircle className="mr-1 h-4 w-4" />
                    Til beskeder
                  </Button>
                  <Button variant="ghost" onClick={handleReport}>
                    <Flag className="mr-1 h-4 w-4" />
                    Rapportér
                  </Button>
                  <Button variant="ghost" onClick={handleBlock}>
                    <ShieldOff className="mr-1 h-4 w-4" />
                    Bloker
                  </Button>
                </div>
                <p className="text-xs text-[color:var(--color-text-tertiary)]">
                  Beskeder åbner først ved gensidig interesse — eller når I deltager i samme event.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}
