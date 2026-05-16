import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Heart, Send, X } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { appConfig } from "@/config/app-config";
import {
  api,
  type CoupleInvitationSummary,
  type CoupleSummary,
  type MeResponse
} from "@/lib/api";
import { getMotionMode, revealVariants } from "@/lib/motion";
import { navigate } from "@/lib/nav";

const INVITE_ERROR_MESSAGES: Record<string, string> = {
  MISSING_FIELDS: "Udfyld både partner-email og parnavn.",
  CANNOT_INVITE_SELF: "Du kan ikke invitere dig selv.",
  ALREADY_IN_COUPLE: "Du er allerede i et par.",
  PARTNER_ALREADY_IN_COUPLE:
    "Personen du forsøger at invitere er allerede i et par.",
  PARTNER_NOT_FOUND_OR_NOT_VERIFIED:
    "Vi kan ikke finde en verificeret bruger med den email. Bed din partner om at oprette en konto først.",
  INVITATION_ALREADY_PENDING:
    "Du har allerede en åben invitation til den person.",
  INVALID_BODY: "Felterne kunne ikke læses. Prøv igen.",
  UNAUTHORIZED: "Log ind først."
};

const ACCEPT_ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: "Invitationen findes ikke længere.",
  FORBIDDEN: "Du har ikke adgang til den invitation.",
  INVITATION_NOT_PENDING: "Invitationen er allerede afsluttet.",
  INVITATION_EXPIRED: "Invitationen er udløbet.",
  COUPLE_CONFLICT:
    "Én af jer er allerede i et andet par. Opløs det først og prøv igen."
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("da-DK", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

export function CoupleProfilePage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [incoming, setIncoming] = useState<CoupleInvitationSummary[]>([]);
  const [outgoing, setOutgoing] = useState<CoupleInvitationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Invite-form felter
  const [partnerEmail, setPartnerEmail] = useState("");
  const [coupleName, setCoupleName] = useState("");
  const [bio, setBio] = useState("");
  const [region, setRegion] = useState("");
  const [openToSingles, setOpenToSingles] = useState(false);
  const [acceptsMixedEvents, setAcceptsMixedEvents] = useState(false);

  // Edit-form felter (når man har par)
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editRegion, setEditRegion] = useState("");
  const [editOpenToSingles, setEditOpenToSingles] = useState(false);
  const [editAcceptsMixedEvents, setEditAcceptsMixedEvents] = useState(false);

  const motionMode = getMotionMode();

  function syncEditForm(couple: CoupleSummary) {
    setEditName(couple.display_name);
    setEditBio(couple.bio ?? "");
    setEditRegion(couple.region ?? "");
    setEditOpenToSingles(couple.open_to_singles);
    setEditAcceptsMixedEvents(couple.accepts_mixed_events);
  }

  async function reload() {
    const [meResult, invitationsResult] = await Promise.all([
      api.getMe(),
      api.listCoupleInvitations()
    ]);
    if (!meResult.ok) {
      navigate(appConfig.routes.login);
      return;
    }
    setMe(meResult);
    if (meResult.couple) {
      syncEditForm(meResult.couple);
    }
    if (invitationsResult.ok) {
      setIncoming(invitationsResult.incoming);
      setOutgoing(invitationsResult.outgoing);
    }
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, []);

  async function handleInvite() {
    if (!partnerEmail.trim() || !coupleName.trim()) {
      setError("Udfyld både partner-email og parnavn.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    const result = await api.inviteCouple({
      partner_email: partnerEmail.trim(),
      display_name: coupleName.trim(),
      bio: bio.trim() || null,
      region: region.trim() || null,
      open_to_singles: openToSingles,
      accepts_mixed_events: acceptsMixedEvents
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(
        INVITE_ERROR_MESSAGES[result.code] ??
          result.message ??
          "Kunne ikke sende invitation."
      );
      return;
    }
    setSuccess(
      "Invitation sendt. Din partner skal logge ind og acceptere før par-profilen oprettes."
    );
    setPartnerEmail("");
    setCoupleName("");
    setBio("");
    setRegion("");
    setOpenToSingles(false);
    setAcceptsMixedEvents(false);
    void reload();
  }

  async function handleAccept(id: string) {
    setSubmitting(true);
    setError("");
    setSuccess("");
    const result = await api.acceptCoupleInvitation(id);
    setSubmitting(false);
    if (!result.ok) {
      setError(
        ACCEPT_ERROR_MESSAGES[result.code] ??
          result.message ??
          "Kunne ikke acceptere invitationen."
      );
      return;
    }
    setSuccess("Par-profilen er nu oprettet. Velkommen.");
    void reload();
  }

  async function handleDecline(id: string) {
    setSubmitting(true);
    setError("");
    setSuccess("");
    const result = await api.declineCoupleInvitation(id);
    setSubmitting(false);
    if (!result.ok) {
      setError("Kunne ikke afvise invitationen.");
      return;
    }
    setSuccess("Invitationen er afvist.");
    void reload();
  }

  async function handleCancel(id: string) {
    if (!window.confirm("Vil du annullere invitationen?")) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    const result = await api.cancelCoupleInvitation(id);
    setSubmitting(false);
    if (!result.ok) {
      setError("Kunne ikke annullere invitationen.");
      return;
    }
    setSuccess("Invitationen er annulleret.");
    void reload();
  }

  async function handleUpdate() {
    if (!me?.couple) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    const result = await api.updateCouple(me.couple.id, {
      display_name: editName.trim() || me.couple.display_name,
      bio: editBio.trim() || null,
      region: editRegion.trim() || null,
      open_to_singles: editOpenToSingles,
      accepts_mixed_events: editAcceptsMixedEvents
    });
    setSubmitting(false);
    if (!result.ok) {
      setError("Kunne ikke gemme ændringerne.");
      return;
    }
    setSuccess("Par-profilen er opdateret.");
    void reload();
  }

  async function handleDissolve() {
    if (!me?.couple) return;
    const confirmed = window.confirm(
      "Er du sikker på at I vil opløse par-profilen? I kan altid oprette en ny senere."
    );
    if (!confirmed) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    const result = await api.deleteCouple(me.couple.id);
    setSubmitting(false);
    if (!result.ok) {
      setError("Kunne ikke opløse par-profilen.");
      return;
    }
    setSuccess("Par-profilen er opløst.");
    void reload();
  }

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-md px-6 py-20 text-center">
        <p className="body-text-muted">Indlæser…</p>
      </section>
    );
  }

  if (!me) {
    return null;
  }

  const hasCouple = me.couple !== null;
  const ownUserId = me.profile.user_id;

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-10 md:py-16">
      <motion.div initial="hidden" animate="visible" variants={revealVariants(motionMode, "hero")}>
        <div className="mb-6">
          <p className="noxus-kicker kicker-text text-[0.65rem]">Par-profil</p>
          <h1 className="font-display text-3xl">Glød for to</h1>
          <p className="mt-1 max-w-xl text-sm text-[color:var(--color-text-secondary)]">
            Et par på Glød er to mennesker der begge har sagt ja. Begge skal være verificerede medlemmer,
            og begge bestemmer hvad par-profilen er åben for.
          </p>
        </div>

        {error && (
          <Alert className="mb-4" data-testid="couple-error">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-4" data-testid="couple-success">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Incoming invitations — vis altid hvis de findes */}
        {incoming.length > 0 && (
          <Card className="mb-6 p-6 md:p-8" data-testid="couple-incoming-invitations">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-[color:var(--color-link)]" />
                Du er inviteret til et par
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-0 pb-0">
              {incoming.map((invitation) => (
                <div
                  key={invitation.id}
                  className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] p-4"
                >
                  <p className="text-sm">
                    <strong>
                      {invitation.primary_display_name ?? invitation.primary_email}
                    </strong>{" "}
                    har inviteret dig til at danne par under navnet{" "}
                    <strong>"{invitation.display_name}"</strong>.
                  </p>
                  {invitation.bio && (
                    <p className="mt-2 text-sm text-[color:var(--color-text-secondary)]">
                      {invitation.bio}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[color:var(--color-text-tertiary)]">
                    {invitation.region && <Badge variant="outline">{invitation.region}</Badge>}
                    {invitation.open_to_singles && (
                      <Badge variant="outline">Åben for singles</Badge>
                    )}
                    {invitation.accepts_mixed_events && (
                      <Badge variant="outline">Mixed events</Badge>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-[color:var(--color-text-tertiary)]">
                    Udløber: {formatDate(invitation.expires_at)}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      onClick={() => handleAccept(invitation.id)}
                      disabled={submitting}
                      className="glow-cta"
                      data-testid="accept-invitation"
                    >
                      Accepter invitation
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleDecline(invitation.id)}
                      disabled={submitting}
                    >
                      Afvis
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Couple exists */}
        {hasCouple && me.couple && (
          <Card className="mb-6 p-6 md:p-8" data-testid="couple-edit-card">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Jeres par-profil</CardTitle>
              <p className="body-text-muted text-sm">
                I styrer begge hvad I åbner op for. Beslutning 3: par opt-in for mixed events.
                Beslutning 8: singles kan kontakte par hvis I tillader det.
              </p>
            </CardHeader>
            <CardContent className="space-y-4 px-0 pb-0">
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">
                  {me.couple.primary_user_id === ownUserId
                    ? "Du er primær"
                    : "Du er partner"}
                </Badge>
                {me.couple.paused_at && <Badge variant="outline">På pause</Badge>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="couple_name">Parnavn</Label>
                <Input
                  id="couple_name"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="couple_region">Region</Label>
                <Input
                  id="couple_region"
                  value={editRegion}
                  onChange={(event) => setEditRegion(event.target.value)}
                  placeholder="København"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="couple_bio">Beskrivelse</Label>
                <Textarea
                  id="couple_bio"
                  value={editBio}
                  onChange={(event) => setEditBio(event.target.value)}
                  rows={5}
                  maxLength={600}
                  placeholder="Hvad I deler — voksent, ærligt, jer."
                />
              </div>

              <div className="space-y-3 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] p-4">
                <p className="text-xs uppercase tracking-wider text-[color:var(--color-text-tertiary)]">
                  Synlighed og kontakt
                </p>
                <label className="flex items-start gap-3 text-sm">
                  <Checkbox
                    id="open_to_singles"
                    checked={editOpenToSingles}
                    onCheckedChange={(value) => setEditOpenToSingles(value === true)}
                  />
                  <span>
                    <strong className="block">Åben for singles</strong>
                    <span className="text-xs text-[color:var(--color-text-secondary)]">
                      Singles kan starte samtale med os efter gensidig interesse. (Beslutning 8.)
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3 text-sm">
                  <Checkbox
                    id="accepts_mixed_events"
                    checked={editAcceptsMixedEvents}
                    onCheckedChange={(value) => setEditAcceptsMixedEvents(value === true)}
                  />
                  <span>
                    <strong className="block">Mixed events (par + singles)</strong>
                    <span className="text-xs text-[color:var(--color-text-secondary)]">
                      Vi opt-in'er for events hvor både singles og par deltager. (Beslutning 3.)
                    </span>
                  </span>
                </label>
              </div>

              <div className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] p-4 text-xs text-[color:var(--color-text-secondary)]">
                <p>
                  <strong>Initiator-rolle pr. person.</strong> I beholder hver jeres rolle (
                  {me.profile.initiator_role ?? "ikke valgt"} for dig). Det reflekterer Pakke 4's
                  dynamik: den der inviterer + den der bestemmer tempoet. Skift din egen rolle på{" "}
                  <a className="underline" href={appConfig.routes.profile}>
                    profil-siden
                  </a>
                  .
                </p>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={handleDissolve}
                  disabled={submitting}
                  data-testid="dissolve-couple"
                >
                  Opløs par-profil
                </Button>
                <Button onClick={handleUpdate} disabled={submitting} className="glow-cta">
                  {submitting ? "Gemmer…" : "Gem ændringer"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Outgoing pending */}
        {!hasCouple && outgoing.length > 0 && (
          <Card className="mb-6 p-6 md:p-8" data-testid="couple-outgoing-invitations">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-[color:var(--color-text-tertiary)]" />
                Venter på partners accept
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-0 pb-0">
              {outgoing.map((invitation) => (
                <div
                  key={invitation.id}
                  className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] p-4"
                >
                  <p className="text-sm">
                    Du har inviteret{" "}
                    <strong>
                      {invitation.partner_display_name ?? invitation.partner_email}
                    </strong>{" "}
                    til at danne par under navnet{" "}
                    <strong>"{invitation.display_name}"</strong>.
                  </p>
                  <p className="mt-2 text-xs text-[color:var(--color-text-tertiary)]">
                    Sendt: {formatDate(invitation.created_at)} · Udløber:{" "}
                    {formatDate(invitation.expires_at)}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancel(invitation.id)}
                      disabled={submitting}
                    >
                      <X className="mr-1 h-3 w-3" />
                      Annullér invitation
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Invite form — kun hvis ingen par og ingen outgoing pending */}
        {!hasCouple && outgoing.length === 0 && (
          <Card className="mb-6 p-6 md:p-8" data-testid="couple-invite-form">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Inviter din partner</CardTitle>
              <p className="body-text-muted text-sm">
                Indtast emailen på din partners verificerede Glød-konto. Når de accepterer,
                opretter vi par-profilen. Hvis din partner endnu ikke er medlem, så bed dem oprette
                en konto først.
              </p>
            </CardHeader>
            <CardContent className="space-y-4 px-0 pb-0">
              <div className="space-y-2">
                <Label htmlFor="partner_email">Partner-email</Label>
                <Input
                  id="partner_email"
                  type="email"
                  value={partnerEmail}
                  onChange={(event) => setPartnerEmail(event.target.value)}
                  placeholder="partner@email.dk"
                  data-testid="partner-email-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite_couple_name">Parnavn</Label>
                <Input
                  id="invite_couple_name"
                  value={coupleName}
                  onChange={(event) => setCoupleName(event.target.value)}
                  placeholder="Sådan vises I udadtil"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite_region">Region</Label>
                <Input
                  id="invite_region"
                  value={region}
                  onChange={(event) => setRegion(event.target.value)}
                  placeholder="København"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite_bio">Beskrivelse (valgfri)</Label>
                <Textarea
                  id="invite_bio"
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  rows={4}
                  maxLength={600}
                  placeholder="Hvad I deler — voksent, ærligt, jer."
                />
              </div>
              <div className="space-y-3 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] p-4">
                <p className="text-xs uppercase tracking-wider text-[color:var(--color-text-tertiary)]">
                  Forslag til synlighed (kan ændres senere)
                </p>
                <label className="flex items-start gap-3 text-sm">
                  <Checkbox
                    id="invite_open_to_singles"
                    checked={openToSingles}
                    onCheckedChange={(value) => setOpenToSingles(value === true)}
                  />
                  <span>
                    <strong className="block">Åben for singles</strong>
                    <span className="text-xs text-[color:var(--color-text-secondary)]">
                      Singles må starte samtale med jer efter gensidig interesse.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3 text-sm">
                  <Checkbox
                    id="invite_accepts_mixed_events"
                    checked={acceptsMixedEvents}
                    onCheckedChange={(value) => setAcceptsMixedEvents(value === true)}
                  />
                  <span>
                    <strong className="block">Mixed events</strong>
                    <span className="text-xs text-[color:var(--color-text-secondary)]">
                      Vi vil gerne deltage i events med både par og singles.
                    </span>
                  </span>
                </label>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleInvite}
                  disabled={submitting || !partnerEmail.trim() || !coupleName.trim()}
                  className="glow-cta"
                  data-testid="send-invitation"
                >
                  {submitting ? "Sender…" : "Send invitation"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="p-5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 px-0 pb-0">
            <p className="text-sm text-[color:var(--color-text-secondary)]">
              Tilbage til din profil.
            </p>
            <Button variant="ghost" onClick={() => navigate(appConfig.routes.profile)}>
              Til profil
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}
