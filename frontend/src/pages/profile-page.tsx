import { ChangeEvent, useEffect, useState } from "react";
import { motion } from "motion/react";
import { AlertTriangle, Eye, Heart, Lock, Trash2, Upload } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/page-header";
import { FormSkeleton } from "@/components/layout/loading-state";
import { appConfig } from "@/config/app-config";
import {
  api,
  type CoupleInvitationSummary,
  type FaceVisibility,
  type InitiatorRole,
  type InterestSignal,
  type MeResponse,
  type PhotoKind,
  type PhotoVisibility,
  type PrivateAlbumGrantSummary
} from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { getMotionMode, revealVariants } from "@/lib/motion";
import { navigate } from "@/lib/nav";
import { clearSession } from "@/lib/use-session";

const FACE_LABEL: Record<FaceVisibility, string> = {
  after_interest: "Først efter gensidig interesse",
  all_verified: "For alle verificerede"
};

const ROLE_LABEL: Record<NonNullable<InitiatorRole>, string> = {
  inviting: "Den der inviterer",
  deciding: "Den der bestemmer tempoet",
  balanced: "Ligevægtigt eller single"
};

const VERIFICATION_LABEL = {
  unverified: { tone: "Ikke verificeret", description: "Du kan ikke se andre medlemmer endnu." },
  pending: { tone: "Under vurdering", description: "Vi kigger på din verificering." },
  verified: { tone: "Verificeret", description: "Du kan se medlemmer og oprette par." },
  rejected: { tone: "Afvist", description: "Indsend ny verificering når du er klar." }
} as const;

