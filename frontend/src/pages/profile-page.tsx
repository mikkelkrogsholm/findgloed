import { ChangeEvent, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Trash2, Upload } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { appConfig } from "@/config/app-config";
import {
  api,
  type FaceVisibility,
  type InitiatorRole,
  type MeResponse,
  type PhotoKind,
  type PhotoVisibility
} from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { getMotionMode, revealVariants } from "@/lib/motion";
import { navigate } from "@/lib/nav";

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [region, setRegion] = useState("");
  const [bio, setBio] = useState("");
  const [faceVisibility, setFaceVisibility] = useState<FaceVisibility>("after_interest");
  const [initiatorRole, setInitiatorRole] = useState<InitiatorRole | "none">("none");
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
    navigate(appConfig.routes.landing);
  }

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-md px-6 py-20 text-center">
        <p className="body-text-muted">Indlæser…</p>
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
              {data.photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative overflow-hidden rounded-2xl border border-[color:var(--border-subtle)]"
                >
                  <img
                    src={api.asset(photo.url)}
                    alt=""
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
              ))}
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

        <Card className="p-6 md:p-8">
          <CardHeader className="px-0 pt-0">
            <CardTitle>Kontoadministration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-0 pb-0">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handlePause}>
                {data.profile.paused_at ? "Aktivér profil" : "Sæt profil på pause"}
              </Button>
              <Button variant="outline" onClick={() => navigate(appConfig.routes.verification)}>
                Verificering
              </Button>
              <Button variant="outline" onClick={() => navigate(appConfig.routes.members)}>
                Medlemmer
              </Button>
              <Button variant="ghost" onClick={handleSignOut}>
                Log ud
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}
