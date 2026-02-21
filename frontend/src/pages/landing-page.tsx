import { FormEvent, useMemo, useState } from "react";
import { motion } from "motion/react";

import { appConfig } from "@/config/app-config";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMotionMode, hoverLiftVariants, revealVariants, staggerContainerVariants } from "@/lib/motion";

type WaitlistSuccess = {
  ok: true;
  message: string;
};

type WaitlistError = {
  ok: false;
  code?: string;
  message?: string;
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4564";

export function LandingPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [acceptedTermsPrivacy, setAcceptedTermsPrivacy] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const isSuccess = useMemo(() => submitted, [submitted]);
  const motionMode = getMotionMode();
  const pillVariants = hoverLiftVariants(motionMode);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(`${API_URL}/api/waitlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          source: "landing",
          accept_terms_privacy: acceptedTermsPrivacy,
          marketing_opt_in: marketingOptIn
        })
      });

      const payload = (await response.json()) as WaitlistSuccess | WaitlistError;

      if (response.ok && payload.ok) {
        setSubmitted(true);
        setEmail("");
        return;
      }

      if (!payload.ok) {
        setErrorMessage(payload.message ?? "Noget gik galt. Prøv igen.");
      }
    } catch {
      setErrorMessage("Forbindelsesfejl. Prøv igen om lidt.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-6xl items-start gap-10 px-6 py-14 md:grid-cols-[1.15fr_1fr] md:py-16">
      <motion.div
        className="glass-shell ambient-breathe motion-reveal-shell p-8 md:p-10"
        data-testid="landing-hero-shell"
        initial="hidden"
        animate="visible"
        variants={revealVariants(motionMode, "hero")}
      >
        <p className="noxus-kicker kicker-text mb-5 text-xs">Mød mennesker i virkeligheden først</p>
        <h2 className="noxus-title display-text mb-6 text-4xl leading-tight md:text-6xl xl:text-7xl">
          Et trygt sted for nysgerrige voksne.
        </h2>
        <p className="body-text max-w-xl text-lg leading-relaxed md:text-[1.15rem]">
          Glød er for dig, der vil møde mennesker gennem oplevelser - ikke swipe-kultur. Vi starter med events i
          samarbejde med Dansk Sexologisk Akademi.
        </p>
        <motion.div
          className="mt-8 flex flex-wrap gap-3 text-sm"
          variants={staggerContainerVariants(motionMode, "hero")}
          initial="hidden"
          animate="visible"
        >
          <motion.span
            className="glass-pill hover-glow rounded-full px-4 py-2"
            variants={{ ...revealVariants(motionMode, "item"), ...pillVariants }}
            whileHover="hover"
          >
            MitID-verificeret adgang
          </motion.span>
          <motion.span
            className="glass-pill hover-glow rounded-full px-4 py-2"
            variants={{ ...revealVariants(motionMode, "item"), ...pillVariants }}
            whileHover="hover"
          >
            Event-first
          </motion.span>
          <motion.span
            className="glass-pill hover-glow rounded-full px-4 py-2"
            variants={{ ...revealVariants(motionMode, "item"), ...pillVariants }}
            whileHover="hover"
          >
            Klare rammer for samtykke og respekt
          </motion.span>
        </motion.div>
      </motion.div>

      <motion.div
        data-testid="landing-signup-card"
        initial="hidden"
        animate="visible"
        variants={revealVariants(motionMode, "section")}
      >
        <Card className="motion-reveal-card p-8 md:p-10">
          <CardContent className="pt-0">
            {!isSuccess && (
              <form className="space-y-5" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <p className="body-text-muted text-sm leading-relaxed">
                    Skriv dig på ventelisten. Du får besked om lancering, early access og kommende events. Ingen støj.
                    Kun relevante opdateringer.
                  </p>
                  <a href={appConfig.routes.privacy} className="link-inline text-sm">
                    Læs persondatapolitik
                  </a>
                </div>

                <Label htmlFor="email">Din email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="dig@eksempel.dk"
                />

                <div className="glass-pill space-y-3 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="terms_privacy"
                      checked={acceptedTermsPrivacy}
                      onCheckedChange={(value) => setAcceptedTermsPrivacy(Boolean(value))}
                    />
                    <Label htmlFor="terms_privacy" className="body-text text-sm leading-relaxed">
                      Jeg har læst og accepterer handelsbetingelserne og persondatapolitikken.
                    </Label>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="marketing_opt_in"
                      checked={marketingOptIn}
                      onCheckedChange={(value) => setMarketingOptIn(Boolean(value))}
                    />
                    <Label htmlFor="marketing_opt_in" className="body-text text-sm leading-relaxed">
                      Ja tak - send mig eksklusive invites, nyheder og updates fra Glød.
                    </Label>
                  </div>
                </div>

                {errorMessage && (
                  <Alert>
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}

                <Button disabled={loading || !acceptedTermsPrivacy} type="submit" className="w-full glow-cta">
                  {loading ? "Sender..." : "Skriv mig op"}
                </Button>
              </form>
            )}

            {isSuccess && (
              <div className="space-y-3">
                <CardTitle>Tak. Du er på listen.</CardTitle>
                <p className="success-body">Bekræft din e-mail for at aktivere din plads på ventelisten.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}
