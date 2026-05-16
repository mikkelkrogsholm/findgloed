import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Eye, Flag, Heart, Lock, MessageCircle, ShieldOff } from "lucide-react";

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
  // B2: Indikerer om JEG har givet denne person adgang til mit private album.
  const [iGrantedThem, setIGrantedThem] = useState(false);
  // B48 (beslutning 4): Private fotos må kun indlæses efter aktivt klik fra
  // modtager — ellers inflateres view_count automatisk hver gang siden åbnes.
  const [albumRevealed, setAlbumRevealed] = useState(false);
  const motionMode = getMotionMode();

  const memberId = window.location.pathname.split("/").pop() ?? "";

  async function reload() {
    const [result, interests, grants] = await Promise.all([
      api.getMember(memberId),
      api.listInterests(),
      api.listAlbumGrants()
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
    if (grants.ok) {
      setIGrantedThem(
        grants.grants.some(
          (g) => g.recipient_user_id === memberId && g.revoked_at === null
        )
      );
    }
    // Hvis vi navigerer til ny profil, reset album-revealed-state så
    // private fotos ikke leakes på tværs af profiler.
    setAlbumRevealed(false);
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

  // B2: Giv denne match adgang til mit private album. Backend validerer at
  // jeg har private fotos overhovedet — frontend visualiserer hvis jeg
  // ikke har nogen ved at vise CTA'en med beskeden om at uploade først.
  async function handleGrantAlbum() {
    setActionPending(true);
    setActionMessage("");
    const result = await api.grantPrivateAlbum(memberId);
    setActionPending(false);
    if (!result.ok) {
      setActionMessage("Kunne ikke give adgang.");
      return;
    }
    setIGrantedThem(true);
    setActionMessage("Adgang givet. De kan nu se dit private album.");
  }

  async function handleRevokeAlbum() {
    if (!window.confirm("Træk adgang til dit private album tilbage?")) return;
    setActionPending(true);
    const result = await api.revokePrivateAlbum(memberId);
    setActionPending(false);
    if (!result.ok) {
      setActionMessage("Kunne ikke trække adgang tilbage.");
      return;
    }
    setIGrantedThem(false);
    setActionMessage("Adgang trukket tilbage.");
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
  // B48: Adskil offentlige og private fotos. Private fotos må kun rendres
  // efter aktivt klik fra modtageren — så view_count ikke inflateres af
  // sidens auto-load. Når relation==='self' ser ejeren selv sine private
  // billeder fra start (intet overlay).
  const publicPhotos = visiblePhotos.filter((p) => p.visibility !== "private");
  const privatePhotos = visiblePhotos.filter((p) => p.visibility === "private");
  const showPrivateOverlay =
    data.relation === "private_grant" && privatePhotos.length > 0 && !albumRevealed;

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
            {publicPhotos.length === 0 && privatePhotos.length === 0 && (
              <div className="col-span-full flex h-48 items-center justify-center bg-[color:var(--surface-glass)] text-sm text-[color:var(--color-text-tertiary)]">
                Ingen synlige billeder
              </div>
            )}
            {publicPhotos.map((photo) => (
              <img
                key={photo.id}
                src={api.asset(photo.url)}
                alt=""
                loading="lazy"
                className="h-72 w-full object-cover"
              />
            ))}
            {/* B48: Private album fra anden person — skjult bag overlay indtil klik */}
            {showPrivateOverlay && (
              <button
                type="button"
                onClick={() => setAlbumRevealed(true)}
                className="col-span-full flex h-72 cursor-pointer flex-col items-center justify-center gap-3 bg-[color:var(--surface-glass-strong)] p-6 text-center transition hover:bg-[color:var(--surface-glass)]"
                data-testid="reveal-private-album"
              >
                <Lock className="h-8 w-8 text-[color:var(--color-link)]" />
                <p className="font-display text-base">
                  Du har adgang til {profile.display_name ?? "denne persons"} private album
                </p>
                <p className="text-sm text-[color:var(--color-text-secondary)]">
                  Klik for at se {privatePhotos.length}{" "}
                  {privatePhotos.length === 1 ? "billede" : "billeder"}.
                </p>
                <p className="text-xs text-[color:var(--color-text-tertiary)]">
                  <Eye className="-mt-0.5 mr-1 inline h-3 w-3" />
                  Ejeren kan se at du har set det.
                </p>
              </button>
            )}
            {/* Privatealbum-fotos vises kun når enten ejer eller modtager
                har klikket reveal. Self ser sine egne fotos uden overlay. */}
            {(data.relation === "self" || albumRevealed) &&
              privatePhotos.map((photo) => (
                <img
                  key={photo.id}
                  src={api.asset(photo.url)}
                  alt=""
                  loading="lazy"
                  className="h-72 w-full object-cover"
                  data-testid="private-album-photo"
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

            {/* B2: Når relation==='match' kan vi (matchet) tilbyde at åbne
                vores private album for denne person — eller revoke hvis vi
                allerede har givet adgang. Vises også når relation==='private_grant'
                (paret er matchet og har allerede grant) så vi kan revoke. */}
            {(data.relation === "match" || data.relation === "private_grant") && (
              <div
                className="space-y-3 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] p-4"
                data-testid="member-private-album-section"
              >
                <div className="flex items-start gap-3">
                  <Lock className="mt-1 h-5 w-5 text-[color:var(--color-link)]" />
                  <div className="flex-1">
                    <p className="font-display text-base">Privat album</p>
                    <p className="mt-1 text-sm text-[color:var(--color-text-secondary)]">
                      {iGrantedThem
                        ? `${profile.display_name ?? "De"} har adgang til dit private album. Du kan altid trække det tilbage.`
                        : `Du kan give ${profile.display_name ?? "denne person"} adgang til dit private album. De kan kun se det så længe du tillader det.`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {iGrantedThem ? (
                    <Button
                      variant="outline"
                      onClick={handleRevokeAlbum}
                      disabled={actionPending}
                      data-testid="revoke-private-album-button"
                    >
                      Træk adgang tilbage
                    </Button>
                  ) : (
                    <Button
                      onClick={handleGrantAlbum}
                      disabled={actionPending}
                      data-testid="grant-private-album-button"
                    >
                      <Lock className="mr-1 h-4 w-4" />
                      Giv adgang til mit private album
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}
