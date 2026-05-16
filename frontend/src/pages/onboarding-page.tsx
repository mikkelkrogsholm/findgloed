import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { appConfig } from "@/config/app-config";
import { api, type FaceVisibility, type InitiatorRole, type OwnProfile } from "@/lib/api";
import { getMotionMode, revealVariants } from "@/lib/motion";
import { navigate } from "@/lib/nav";

type Step = "role" | "face" | "details" | "photo";

const ROLE_OPTIONS: Array<{ value: InitiatorRole | null; title: string; body: string }> = [
  {
    value: "inviting",
    title: "Den der inviterer",
    body: "Jeg er typisk den der finder steder og siger 'skal vi prøve?'"
  },
  {
    value: "deciding",
    title: "Den der bestemmer tempoet",
    body: "Min partner inviterer — jeg bestemmer hvornår og hvordan."
  },
  {
    value: "balanced",
    title: "Det er ligevægtigt",
    body: "Vi inviterer på skift, eller jeg er single."
  },
  {
    value: null,
    title: "Spring over",
    body: "Det er ikke relevant for mig lige nu."
  }
];

const FACE_OPTIONS: Array<{ value: FaceVisibility; title: string; body: string }> = [
  {
    value: "after_interest",
    title: "Først efter gensidig interesse",
    body: "Andre verificerede ser min profil uden ansigt — først når vi har vist gensidig interesse, vises mit ansigt."
  },
  {
    value: "all_verified",
    title: "Vis ansigt for alle verificerede",
    body: "Jeg er tryg ved at vise ansigt på min profil til andre verificerede medlemmer."
  }
];

