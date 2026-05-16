import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, Receipt, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { appConfig } from "@/config/app-config";
import { api, type ActiveSubscription, type MembershipPlan } from "@/lib/api";
import { getMotionMode, revealVariants } from "@/lib/motion";
import { navigate } from "@/lib/nav";

function formatPrice(cents: number): string {
  return `${(cents / 100).toLocaleString("da-DK")} kr.`;
}

function planSummary(plan: MembershipPlan): string {
  if (plan.trial_days > 0) {
    return `${plan.trial_days} dages gratis prøve, herefter ${formatPrice(plan.monthly_price_cents)}/md.`;
  }
  if (plan.intro_price_cents !== null && plan.intro_months > 0) {
    return `${formatPrice(plan.intro_price_cents)} første ${plan.intro_months === 1 ? "måned" : `${plan.intro_months} måneder`}, herefter ${formatPrice(plan.monthly_price_cents)}/md.`;
  }
  return `${formatPrice(plan.monthly_price_cents)}/md.`;
}

export function MembershipPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [audience, setAudience] = useState<"single" | "couple">("single");
  const [subscription, setSubscription] = useState<ActiveSubscription | null>(null);
  const [activePlan, setActivePlan] = useState<MembershipPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const motionMode = getMotionMode();

  async function reload() {
    const [plansResult, subResult] = await Promise.all([api.listPlans(), api.getMySubscription()]);
    if (!plansResult.ok) {
      setError(
        plansResult.code === "UNAUTHORIZED" ? "Log ind for at se medlemskab." : "Kunne ikke hente planer."
      );
    } else {
      setPlans(plansResult.plans);
      setAudience(plansResult.audience);
    }
    if (subResult.ok) {
      setSubscription(subResult.subscription);
      setActivePlan(subResult.plan ?? null);
    }
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, []);

  async function handleStart(planId: string) {
    setSubmitting(true);
    setError("");
    setSuccess("");
    const result = await api.startSubscription(planId);
    setSubmitting(false);
    if (!result.ok) {
      const messages: Record<string, string> = {
        ALREADY_ACTIVE: "Du har allerede et aktivt abonnement.",
        COUPLE_REQUIRED: "Par-plan kræver en par-profil. Opret den under profil først.",
        UNAUTHORIZED: "Log ind først."
      };
      setError(messages[result.code] ?? "Kunne ikke starte abonnement.");
      return;
    }
    setSuccess(
      result.mock_notice ?? "Abonnement aktiveret. Velkommen til Glød."
    );
    void reload();
  }

  async function handleCancel() {
    if (!subscription) return;
    if (!window.confirm("Annuller abonnementet ved næste fornyelse?")) return;
    const result = await api.cancelSubscription(subscription.id);
    if (result.ok) {
      setSuccess("Annullering planlagt — du har adgang indtil periodens udløb.");
      void reload();
    }
  }

  async function handleResume() {
    if (!subscription) return;
    const result = await api.resumeSubscription(subscription.id);
    if (result.ok) {
      setSuccess("Abonnement genoptaget.");
      void reload();
    }
  }

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-md px-6 py-20 text-center">
        <p className="body-text-muted">Indlæser…</p>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-10 md:py-16">
      <motion.div initial="hidden" animate="visible" variants={revealVariants(motionMode, "hero")}>
        <div className="mb-6">
          <p className="noxus-kicker kicker-text text-[0.65rem]">Medlemskab</p>
          <h1 className="font-display text-3xl">Glød er kun for medlemmer</h1>
          <p className="mt-1 max-w-xl text-sm text-[color:var(--color-text-secondary)]">
            Et medlemskab er det filter der holder Glød voksent. Du kan annullere når som helst.
          </p>
        </div>

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

        {subscription && (
          <Card className="mb-6 p-6">
            <CardHeader className="px-0 pt-0">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <CardTitle>Dit medlemskab</CardTitle>
                <Badge variant="secondary">{subscription.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-0 pb-0">
              {activePlan && (
                <p className="text-sm">
                  <strong>{activePlan.name}</strong> — {planSummary(activePlan)}
                </p>
              )}
              {subscription.trial_ends_at && (
                <p className="text-xs text-[color:var(--color-text-tertiary)]">
                  Prøveperiode slutter:{" "}
                  {new Date(subscription.trial_ends_at).toLocaleDateString("da-DK")}
                </p>
              )}
              {subscription.current_period_end && (
                <p className="text-xs text-[color:var(--color-text-tertiary)]">
                  Næste fornyelse:{" "}
                  {new Date(subscription.current_period_end).toLocaleDateString("da-DK")}
                </p>
              )}
              <p className="flex items-center gap-2 text-xs text-[color:var(--color-text-secondary)]">
                <Receipt className="h-3 w-3" />
                Faktura-tekst på dit kontoudtog: <code>{subscription.invoice_descriptor}</code>
              </p>
              <div className="flex gap-2">
                {subscription.cancel_at_period_end ? (
                  <Button variant="outline" size="sm" onClick={handleResume}>
                    Genoptag abonnement
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    Annullér ved periodens udløb
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {!subscription && (
          <>
            <p className="mb-4 text-sm text-[color:var(--color-text-secondary)]">
              {audience === "couple"
                ? "Vi kan se du er på en par-profil — her er par-planer."
                : "Vi kan se du ikke er i en par-profil endnu — her er single-planer. Opret par-profil først hvis I skal have par-plan."}
            </p>
            <div className="grid gap-5 md:grid-cols-2">
              {plans.map((plan) => (
                <Card key={plan.id} className="overflow-hidden p-0">
                  <CardHeader className="bg-[color:var(--surface-glass)] p-6">
                    <CardTitle>{plan.name}</CardTitle>
                    <p className="mt-1 text-sm text-[color:var(--color-text-secondary)]">
                      {planSummary(plan)}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3 p-6">
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-[color:var(--color-link)]" />
                        Adgang til alle medlemmer (verificerede)
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-[color:var(--color-link)]" />
                        Direkte beskeder ved gensidig interesse
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-[color:var(--color-link)]" />
                        Tilmelding til events (events betales særskilt)
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-[color:var(--color-link)]" />
                        Diskret faktura-tekst ("GLOEDDK")
                      </li>
                      <li className="flex items-start gap-2">
                        <ShieldCheck className="mt-0.5 h-4 w-4 text-[color:var(--color-link)]" />
                        Annullér når som helst — ingen binding
                      </li>
                    </ul>
                    <Button
                      className="w-full glow-cta"
                      onClick={() => handleStart(plan.id)}
                      disabled={submitting}
                    >
                      {submitting ? "Aktiverer…" : "Vælg denne plan"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        <Card className="mt-6 p-5">
          <CardContent className="space-y-2 px-0 pb-0">
            <p className="text-xs uppercase tracking-wider text-[color:var(--color-text-tertiary)]">
              Bemærk
            </p>
            <p className="text-sm text-[color:var(--color-text-secondary)]">
              Stripe er ikke aktiveret endnu — alle abonnementer i denne version er mock og du
              faktureres ikke. Når Stripe-nøglerne er sat (env vars{" "}
              <code>STRIPE_SECRET_KEY</code> og <code>STRIPE_WEBHOOK_SECRET</code>) overtager
              den rigtige integration.
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
