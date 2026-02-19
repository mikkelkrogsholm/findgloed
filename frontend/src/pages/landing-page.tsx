import { FormEvent, useMemo, useState } from "react";

import { appConfig } from "@/config/app-config";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-20 md:grid-cols-[1.15fr_1fr]">
      <div className="glass-stage">
        <p className="noxus-kicker kicker-text mb-5 text-xs">Event-First fællesskab</p>
        <h2 className="noxus-title display-text mb-6 text-4xl leading-tight md:text-6xl">
          Mød mennesker i virkeligheden. Fortsæt samtalen digitalt.
        </h2>
        <p className="body-text max-w-xl text-lg">
          Glød åbner med kuraterede events sammen med DKSA. Skriv dig på ventelisten og få tidlig adgang til
          de første arrangementer.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 text-sm">
          <span className="glass-panel rounded-full px-4 py-2">MitID verificeret</span>
          <span className="glass-panel rounded-full px-4 py-2">Event-first tilgang</span>
          <span className="glass-panel rounded-full px-4 py-2">Privacy by design</span>
        </div>
      </div>

      <Card className="p-8 md:p-10">
        <CardContent className="pt-0">
          {!isSuccess && (
            <form className="space-y-5" onSubmit={onSubmit}>
              <div className="space-y-2">
                <p className="body-text-muted text-sm leading-relaxed">
                  Vi bruger din email til venteliste-flowet, lancering og relevante event-opdateringer. Du
                  bekræfter din tilmelding via email (double opt-in).
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

              <div className="space-y-3 rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--glass-panel-surface)] p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms_privacy"
                    checked={acceptedTermsPrivacy}
                    onCheckedChange={(value) => setAcceptedTermsPrivacy(Boolean(value))}
                  />
                  <Label htmlFor="terms_privacy" className="body-text text-sm leading-relaxed">
                    Jeg accepterer handelsbetingelserne og persondatapolitikken.
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

              <Button disabled={loading || !acceptedTermsPrivacy} type="submit" className="w-full">
                {loading ? "Gemmer..." : "Skriv mig op"}
              </Button>
            </form>
          )}

          {isSuccess && (
            <div className="space-y-3">
              <CardTitle>Tak. Du er på listen.</CardTitle>
              <p className="success-body">Tjek din email for at bekræfte din tilmelding.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
