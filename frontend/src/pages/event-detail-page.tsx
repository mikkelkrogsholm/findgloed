import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, MapPin } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventThread } from "@/components/event-thread";
import { appConfig } from "@/config/app-config";
import { api, type EventLevel, type PublicEvent } from "@/lib/api";
import {
  CATEGORY_LABEL,
  LEVEL_DESCRIPTION,
  LEVEL_LABEL,
  formatDateTime,
  formatPrice
} from "@/lib/event-display";
import { getMotionMode, revealVariants } from "@/lib/motion";
import { navigate } from "@/lib/nav";

const COC_HASH_BY_LEVEL: Record<EventLevel, string> = {
  sensual_social: "#sensual-social",
  sensual: "#sensual",
  explicit: "#explicit"
};

export function EventDetailPage() {
  const slug = window.location.pathname.split("/").pop() ?? "";
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const motionMode = getMotionMode();

  async function reload() {
    const result = await api.getEvent(slug);
    if (result.ok) {
      setEvent(result.event);
      setError("");
    } else {
      setError(result.code === "NOT_FOUND" ? "Eventet findes ikke." : "Kunne ikke hente eventet.");
    }
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, [slug]);

  async function handleRegister() {
    setSubmitting(true);
    const result = await api.registerEvent(slug);
    setSubmitting(false);
    if (!result.ok) {
      const codeToMessage: Record<string, string> = {
        VERIFICATION_REQUIRED: "Du skal være verificeret for at tilmelde dig.",
        SINGLE_ONLY: "Eventet er kun for singles.",
        COUPLE_ONLY: "Eventet er kun for par.",
        COUPLE_NOT_OPEN_TO_MIXED: "Jeres par er ikke åbent for mixed events. Slå det til på par-profilen.",
        REGISTRATION_FAILED: "Eventet er fyldt eller lukket."
      };
      setError(codeToMessage[result.code] ?? "Kunne ikke tilmelde dig.");
      return;
    }
    void reload();
  }

  async function handleCancel() {
    setSubmitting(true);
    const result = await api.cancelEventRegistration(slug);
    setSubmitting(false);
    if (!result.ok) {
      setError("Kunne ikke afmelde dig.");
      return;
    }
    void reload();
  }

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-3xl px-6 py-20 text-center">
        <p className="body-text-muted">Indlæser…</p>
      </section>
    );
  }

  if (!event) {
    return (
      <section className="mx-auto w-full max-w-md px-6 py-20">
        <Alert className="mb-4">
          <AlertDescription>{error || "Eventet findes ikke."}</AlertDescription>
        </Alert>
        <Button onClick={() => navigate(appConfig.routes.events)}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Til events
        </Button>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-10 md:py-16">
      <motion.div initial="hidden" animate="visible" variants={revealVariants(motionMode, "hero")}>
        <Button
          variant="ghost"
          onClick={() => navigate(appConfig.routes.events)}
          className="mb-4"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Tilbage
        </Button>

        <Card className="overflow-hidden p-0">
          <CardHeader className="px-6 pt-6">
            <div className="mb-3 flex flex-wrap gap-1.5">
              <Badge variant="secondary">{CATEGORY_LABEL[event.category]}</Badge>
              <Badge variant="outline">{LEVEL_LABEL[event.level]}</Badge>
              {event.beginner_friendly && <Badge variant="outline">Også for første gang</Badge>}
              {event.experience_required && <Badge variant="outline">Kræver erfaring</Badge>}
              {event.is_registered && <Badge variant="secondary">Du er tilmeldt</Badge>}
            </div>
            <CardTitle>{event.title}</CardTitle>
            <p className="mt-2 text-sm text-[color:var(--color-text-secondary)]">
              {formatDateTime(event.starts_at)} – {formatDateTime(event.ends_at)}
            </p>
          </CardHeader>
          <CardContent className="space-y-5 px-6 pb-8 pt-2">
            <p className="whitespace-pre-line text-[color:var(--color-text-primary)]">
              {event.description}
            </p>

            <div className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] p-4">
              <p className="text-xs uppercase tracking-wider text-[color:var(--color-text-tertiary)]">
                Niveau: {LEVEL_LABEL[event.level]}
              </p>
              <p className="mt-1 text-sm text-[color:var(--color-text-secondary)]">
                {LEVEL_DESCRIPTION[event.level]}
              </p>
            </div>

            {event.not_for && (
              <div className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] p-4">
                <p className="text-xs uppercase tracking-wider text-[color:var(--color-text-tertiary)]">
                  Hvem eventet IKKE er for
                </p>
                <p className="mt-1 text-sm text-[color:var(--color-text-secondary)]">
                  {event.not_for}
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-[color:var(--color-text-tertiary)]">
                  Vært
                </p>
                <p className="text-sm">{event.facilitator_name}</p>
                {event.facilitator_credential && (
                  <p className="text-xs text-[color:var(--color-text-secondary)]">
                    {event.facilitator_credential}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-[color:var(--color-text-tertiary)]">
                  Pris
                </p>
                <p className="text-sm">{formatPrice(event.price_cents)}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-[color:var(--color-text-tertiary)]">
                  Antal pladser
                </p>
                <p className="text-sm">
                  {event.spots_left} af {event.capacity} tilbage
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-[color:var(--color-text-tertiary)]">
                  Lokation
                </p>
                <p className="text-sm">{event.location_label ?? event.region ?? "Oplyses senere"}</p>
                {event.is_registered && event.location_address && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-[color:var(--color-text-secondary)]">
                    <MapPin className="h-3 w-3" />
                    {event.location_address}
                  </p>
                )}
                {!event.is_registered && (
                  <p className="text-xs text-[color:var(--color-text-tertiary)]">
                    Adresse oplyses efter tilmelding.
                  </p>
                )}
              </div>

              {event.dresscode && (
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wider text-[color:var(--color-text-tertiary)]">
                    Dresscode
                  </p>
                  <p className="text-sm">{event.dresscode}</p>
                </div>
              )}

              {event.exit_strategy && (
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wider text-[color:var(--color-text-tertiary)]">
                    Hvis du vil gå tidligt
                  </p>
                  <p className="text-sm">{event.exit_strategy}</p>
                </div>
              )}
            </div>

            {error && (
              <Alert>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {event.is_registered ? (
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={submitting}
                className="w-full"
              >
                {submitting ? "Afmelder…" : "Afmeld"}
              </Button>
            ) : (
              <Button
                onClick={handleRegister}
                disabled={submitting || event.spots_left === 0}
                className="w-full glow-cta"
              >
                {submitting
                  ? "Tilmelder…"
                  : event.spots_left === 0
                    ? "Eventet er fyldt"
                    : "Tilmeld dig"}
              </Button>
            )}

            <p
              className="text-center text-xs text-[color:var(--color-text-tertiary)]"
              data-testid="event-coc-link"
            >
              <a
                className="link-inline"
                href={`${appConfig.routes.codeOfConduct}${COC_HASH_BY_LEVEL[event.level]}`}
                onClick={(linkEvent) => {
                  linkEvent.preventDefault();
                  navigate(`${appConfig.routes.codeOfConduct}${COC_HASH_BY_LEVEL[event.level]}`);
                }}
              >
                Læs code of conduct for {LEVEL_LABEL[event.level].toLowerCase()}-events →
              </a>
            </p>
          </CardContent>
        </Card>

        {event.is_registered && (
          <div className="mt-6">
            <EventThread slug={event.slug} />
          </div>
        )}
      </motion.div>
    </section>
  );
}