export function ProfilePage() {
  const [data, setData] = useState<MeResponse | null>(null);
  const [incomingInvitations, setIncomingInvitations] = useState<
    CoupleInvitationSummary[]
  >([]);
  // B1: indkomne interesse-signaler vises i banner + giver link til /interests/incoming.
  const [incomingInterests, setIncomingInterests] = useState<InterestSignal[]>([]);
  // B2: modtagere af mit private album — vises som liste med revoke-knap.
  const [albumGrants, setAlbumGrants] = useState<PrivateAlbumGrantSummary[]>([]);
  const [albumGrantsLoading, setAlbumGrantsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [region, setRegion] = useState("");
  const [bio, setBio] = useState("");
  const [faceVisibility, setFaceVisibility] = useState<FaceVisibility>("after_interest");
  const [initiatorRole, setInitiatorRole] = useState<InitiatorRole | "none">("none");
  // Slet-konto-dialog (issue A9). To-trins bekræftelse:
  //  1) brugeren vælger soft/hard-delete + læser konsekvenser
  //  2) skriver sin email for at bekræfte
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<"soft" | "hard">("soft");
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  // Revoke-grant-dialog (erstatter window.confirm — accessibility-fix)
  const [revokeGrantUserId, setRevokeGrantUserId] = useState<string | null>(null);
  const motionMode = getMotionMode();

  async function reload() {
    const result = await api.getMe();
    if (result.ok) {
      setData(result);
      setDisplayName(result.profile.display_name ?? "");
      setRegion(result.profile.region ?? "");
      setBio(result.profile.bio ?? "");
      setFaceVisibility(result.profile.face_visibility);
      setInitiatorRole(result.profile.initiator_role ?? "none");
      // Hent også couple-invitations så vi kan vise banner ved indkommende.
      const invitations = await api.listCoupleInvitations();
      if (invitations.ok) {
        setIncomingInvitations(invitations.incoming);
      }
      // B1: hent indkomne interesse-signaler så vi kan vise banner.
      // Kun verificerede brugere kan se /api/me/interests (403 ellers) —
      // det er OK her fordi profil-siden bruges af alle, og banner blot
      // ikke vises hvis listen er tom eller endpoint fejler.
      if (result.profile.verification_status === "verified") {
        const interests = await api.listInterests();
        if (interests.ok) {
          setIncomingInterests(interests.incoming);
        }
        // B2: indlæs grants — bruges i "Mit private album"-sektion.
        setAlbumGrantsLoading(true);
        const grants = await api.listAlbumGrants();
        if (grants.ok) {
          // Filtrer revoked ud — vises kun aktive grants.
          setAlbumGrants(grants.grants.filter((g) => g.revoked_at === null));
        }
        setAlbumGrantsLoading(false);
      }
    } else {
      navigate(appConfig.routes.login);
    }
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    const result = await api.updateMe({
      display_name: displayName.trim() || null,
      region: region.trim() || null,
      bio: bio.trim() || null,
      face_visibility: faceVisibility,
      initiator_role: initiatorRole === "none" ? null : initiatorRole
    });
    setSaving(false);
    if (!result.ok) {
      setError("Kunne ikke gemme. Prøv igen.");
      return;
    }
    setSuccess("Gemt.");
    void reload();
  }

  async function handlePhotoUpload(
    event: ChangeEvent<HTMLInputElement>,
    kind: PhotoKind,
    visibility: PhotoVisibility
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    const result = await api.uploadPhoto(file, kind, visibility, data?.photos.length ?? 0);
    if (!result.ok) {
      setError("Kunne ikke uploade billedet.");
      return;
    }
    void reload();
    event.target.value = "";
  }

  async function handleDeletePhoto(id: string) {
    const result = await api.deletePhoto(id);
    if (!result.ok) {
      setError("Kunne ikke slette billedet.");
      return;
    }
    void reload();
  }

  async function handlePause() {
    const result = await api.updateMe({ paused_at: data?.profile.paused_at ? null : true });
    if (!result.ok) {
      setError("Kunne ikke ændre pause-status.");
      return;
    }
    void reload();
  }

  async function handleSignOut() {
    await authClient.signOut();
    clearSession();
    navigate(appConfig.routes.landing);
  }

  // B2: Revoke en grant så modtageren mister adgang til mit private album.
  // Bruger Dialog (a11y) — window.confirm er native og kan ikke styles eller skærmlæses ordentligt.
  async function performRevokeGrant(recipientUserId: string) {
    const result = await api.revokePrivateAlbum(recipientUserId);
    if (!result.ok) {
      setError("Kunne ikke trække adgang tilbage.");
      return;
    }
    setAlbumGrants((prev) => prev.filter((g) => g.recipient_user_id !== recipientUserId));
    setSuccess("Adgang trukket tilbage.");
  }

  function openDeleteDialog(mode: "soft" | "hard") {
    setDeleteMode(mode);
    setDeleteConfirmEmail("");
    setDeleteError("");
    setDeleteDialogOpen(true);
  }

  async function handleConfirmDelete() {
    if (!data) return;
    // Bekræftelses-værn: brugeren skal indtaste sin email præcis så vi
    // forhindrer ved-et-uheld-klik. Sammenligning er case-insensitive.
    if (
      deleteConfirmEmail.trim().toLowerCase() !==
      data.profile.email.trim().toLowerCase()
    ) {
      setDeleteError("Email matcher ikke. Indtast din email præcis som vist.");
      return;
    }

    setDeleting(true);
    setDeleteError("");
    const result = await api.deleteMe(deleteMode === "hard");
    setDeleting(false);

    if (!result.ok) {
      setDeleteError("Kunne ikke slette kontoen. Prøv igen, eller skriv til mikkel@findgloed.dk.");
      return;
    }

    // Sletning lykkedes — log brugeren ud lokalt + redirect til landing.
    try {
      await authClient.signOut();
    } catch {
      // ignoreres: serverens session er allerede ugyldig
    }
    clearSession();
    setDeleteDialogOpen(false);
    navigate(appConfig.routes.landing);
  }

  if (loading) {
    // A22: Form-skeleton matcher de tre profil-kort.
    return (
      <section className="mx-auto w-full max-w-3xl px-6 py-10 md:py-16">
        <PageHeader kicker="Din profil" title="Henter…" />
        <div className="space-y-6">
          <FormSkeleton rows={3} data-testid="profile-loading-1" />
          <FormSkeleton rows={4} />
          <FormSkeleton rows={2} />
        </div>
      </section>
    );
  }

  if (!data) {
    return null;
  }

  const verification = VERIFICATION_LABEL[data.profile.verification_status];

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-10 md:py-16">
      <motion.div initial="hidden" animate="visible" variants={revealVariants(motionMode, "hero")}>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="noxus-kicker kicker-text text-[0.65rem]">Din profil</p>
            <h1 className="font-display text-3xl">{data.profile.display_name ?? data.profile.email}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" data-testid="verification-badge">
              {verification.tone}
            </Badge>
            {data.profile.paused_at && <Badge variant="outline">På pause</Badge>}
          </div>
        </div>
        <p className="body-text-muted mb-8 text-sm">{verification.description}</p>

        {error && (
          <Alert className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-4">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* B1: Banner med indkomne interesse-signaler. Vises kun til
            verificerede brugere (de eneste der kan signalere/modtage). */}
        {incomingInterests.length > 0 && (
          <Card
            className="mb-6 border-[color:var(--color-link)] p-6 md:p-8"
            data-testid="profile-incoming-interests-banner"
          >
            <CardContent className="flex flex-wrap items-center justify-between gap-3 px-0 pb-0">
              <div className="flex items-start gap-3">
                <Heart className="mt-1 h-5 w-5 text-[color:var(--color-link)]" />
                <div>
                  <p className="font-display text-base">
                    {incomingInterests.length === 1
                      ? "1 person har vist interesse for dig"
                      : `${incomingInterests.length} personer har vist interesse for dig`}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--color-text-secondary)]">
                    Når du viser gensidig interesse, åbnes en samtale.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate(appConfig.routes.incomingInterests)}
                className="glow-cta"
                data-testid="profile-goto-incoming-interests"
              >
                Se hvem
              </Button>
            </CardContent>
          </Card>
        )}

        {/* C6: Par-invitation-banner — vises tydeligt øverst hvis nogen har inviteret dig */}
        {incomingInvitations.length > 0 && (
          <Card
            className="mb-6 border-[color:var(--color-link)] p-6 md:p-8"
            data-testid="profile-couple-invitation-banner"
          >
            <CardContent className="flex flex-wrap items-center justify-between gap-3 px-0 pb-0">
              <div className="flex items-start gap-3">
                <Heart className="mt-1 h-5 w-5 text-[color:var(--color-link)]" />
                <div>
                  <p className="text-sm">
                    <strong>
                      {incomingInvitations[0].primary_display_name ??
                        incomingInvitations[0].primary_email}
                    </strong>{" "}
                    har inviteret dig til at danne par
                    {incomingInvitations.length > 1 && (
                      <span className="text-xs text-[color:var(--color-text-tertiary)]">
                        {" "}(+{incomingInvitations.length - 1} flere)
                      </span>
                    )}
                    .
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--color-text-secondary)]">
                    Accepter eller afvis under par-profil.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate(appConfig.routes.coupleProfile)}
                className="glow-cta"
                data-testid="goto-couple-profile-from-banner"
              >
                Se invitation
              </Button>
            </CardContent>
          </Card>
        )}

        {/* C6: Par-section — viser om man er i et par eller ej */}
        <Card className="mb-6 p-6 md:p-8" data-testid="profile-couple-section">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-[color:var(--color-link)]" />
              Par-profil
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 px-0 pb-0">
            {data.couple ? (
              <>
                <div>
                  <p className="text-sm">
                    Du er en del af parret <strong>{data.couple.display_name}</strong>.
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--color-text-secondary)]">
                    {data.couple.open_to_singles
                      ? "Åben for singles. "
                      : "Lukket for singles. "}
                    {data.couple.accepts_mixed_events
                      ? "Deltager i mixed events."
                      : "Kun par-events."}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate(appConfig.routes.coupleProfile)}
                  data-testid="manage-couple"
                >
                  Administrer par
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-[color:var(--color-text-secondary)]">
                  Du er ikke i et par på Glød. Du kan invitere din partner — begge skal acceptere.
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate(appConfig.routes.coupleProfile)}
                  data-testid="create-couple"
                >
                  Opret par-profil
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6 p-6 md:p-8">
          <CardHeader className="px-0 pt-0">
            <CardTitle>Profil-felter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-0 pb-0">
            <div className="space-y-2">
              <Label htmlFor="display_name">Alias</Label>
              <Input
                id="display_name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Sådan vises du udadtil"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">Region</Label>
              <Input
                id="region"
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                placeholder="København"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Beskrivelse</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                rows={5}
                maxLength={600}
                placeholder="Voksent, direkte, dig."
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Initiator-rolle</Label>
                <Select
                  value={initiatorRole}
                  onValueChange={(value) => setInitiatorRole(value as InitiatorRole | "none")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ikke angivet</SelectItem>
                    <SelectItem value="inviting">{ROLE_LABEL.inviting}</SelectItem>
                    <SelectItem value="deciding">{ROLE_LABEL.deciding}</SelectItem>
                    <SelectItem value="balanced">{ROLE_LABEL.balanced}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Synlighed af ansigt</Label>
                <Select
                  value={faceVisibility}
                  onValueChange={(value) => setFaceVisibility(value as FaceVisibility)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="after_interest">{FACE_LABEL.after_interest}</SelectItem>
                    <SelectItem value="all_verified">{FACE_LABEL.all_verified}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="glow-cta">
                {saving ? "Gemmer…" : "Gem ændringer"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 p-6 md:p-8">
          <CardHeader className="px-0 pt-0">
            <CardTitle>Billeder</CardTitle>
            <p className="body-text-muted text-sm">
              Synlighed: <strong>verificeret</strong> ses af alle verificerede.{" "}
              <strong>match</strong> kræver gensidig interesse. <strong>privat</strong> kun for
              dem du eksplicit åbner dit private album for.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 px-0 pb-0">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {data.photos.length === 0 && (
                <p className="col-span-full text-sm text-[color:var(--color-text-tertiary)]">
                  Ingen billeder endnu.
                </p>
              )}
              {data.photos.map((photo) => {
                // B23: Meningsfuld alt-tekst pr. foto-type.
                const photoAlt =
                  photo.kind === "face"
                    ? `Dit ansigts-billede (${photo.visibility})`
                    : photo.kind === "ambient"
                      ? "Dit stemningsbillede"
                      : "Privat billede";
                return (
                <div
                  key={photo.id}
                  className="relative overflow-hidden rounded-2xl border border-[color:var(--border-subtle)]"
                >
                  <img
                    src={api.asset(photo.url)}
                    alt={photoAlt}
                    loading="lazy"
                    className="h-40 w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-black/40 p-2">
                    <Badge variant="outline">{photo.visibility}</Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePhoto(photo.id)}
                      aria-label="Slet billede"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                );
              })}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] p-4 hover:bg-[color:var(--surface-glass-strong)]">
                <Upload className="h-4 w-4" />
                <span className="text-sm">Stemningsbillede</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(event) => handlePhotoUpload(event, "ambient", "verified")}
                />
              </label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] p-4 hover:bg-[color:var(--surface-glass-strong)]">
                <Upload className="h-4 w-4" />
                <span className="text-sm">Ansigt (match-niveau)</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(event) => handlePhotoUpload(event, "face", "match")}
                />
              </label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] p-4 hover:bg-[color:var(--surface-glass-strong)]">
                <Upload className="h-4 w-4" />
                <span className="text-sm">Privat album</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(event) => handlePhotoUpload(event, "private", "private")}
                />
              </label>
            </div>
          </CardContent>
        </Card>

        {/* B2: Mit private album — viser modtagere af mit private album med
            view-count, sidste visning, og revoke-knap. Vises kun hvis brugeren
            har mindst én aktiv grant. */}
        {data.profile.verification_status === "verified" && (
          <Card
            className="mb-6 p-6 md:p-8"
            data-testid="profile-private-album-section"
          >
            <CardHeader className="px-0 pt-0">
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Mit private album
              </CardTitle>
              <p className="body-text-muted text-sm">
                Personer du har givet adgang til dit private album. Du kan altid
                trække adgangen tilbage.
              </p>
            </CardHeader>
            <CardContent className="space-y-3 px-0 pb-0">
              {albumGrantsLoading ? (
                <p className="text-sm text-[color:var(--color-text-tertiary)]">
                  Indlæser…
                </p>
              ) : albumGrants.length === 0 ? (
                <p
                  className="text-sm text-[color:var(--color-text-tertiary)]"
                  data-testid="profile-private-album-empty"
                >
                  Ingen aktive grants. Du kan give adgang til en match fra deres
                  profilside.
                </p>
              ) : (
                <ul className="space-y-3" data-testid="profile-private-album-list">
                  {albumGrants.map((grant) => (
                    <li
                      key={grant.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] p-4"
                      data-testid={`profile-private-album-grant-${grant.recipient_user_id}`}
                    >
                      <div className="flex-1">
                        <p className="font-display text-sm">
                          Modtager: <span className="font-mono text-xs">{grant.recipient_user_id}</span>
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--color-text-secondary)]">
                          Givet{" "}
                          {new Date(grant.granted_at).toLocaleDateString("da-DK", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                          {" · "}
                          <Eye className="-mt-1 mr-0.5 inline h-3 w-3" />
                          {grant.view_count}{" "}
                          {grant.view_count === 1 ? "visning" : "visninger"}
                          {grant.last_viewed_at && (
                            <>
                              {" · sidst set "}
                              {new Date(grant.last_viewed_at).toLocaleDateString(
                                "da-DK",
                                { day: "numeric", month: "short" }
                              )}
                            </>
                          )}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRevokeGrantUserId(grant.recipient_user_id)}
                        data-testid={`profile-revoke-grant-${grant.recipient_user_id}`}
                      >
                        Træk adgang tilbage
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* B27: Splittede 7 knapper i tre semantiske grupper med visuel
            adskillelse — så hierarkiet er læsbart (Status > Genveje > Konto). */}
        <Card className="mb-6 p-6 md:p-8">
          <CardHeader className="px-0 pt-0">
            <CardTitle>Kontoadministration</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-[color:var(--border-subtle)] px-0 pb-0">
            <div className="space-y-3 pb-4">
              <p className="text-xs uppercase tracking-wider text-[color:var(--color-text-tertiary)]">
                Status
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handlePause}>
                  {data.profile.paused_at ? "Aktivér profil" : "Sæt profil på pause"}
                </Button>
                <Button variant="outline" onClick={() => navigate(appConfig.routes.verification)}>
                  Verificering
                </Button>
              </div>
            </div>
            <div className="space-y-3 py-4">
              <p className="text-xs uppercase tracking-wider text-[color:var(--color-text-tertiary)]">
                Genveje
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => navigate(appConfig.routes.members)}>
                  Medlemmer
                </Button>
                <Button variant="outline" onClick={() => navigate(appConfig.routes.events)}>
                  Events
                </Button>
                <Button variant="outline" onClick={() => navigate(appConfig.routes.messages)}>
                  Beskeder
                </Button>
                <Button variant="outline" onClick={() => navigate(appConfig.routes.membership)}>
                  Medlemskab
                </Button>
              </div>
            </div>
            <div className="space-y-3 pt-4">
              <p className="text-xs uppercase tracking-wider text-[color:var(--color-text-tertiary)]">
                Konto
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={handleSignOut}>
                  Log ud
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* A9: Slet konto-sektion. To-trins bekræftelse via Dialog. */}
        <Card
          className="border-[color:var(--danger)] p-6 md:p-8"
          data-testid="profile-delete-account-section"
        >
          <CardHeader className="px-0 pt-0">
            <CardTitle className="flex items-center gap-2 text-[color:var(--danger)]">
              <AlertTriangle className="h-5 w-5" />
              Slet konto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-0 pb-0">
            <p className="body-text text-sm">
              Du kan til enhver tid slette din konto. Vi anonymiserer dine beskeder så andre
              samtaler stadig giver mening — og fjerner dine billeder og ID-dokumenter permanent.
              Aktive abonnementer afsluttes. Læs mere i vores{" "}
              <a className="link-inline" href={appConfig.routes.privacy}>
                persondatapolitik
              </a>
              .
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => openDeleteDialog("soft")}
                data-testid="open-soft-delete-dialog"
              >
                Pause + skjul profil
              </Button>
              <Button
                variant="outline"
                onClick={() => openDeleteDialog("hard")}
                className="border-[color:var(--danger)] text-[color:var(--danger)] hover:bg-[color:var(--danger)]/10"
                data-testid="open-hard-delete-dialog"
              >
                Slet og anonymisér permanent
              </Button>
            </div>
          </CardContent>
        </Card>

        <Dialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open);
            if (!open) {
              setDeleteConfirmEmail("");
              setDeleteError("");
            }
          }}
        >
          <DialogContent data-testid="delete-account-dialog">
            <DialogHeader>
              <DialogTitle>
                {deleteMode === "hard"
                  ? "Slet konto permanent"
                  : "Pause og skjul profil"}
              </DialogTitle>
              <DialogDescription>
                {deleteMode === "hard"
                  ? "Din profil bliver anonymiseret: display name bliver til \"[Slettet bruger]\", dine billeder og ID-dokumenter slettes fysisk, og dine par-koblinger opløses. Beskeder bevares for samtale-partnere, men fra dig vises som \"[Slettet bruger]\". Dette kan ikke fortrydes."
                  : "Din profil bliver skjult fra andre brugere, og du logges ud. Du kan kontakte mikkel@findgloed.dk for at få den gendannet. Aktive abonnementer afsluttes ved periodens udløb."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <p className="body-text text-sm">
                Dine rettigheder under GDPR (indsigt, berigtigelse, dataportabilitet) kan altid
                håndteres manuelt — skriv til{" "}
                <a className="link-inline" href="mailto:mikkel@findgloed.dk">
                  mikkel@findgloed.dk
                </a>
                . Læs mere i{" "}
                <a className="link-inline" href={appConfig.routes.privacy}>
                  persondatapolitikken
                </a>
                .
              </p>
              <div className="space-y-2">
                <Label htmlFor="delete-confirm-email">
                  Skriv din email <strong>{data.profile.email}</strong> for at bekræfte:
                </Label>
                <Input
                  id="delete-confirm-email"
                  type="email"
                  autoComplete="off"
                  value={deleteConfirmEmail}
                  onChange={(event) => setDeleteConfirmEmail(event.target.value)}
                  placeholder={data.profile.email}
                  data-testid="delete-confirm-email-input"
                />
              </div>
              {deleteError && (
                <Alert>
                  <AlertDescription>{deleteError}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleting}
              >
                Annullér
              </Button>
              <Button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="bg-[color:var(--danger)] text-white hover:bg-[color:var(--danger)]/90"
                data-testid="confirm-delete-account"
              >
                {deleting
                  ? "Sletter…"
                  : deleteMode === "hard"
                    ? "Slet permanent"
                    : "Pause + skjul"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Revoke-grant Dialog — erstatter native window.confirm. */}
        <Dialog
          open={revokeGrantUserId !== null}
          onOpenChange={(open) => {
            if (!open) setRevokeGrantUserId(null);
          }}
        >
          <DialogContent data-testid="revoke-grant-dialog">
            <DialogHeader>
              <DialogTitle>Træk adgang tilbage?</DialogTitle>
              <DialogDescription>
                Modtageren mister øjeblikkeligt adgang til dit private album. Du
                kan altid give adgang igen senere.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRevokeGrantUserId(null)}>
                Annullér
              </Button>
              <Button
                onClick={async () => {
                  if (!revokeGrantUserId) return;
                  await performRevokeGrant(revokeGrantUserId);
                  setRevokeGrantUserId(null);
                }}
                data-testid="confirm-revoke-grant"
              >
                Træk adgang tilbage
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </section>
  );
}
