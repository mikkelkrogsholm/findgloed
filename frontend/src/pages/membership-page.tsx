import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, Receipt, ShieldCheck } from "lucide-react";

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
import { PageHeader } from "@/components/layout/page-header";
import { FormSkeleton } from "@/components/layout/loading-state";
import { appConfig } from "@/config/app-config";
import {
  api,
  type ActiveSubscription,
  type MembershipPlan,
  type SubscriptionEvent
} from "@/lib/api";
import { getMotionMode, revealVariants } from "@/lib/motion";
import { navigate } from "@/lib/nav";

// C29: Mapping fra DB event_type til brugervenlig dansk label.
const EVENT_TYPE_LABELS: Record<string, string> = {
  subscription_started: "Abonnement startet",
  trial_started: "Prøveperiode startet",
  cancellation_scheduled: "Annullering planlagt",
  payment_succeeded: "Betaling gennemført",
  payment_failed: "Betaling fejlede"
};

function eventLabel(eventType: string): string {
  return EVENT_TYPE_LABELS[eventType] ?? eventType.replace(/_/g, " ");
}

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
  const [hasCouple, setHasCouple] = useState(false);
  const [subscription, setSubscription] = useState<ActiveSubscription | null>(null);
  const [activePlan, setActivePlan] = useState<MembershipPlan | null>(null);
  const [events, setEvents] = useState<SubscriptionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const motionMode = getMotionMode();

  async function reload() {
    const [plansResult, subResult, eventsResult] = await Promise.all([
      api.listPlans(),
      api.getMySubscription(),
      api.listSubscriptionEvents()
    ]);
    if (!plansResult.ok) {
      setError(
        plansResult.code === "UNAUTHORIZED" ? "Log ind for at se medlemskab." : "Kunne ikke hente planer."
      );
    } else {
      setPlans(plansResult.plans);
      setHasCouple(plansResult.has_couple);
    }
    if (subResult.ok) {
      setSubscription(subResult.subscription);
      setActivePlan(subResult.plan ?? null);
    }
    if (eventsResult.ok) {
      setEvents(eventsResult.events);
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
        COUPLE_REQUIRED:
          "Par-plan kræver en par-profil. Opret par først under Par-profil.",
        UNAUTHORIZED: "Log ind først."
      };
      setError(messages[result.code] ?? result.message ?? "Kunne ikke starte abonnement.");
      return;
    }
    setSuccess(
      result.mock_notice ?? "Abonnement aktiveret. Velkommen til Glød."
    );
    void reload();
  }

  async function performCancel() {
    if (!subscription) return;
    setCancelDialogOpen(false);
    const result = await api.cancelSubscription(subscription.id);
    if (result.ok) {
      // C28: Vis dato hvis vi har current_period_end så brugeren ved præcis
      // hvornår adgangen stopper. For trials der cancelleres immediate (C27)
      // skifter status til 'cancelled' og adgangen stopper umiddelbart.
      const sub = result.subscription;
      if (sub.status === "cancelled") {
        setSuccess(
          "Abonnementet er annulleret. Du kan altid starte et nyt medlemskab."
        );
      } else if (sub.current_period_end) {
        const date = new Date(sub.current_period_end).toLocaleDateString("da-DK");
        setSuccess(
          `Annullering planlagt. Du har adgang til ${date}. Genoptag når som helst inden da.`
        );
      } else {
        setSuccess("Annullering planlagt — du har adgang indtil periodens udløb.");
      }
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
    // A22: Form-skeleton matcher plan-card-layoutet.
    return (
      <section className="mx-auto w-full max-w-4xl px-6 py-10 md:py-16">
        <PageHeader kicker="Medlemskab" title="Glød er kun for medlemmer" />
        <div className="grid gap-5 md:grid-cols-2">
          <FormSkeleton rows={3} data-testid="membership-loading" />
          <FormSkeleton rows={3} />
        </div>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCancelDialogOpen(true)}
                    data-testid="open-cancel-subscription"
                  >
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
              {hasCouple
                ? "Vi viser både single- og par-planer. Som en del af et par kan I vælge en par-plan, der dækker jer begge."
                : "Vi viser både single- og par-planer. Par-plan kræver at I først opretter par-profilen sammen."}
            </p>
            {(["single", "couple"] as const).map((group) => {
              const groupPlans = plans.filter((p) => p.audience === group);
              if (groupPlans.length === 0) return null;
              const isCoupleGroup = group === "couple";
              const coupleBlocked = isCoupleGroup && !hasCouple;
              return (
                <div key={group} className="mb-6">
                  <h2 className="font-display mb-3 text-xl">
                    {isCoupleGroup ? "Par-planer" : "Single-planer"}
                  </h2>
                  {coupleBlocked && (
                    <p
                      className="mb-3 text-sm text-[color:var(--color-text-tertiary)]"
                      data-testid="couple-plan-blocked-hint"
                    >
                      Opret par-profilen først. Begge parter skal være verificerede medlemmer og
                      acceptere invitationen.
                    </p>
                  )}
                  <div className="grid gap-5 md:grid-cols-2">
                    {groupPlans.map((plan) => (
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
                          {coupleBlocked ? (
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => navigate(appConfig.routes.coupleProfile)}
                              title="Opret par-profil først"
                            >
                              Opret par-profil først
                            </Button>
                          ) : (
                            <Button
                              className="w-full glow-cta"
                              onClick={() => handleStart(plan.id)}
                              disabled={submitting}
                            >
                              {submitting ? "Aktiverer…" : "Vælg denne plan"}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* C29: Aktivitetshistorik vises kun hvis brugeren har events. */}
        {events.length > 0 && (
          <Card className="mt-6 p-5" data-testid="subscription-events">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-base">Aktivitetshistorik</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <ul className="divide-y divide-[color:var(--color-border-subtle,rgba(255,255,255,0.08))]">
                {events.map((event) => (
                  <li
                    key={event.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-sm"
                  >
                    <span className="font-medium">{eventLabel(event.event_type)}</span>
                    <span className="text-xs text-[color:var(--color-text-tertiary)]">
                      {new Date(event.occurred_at).toLocaleString("da-DK", {
                        dateStyle: "short",
                        timeStyle: "short"
                      })}
                      {event.amount_cents !== null && event.amount_cents > 0 && (
                        <span className="ml-2">
                          ({(event.amount_cents / 100).toLocaleString("da-DK")} kr.)
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* B37: Brugervenlig disclaimer uden env-var-navne. Detaljerne om
            Stripe-integration er nu kun synlige i mock_notice-feltet fra API
            (intern logning), ikke i UI. */}
        <Card className="mt-6 p-5">
          <CardContent className="space-y-2 px-0 pb-0">
            <p className="text-xs uppercase tracking-wider text-[color:var(--color-text-tertiary)]">
              Bemærk
            </p>
            <p className="text-sm text-[color:var(--color-text-secondary)]">
              Betaling er endnu ikke aktiveret. Denne version registrerer din
              intention, men du faktureres ikke. Vi sender besked, når faktura
              aktiveres.
            </p>
            <Button variant="ghost" onClick={() => navigate(appConfig.routes.profile)}>
              Til profil
            </Button>
          </CardContent>
        </Card>

        {/* C28: 2-trins Dialog-bekræftelse for cancel (a11y-fix for native confirm).
            Viser dato hvor adgang stopper. For trials forklares at adgang
            stopper umiddelbart (C27). */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent data-testid="cancel-subscription-dialog">
            <DialogHeader>
              <DialogTitle>Annullér abonnementet?</DialogTitle>
              <DialogDescription>
                {subscription?.status === "trialing" ? (
                  <>
                    Du er i prøveperiode og er endnu ikke faktureret. Annullerer
                    du nu, stopper adgangen umiddelbart. Du kan altid starte et
                    nyt medlemskab senere.
                  </>
                ) : subscription?.current_period_end ? (
                  <>
                    Abonnementet stopper{" "}
                    <strong>
                      {new Date(subscription.current_period_end).toLocaleDateString("da-DK")}
                    </strong>
                    . Indtil da har du fuld adgang, og du kan altid genoptage før
                    udløb.
                  </>
                ) : (
                  <>
                    Abonnementet stopper ved periodens udløb. Du har stadig fuld
                    adgang indtil da, og kan altid genoptage før udløb.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setCancelDialogOpen(false)}>
                Fortsæt abonnement
              </Button>
              <Button
                onClick={performCancel}
                data-testid="confirm-cancel-subscription"
              >
                {subscription?.status === "trialing"
                  ? "Annullér prøveperiode"
                  : "Annullér ved periodens udløb"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </section>
  );
}
