import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { appConfig } from "@/config/app-config";
import { api, type PublicEvent, type PublicOrganization } from "@/lib/api";
import { CATEGORY_LABEL, LEVEL_LABEL, formatDateTime } from "@/lib/event-display";
import { getMotionMode, revealVariants } from "@/lib/motion";
import { navigate } from "@/lib/nav";

export function OrganizationPage() {
  const slug = window.location.pathname.split("/").pop() ?? "";
  const [org, setOrg] = useState<PublicOrganization | null>(null);
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const motionMode = getMotionMode();

  useEffect(() => {
    void (async () => {
      const result = await api.getPublicOrganization(slug);
      setLoading(false);
      if (!result.ok) {
        setNotFound(true);
        return;
      }
      setOrg(result.organization);
      setEvents(result.events);
    })();
  }, [slug]);

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-3xl px-6 py-16">
        <p className="body-text-muted text-sm">Indlæser…</p>
      </section>
    );
  }

  if (notFound || !org) {
    return (
      <section className="mx-auto w-full max-w-md px-6 py-20">
        <Alert className="mb-4">
          <AlertDescription>Arrangøren findes ikke.</AlertDescription>
        </Alert>
        <Button onClick={() => navigate(appConfig.routes.organizations)}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Til arrangører
        </Button>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-10 md:py-16" data-testid="organization-page">
      <motion.div initial="hidden" animate="visible" variants={revealVariants(motionMode, "hero")}>
        <Button
          variant="ghost"
          onClick={() => navigate(appConfig.routes.organizations)}
          className="mb-4"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Alle arrangører
        </Button>

        {org.logo_path && (
          <img
            src={api.organizationLogoUrl(org.slug)}
            alt={org.name}
            className="mb-4 h-24 w-24 rounded-2xl border border-[color:var(--border-subtle)] object-cover"
          />
        )}

        <PageHeader
          kicker="ARRANGØR"
          title={org.name}
          description={org.region ?? undefined}
        />

        {org.description && (
          <p className="mb-8 whitespace-pre-line text-[color:var(--color-text-primary)]">
            {org.description}
          </p>
        )}

        <h2 className="font-display mb-3 text-xl">Kommende events</h2>
        {events.length === 0 ? (
          <p className="body-text-muted text-center">Ingen kommende events lige nu.</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <Card
                key={event.id}
                className="cursor-pointer p-5 transition hover:border-[color:var(--border-strong)]"
                data-testid={`org-public-event-${event.slug}`}
                onClick={() => navigate(`${appConfig.routes.events}/${event.slug}`)}
              >
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{CATEGORY_LABEL[event.category]}</Badge>
                  <Badge variant="outline">{LEVEL_LABEL[event.level]}</Badge>
                </div>
                <p className="mt-1 font-display text-lg">{event.title}</p>
                <p className="text-sm text-[color:var(--color-text-secondary)]">
                  {formatDateTime(event.starts_at)}
                </p>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </section>
  );
}
