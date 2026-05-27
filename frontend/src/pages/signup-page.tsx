import { FormEvent, useEffect, useState } from "react";
import { motion } from "motion/react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appConfig } from "@/config/app-config";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { getMotionMode, revealVariants } from "@/lib/motion";
import { navigate } from "@/lib/nav";
import { refreshSession } from "@/lib/use-session";

export function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [requiresInviteCode, setRequiresInviteCode] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedAge, setAcceptedAge] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const motionMode = getMotionMode();
  const canSubmit =
    name.trim().length > 0 &&
    email.includes("@") &&
    password.length >= 8 &&
    acceptedTerms &&
    acceptedAge &&
    (!requiresInviteCode || inviteCode.trim().length > 0) &&
    !loading;

  // Hent signup-requirements ved load. Hvis admin har slået invite-code-gaten
  // til vises et ekstra felt. Vi skipper ved fejl — så fallback'er vi til
  // åbent signup. Backenden vil afvise med 403 hvis koden er required men
  // mangler, så vi mister ikke sikkerhed ved at fejle åbent her.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await api.getSignupRequirements();
      if (cancelled) return;
      if (result.ok) {
        setRequiresInviteCode(result.requires_invite_code);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      // Better Auth's signUp.email tager kun de officielle felter, men vores
      // backend-middleware på /api/auth/sign-up/email læser body som JSON før
      // det videresendes. authClient sender alle ekstra felter med — invite_code
      // smugles dermed igennem til vores wrapper uden at forstyrre Better Auth.
      // Vi sender KUN invite_code når det er required, så test-asserts kan
      // bruge strict equal og vi ikke utilsigtet bumser med Better Auth.
      const payload: { name: string; email: string; password: string; invite_code?: string } = {
        name,
        email,
        password
      };
      if (requiresInviteCode) {
        payload.invite_code = inviteCode;
      }
      const result = await authClient.signUp.email(
        payload as Parameters<typeof authClient.signUp.email>[0]
      );
      if (result.error) {
        const code = (result.error as { code?: string }).code;
        if (code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
          setErrorMessage("Den e-mail har allerede en konto. Log ind i stedet.");
        } else if (code === "INVITE_CODE_REQUIRED") {
          setErrorMessage("Forkert eller manglende invitationskode.");
        } else {
          setErrorMessage(result.error.message ?? "Kunne ikke oprette konto.");
        }
        return;
      }
      await refreshSession();
      navigate(appConfig.routes.onboarding);
    } catch {
      setErrorMessage("Forbindelsesfejl. Prøv igen om lidt.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-md px-6 py-14 md:py-20">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={revealVariants(motionMode, "hero")}
      >
        <Card className="p-8 md:p-10" data-testid="signup-card">
          <CardHeader className="px-0 pt-0">
            <p className="noxus-kicker kicker-text mb-2 text-[0.65rem]">Opret medlemskab</p>
            <CardTitle>Bliv medlem af Glød</CardTitle>
            <p className="body-text-muted mt-1 text-sm">
              Vi verificerer alle medlemmer manuelt. Det filtrerer voksent fra resten.
            </p>
          </CardHeader>
          <CardContent className="space-y-5 px-0 pb-0">
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="name">Navn (kun til intern brug)</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Dit fulde navn"
                  required
                  autoComplete="name"
                />
                <p className="text-xs text-[color:var(--color-text-tertiary)]">
                  Dit navn deles aldrig med andre medlemmer. På profilen bruger du et alias.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="dig@eksempel.dk"
                  required
                  autoComplete="email"
                  aria-invalid={errorMessage ? "true" : undefined}
                  aria-describedby={errorMessage ? "signup-form-error" : undefined}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Adgangskode</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Mindst 8 tegn"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>

              {requiresInviteCode && (
                <div className="space-y-2" data-testid="invite-code-field">
                  <Label htmlFor="invite-code">Invitationskode</Label>
                  <Input
                    id="invite-code"
                    type="text"
                    value={inviteCode}
                    onChange={(event) => setInviteCode(event.target.value)}
                    placeholder="Den kode du fik tilsendt"
                    required
                    autoComplete="off"
                  />
                  <p className="text-xs text-[color:var(--color-text-tertiary)]">
                    Glød er lukket for fri tilmelding lige nu. Skriv din invitationskode for at oprette konto.
                  </p>
                </div>
              )}

              <div className="space-y-3 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] p-4">
                <label className="flex items-start gap-3 text-sm">
                  <Checkbox
                    checked={acceptedAge}
                    onCheckedChange={(checked) => setAcceptedAge(checked === true)}
                    className="mt-0.5"
                  />
                  <span>Jeg er fyldt 18 år.</span>
                </label>
                <label className="flex items-start gap-3 text-sm">
                  <Checkbox
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                    className="mt-0.5"
                  />
                  <span>
                    Jeg accepterer{" "}
                    <a className="link-inline" href={appConfig.routes.privacy}>
                      persondatapolitikken
                    </a>
                    ,{" "}
                    <a className="link-inline" href={appConfig.routes.terms}>
                      handelsbetingelserne
                    </a>{" "}
                    og{" "}
                    <a className="link-inline" href={appConfig.routes.codeOfConduct}>
                      code of conduct
                    </a>
                    , og samtykker til at min profil først vises efter manuel verificering.
                  </span>
                </label>
              </div>

              {errorMessage && (
                <Alert id="signup-form-error" role="alert">
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={!canSubmit} className="w-full glow-cta">
                {loading ? "Opretter..." : "Opret medlemskab"}
              </Button>
            </form>

            <p className="text-sm text-[color:var(--color-text-secondary)]">
              Har du allerede en konto?{" "}
              <a href={appConfig.routes.login} className="link-inline">
                Log ind
              </a>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}
