import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ShieldCheck } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { appConfig } from "@/config/app-config";
import { api, type OwnProfile } from "@/lib/api";
import { getMotionMode, revealVariants } from "@/lib/motion";
import { navigate } from "@/lib/nav";
import { refreshSession } from "@/lib/use-session";

export function VerificationPage() {
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [accepted, setAccepted] = useState(false);

  const motionMode = getMotionMode();

  async function reload() {
    const result = await api.getMe();
    if (result.ok) {
      setProfile(result.profile);
    } else {
      navigate(appConfig.routes.login);
    }
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, []);

  async function onAccept() {
    if (!accepted) {
      setErrorMessage("Du skal acceptere at gennemgå verificering senere.");
      return;
    }
    setSubmitting(true);
    setErrorMessage("");
    const result = await api.acceptFutureVerificationPolicy();
    setSubmitting(false);
    if (!result.ok) {
      setErrorMessage("Kunne ikke gemme dit samtykke. Prøv igen.");
      return;
    }
    await refreshSession();
    void reload();
  }

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-md px-6 py-20 text-center">
        <p className="body-text-muted">Indlæser…</p>
      </section>
    );
  }
  if (!profile) return null;

  const isVerified = profile.verification_status === "verified";

  return (
    <section className="mx-auto w-full max-w-2xl px-6 py-12 md:py-20">
      <motion.div initial="hidden" animate="visible" variants={revealVariants(motionMode, "hero")}>
        <Card className="p-8 md:p-10" data-testid="verification-card">
          <CardHeader className="px-0 pt-0">
            <p className="noxus-kicker kicker-text mb-2 text-[0.65rem]">
              Verificering — sidste trin
            </p>
            <CardTitle>Verificering kommer senere</CardTitle>
            <p className="body-text-muted mt-1 text-sm">
              Vi er ved at sætte MitID-verificering op. Indtil det er klart, kan
              du komme i gang med Glød med det samme — så længe du er
              indforstået med at gennemgå verificering når systemet er klart.
            </p>
          </CardHeader>
          <CardContent className="space-y-5 px-0 pb-0">
            <div className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-[color:var(--color-link)]" />
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Sådan vil verificering fungere:</strong> Når
                    MitID-integrationen er klar, beder vi dig om at verificere
                    din identitet diskret bag kulisserne — kun et
                    "verificeret"-mærke vises udadtil. Hvis du ikke
                    gennemfører det, mister du adgang til Glød.
                  </p>
                  <p className="text-[color:var(--color-text-secondary)]">
                    Indtil da kan du oprette profil, browse medlemmer, tilmelde
                    dig events og skrive beskeder.
                  </p>
                </div>
              </div>
            </div>

            {isVerified ? (
              <Alert>
                <AlertDescription>
                  Du er klar. Du har accepteret at gennemgå verificering når
                  systemet er klart, og kan nu bruge alle medlems-funktioner.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <label className="flex items-start gap-3 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] p-4 text-sm">
                  <Checkbox
                    checked={accepted}
                    onCheckedChange={(checked) => setAccepted(checked === true)}
                    className="mt-0.5"
                  />
                  <span>
                    Jeg er indforstået med at jeg skal gennemgå
                    MitID-verificering når systemet er klart for at beholde
                    min adgang til Glød. Indtil da må jeg bruge platformen
                    som verificeret medlem.
                  </span>
                </label>

                {errorMessage && (
                  <Alert>
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={onAccept}
                  disabled={submitting || !accepted}
                  className="w-full glow-cta"
                >
                  {submitting ? "Gemmer…" : "Bekræft og fortsæt"}
                </Button>
              </>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <Button variant="ghost" onClick={() => navigate(appConfig.routes.profile)}>
                Til profil
              </Button>
              {isVerified && (
                <>
                  <Button variant="ghost" onClick={() => navigate(appConfig.routes.members)}>
                    Se medlemmer
                  </Button>
                  <Button variant="ghost" onClick={() => navigate(appConfig.routes.events)}>
                    Se events
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}
