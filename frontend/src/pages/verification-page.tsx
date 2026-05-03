import { FormEvent, useEffect, useState } from "react";
import { motion } from "motion/react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appConfig } from "@/config/app-config";
import { api, type OwnProfile } from "@/lib/api";
import { getMotionMode, revealVariants } from "@/lib/motion";
import { navigate } from "@/lib/nav";

export function VerificationPage() {
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [submittedNow, setSubmittedNow] = useState(false);

  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);

  const motionMode = getMotionMode();

  useEffect(() => {
    let active = true;
    api.getMe().then((result) => {
      if (!active) return;
      if (result.ok) {
        setProfile(result.profile);
      } else {
        navigate(appConfig.routes.login);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!idDocument || !selfie) {
      setErrorMessage("Begge billeder kræves.");
      return;
    }
    setSubmitting(true);
    setErrorMessage("");
    const result = await api.uploadVerification(idDocument, selfie);
    if (!result.ok) {
      setErrorMessage(
        result.code === "FILE_TOO_LARGE"
          ? "Filen er for stor (maks 8MB)."
          : "Kunne ikke uploade. Prøv igen."
      );
      setSubmitting(false);
      return;
    }
    setSubmittedNow(true);
    setSubmitting(false);
    api.getMe().then((res) => {
      if (res.ok) setProfile(res.profile);
    });
  }

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-md px-6 py-20 text-center">
        <p className="body-text-muted">Indlæser…</p>
      </section>
    );
  }
  if (!profile) return null;

  const status = profile.verification_status;

  return (
    <section className="mx-auto w-full max-w-2xl px-6 py-12 md:py-20">
      <motion.div initial="hidden" animate="visible" variants={revealVariants(motionMode, "hero")}>
        <Card className="p-8 md:p-10" data-testid="verification-card">
          <CardHeader className="px-0 pt-0">
            <p className="noxus-kicker kicker-text mb-2 text-[0.65rem]">
              Verificering — sidste trin
            </p>
            <CardTitle>Bekræft at du er dig</CardTitle>
            <p className="body-text-muted mt-1 text-sm">
              Glød er kun for verificerede medlemmer. Vi bruger billed-baseret verificering
              indtil MitID-integrationen er klar — det betyder at en ansvarlig person hos
              Sexologisk Akademi gennemgår din ID + selfie.
            </p>
          </CardHeader>
          <CardContent className="space-y-5 px-0 pb-0">
            {(status === "pending" || submittedNow) && (
              <Alert>
                <AlertDescription>
                  Tak. Din verificering er modtaget. Vi vender tilbage inden for 1-2
                  hverdage. Du modtager en e-mail når den er gennemgået.
                </AlertDescription>
              </Alert>
            )}

            {status === "verified" && (
              <Alert>
                <AlertDescription>
                  Du er verificeret. Du kan nu se andre medlemmer og oprette par-profil.
                </AlertDescription>
              </Alert>
            )}

            {status === "rejected" && (
              <Alert>
                <AlertDescription>
                  Din seneste verificering blev ikke godkendt. Du kan indsende en ny
                  nedenfor.
                </AlertDescription>
              </Alert>
            )}

            {(status === "unverified" || status === "rejected") && !submittedNow && (
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="id_document">Billede af ID (kørekort, pas eller sundhedskort)</Label>
                  <Input
                    id="id_document"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    onChange={(event) => setIdDocument(event.target.files?.[0] ?? null)}
                    required
                  />
                  <p className="text-xs text-[color:var(--color-text-tertiary)]">
                    Sløvr gerne dit CPR-nummer — vi bruger kun navn, fødselsdato og foto.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="selfie">Selfie hvor du holder dit ID</Label>
                  <Input
                    id="selfie"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    capture="user"
                    onChange={(event) => setSelfie(event.target.files?.[0] ?? null)}
                    required
                  />
                </div>

                {errorMessage && (
                  <Alert>
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" disabled={submitting || !idDocument || !selfie} className="w-full glow-cta">
                  {submitting ? "Uploader…" : "Send til godkendelse"}
                </Button>
              </form>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <Button variant="ghost" onClick={() => navigate(appConfig.routes.profile)}>
                Til profil
              </Button>
              {status === "verified" && (
                <Button variant="ghost" onClick={() => navigate(appConfig.routes.members)}>
                  Se medlemmer
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}