export function OnboardingPage() {
  const [step, setStep] = useState<Step>("role");
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [initiatorRole, setInitiatorRole] = useState<InitiatorRole | null>(null);
  const [faceVisibility, setFaceVisibility] = useState<FaceVisibility>("after_interest");
  const [displayName, setDisplayName] = useState("");
  const [region, setRegion] = useState("");
  const [birthYear, setBirthYear] = useState<string>("");
  const [bio, setBio] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const motionMode = getMotionMode();

  useEffect(() => {
    let active = true;
    api.getMe().then((result) => {
      if (!active) return;
      if (result.ok) {
        setProfile(result.profile);
        setInitiatorRole(result.profile.initiator_role);
        setFaceVisibility(result.profile.face_visibility);
        setDisplayName(result.profile.display_name ?? "");
        setRegion(result.profile.region ?? "");
        setBirthYear(result.profile.birth_year?.toString() ?? "");
        setBio(result.profile.bio ?? "");
      } else {
        navigate(appConfig.routes.login);
      }
      setLoadingProfile(false);
    });
    return () => {
      active = false;
    };
  }, []);

  async function saveStep(): Promise<boolean> {
    setSaving(true);
    setErrorMessage("");
    try {
      if (step === "role") {
        const res = await api.updateMe({ initiator_role: initiatorRole });
        if (!res.ok) {
          setErrorMessage("Kunne ikke gemme. Prøv igen.");
          return false;
        }
      }
      if (step === "face") {
        const res = await api.updateMe({ face_visibility: faceVisibility });
        if (!res.ok) {
          setErrorMessage("Kunne ikke gemme. Prøv igen.");
          return false;
        }
      }
      if (step === "details") {
        if (!displayName.trim()) {
          setErrorMessage("Vælg et alias som dine medlemmer ser dig under.");
          return false;
        }
        const year = Number(birthYear);
        const currentYear = new Date().getFullYear();
        if (!Number.isInteger(year) || year < 1900 || year > currentYear - 18) {
          setErrorMessage("Du skal være mindst 18 år.");
          return false;
        }
        const res = await api.updateMe({
          display_name: displayName.trim(),
          region: region.trim() || null,
          birth_year: year,
          bio: bio.trim() || null
        });
        if (!res.ok) {
          setErrorMessage("Kunne ikke gemme. Prøv igen.");
          return false;
        }
      }
      if (step === "photo") {
        if (photoFile) {
          const upload = await api.uploadPhoto(photoFile, "ambient", "verified", 0);
          if (!upload.ok) {
            setErrorMessage("Kunne ikke uploade billedet.");
            return false;
          }
        }
        const completed = await api.updateMe({ complete_onboarding: true });
        if (!completed.ok) {
          setErrorMessage("Kunne ikke gemme. Prøv igen.");
          return false;
        }
      }
      return true;
    } finally {
      setSaving(false);
    }
  }

  async function handleNext() {
    const ok = await saveStep();
    if (!ok) return;
    if (step === "role") {
      setStep("face");
    } else if (step === "face") {
      setStep("details");
    } else if (step === "details") {
      setStep("photo");
    } else if (step === "photo") {
      navigate(appConfig.routes.verification);
    }
  }

  function handleBack() {
    if (step === "face") setStep("role");
    else if (step === "details") setStep("face");
    else if (step === "photo") setStep("details");
  }

  if (loadingProfile) {
    return (
      <section className="mx-auto w-full max-w-md px-6 py-20 text-center">
        <p className="body-text-muted">Indlæser…</p>
      </section>
    );
  }

  if (!profile) {
    return null;
  }

  const stepNumber = { role: 1, face: 2, details: 3, photo: 4 }[step];

  return (
    <section className="mx-auto w-full max-w-2xl px-6 py-12 md:py-20">
      <motion.div initial="hidden" animate="visible" variants={revealVariants(motionMode, "hero")}>
        <Card className="p-8 md:p-10" data-testid="onboarding-card">
          <CardHeader className="px-0 pt-0">
            <p className="noxus-kicker kicker-text mb-2 text-[0.65rem]">
              Trin {stepNumber} af 4 — opret din profil
            </p>
            <CardTitle>
              {step === "role" && "Hvem inviterer i jeres relation?"}
              {step === "face" && "Hvordan vises dit ansigt?"}
              {step === "details" && "Fortæl lidt om dig"}
              {step === "photo" && "Vælg dit første profilbillede"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 px-0 pb-0">
            {step === "role" && (
              <>
                <p className="text-sm text-[color:var(--color-text-secondary)]">
                  Glød anerkender både den der inviterer og den der bestemmer tempoet — som
                  ligeværdige roller. Du kan altid ændre det senere.
                </p>
                <div className="space-y-3">
                  {ROLE_OPTIONS.map((option) => (
                    <button
                      key={option.title}
                      type="button"
                      onClick={() => setInitiatorRole(option.value)}
                      className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                        initiatorRole === option.value
                          ? "border-[color:var(--color-link)] bg-[color:var(--surface-glass-strong)]"
                          : "border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] hover:bg-[color:var(--surface-glass-strong)]"
                      }`}
                    >
                      <p className="font-display text-base">{option.title}</p>
                      <p className="text-sm text-[color:var(--color-text-secondary)]">
                        {option.body}
                      </p>
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === "face" && (
              <>
                <p className="text-sm text-[color:var(--color-text-secondary)]">
                  Du bestemmer hvornår dit ansigt vises. Du kan altid ændre det senere.
                </p>
                <div className="space-y-3">
                  {FACE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFaceVisibility(option.value)}
                      className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                        faceVisibility === option.value
                          ? "border-[color:var(--color-link)] bg-[color:var(--surface-glass-strong)]"
                          : "border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] hover:bg-[color:var(--surface-glass-strong)]"
                      }`}
                    >
                      <p className="font-display text-base">{option.title}</p>
                      <p className="text-sm text-[color:var(--color-text-secondary)]">
                        {option.body}
                      </p>
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === "details" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="display_name">Alias (sådan vises du på profilen)</Label>
                  <Input
                    id="display_name"
                    type="text"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="F.eks. Moa, Nordlys, eller dit fornavn"
                    maxLength={48}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="birth_year">Fødselsår</Label>
                    <Input
                      id="birth_year"
                      type="number"
                      inputMode="numeric"
                      min={1900}
                      max={new Date().getFullYear() - 18}
                      value={birthYear}
                      onChange={(event) => setBirthYear(event.target.value)}
                      placeholder="1985"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="region">Region</Label>
                    <Input
                      id="region"
                      type="text"
                      value={region}
                      onChange={(event) => setRegion(event.target.value)}
                      placeholder="København"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Beskrivelse</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    placeholder="Et par sætninger om dig — voksent, direkte, dig."
                    rows={5}
                    maxLength={600}
                  />
                  <p className="text-xs text-[color:var(--color-text-tertiary)]">
                    {bio.length}/600 tegn. Skriv som dig selv — ikke som en annonce.
                  </p>
                </div>
              </>
            )}

            {step === "photo" && (
              <>
                <p className="text-sm text-[color:var(--color-text-secondary)]">
                  Vælg et stemningsbillede der antyder dig — ikke et identifikations-billede.
                  Beslutning er din: nakkeparti, hånd, halvprofil i halvmørke. Du kan tilføje
                  flere billeder bagefter.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="photo">Profilbillede (valgfrit)</Label>
                  <Input
                    id="photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
                  />
                  <p className="text-xs text-[color:var(--color-text-tertiary)]">
                    JPG, PNG, WebP eller HEIC. Maks 8MB. Du kan altid uploade flere senere.
                  </p>
                </div>
              </>
            )}

            {errorMessage && (
              <Alert>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              {step !== "role" ? (
                <Button type="button" variant="ghost" onClick={handleBack} disabled={saving}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Tilbage
                </Button>
              ) : (
                <span />
              )}
              <Button type="button" onClick={handleNext} disabled={saving} className="glow-cta">
                {saving ? "Gemmer…" : step === "photo" ? "Næste: samtykke" : "Fortsæt"}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}
