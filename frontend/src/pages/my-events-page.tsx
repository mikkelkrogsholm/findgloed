import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { appConfig } from "@/config/app-config";
import { api, type PublicEvent } from "@/lib/api";
import { CATEGORY_LABEL, LEVEL_LABEL, formatDateTime } from "@/lib/event-display";
import { getMotionMode, revealVariants } from "@/lib/motion";
import { navigate } from "@/lib/nav";

type Registration = {
  id: string;
  status: string;
  registered_at: string;
  event: PublicEvent;
};

export function MyEventsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const motionMode = getMotionMode();

  useEffect(() => {
    let active = true;
    api.myEvents().then((result) => {
      if (!active) return;
      if (!result.ok) {
        setError(
          result.code === "UNAUTHORIZED" ? "Log ind for at se dine tilmeldinger." : "Kunne ikke hente."
        );
      } else {
        setRegistrations(result.registrations);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-10 md:py-16">
      <motion.div initial="hidden" animate="visible" variants={revealVariants(motionMode, "hero")}>
        <Button
          variant="ghost"
          onClick={() => navigate(appConfig.routes.events)}
          className="mb-4"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Til alle events
        </Button>

        <h1 className="mb-6 font-display text-3xl">Mine tilmeldinger</h1>

        {error && (
          <Alert className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <p className="body-text-muted text-center">Henter…</p>
        ) : registrations.length === 0 ? (
          <p className="body-text-muted text-center">
            Du er ikke tilmeldt nogen events endnu.
          </p>
        ) : (
          <div className="space-y-4">
            {registrations.map((reg) => (
              <Card
                key={reg.id}
                className="cursor-pointer p-5 transition-transform hover:scale-[1.005]"
                onClick={() => navigate(`${appConfig.routes.events}/${reg.event.slug}`)}
              >
                <CardHeader className="px-0 pt-0">
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{CATEGORY_LABEL[reg.event.category]}</Badge>
                    <Badge variant="outline">{LEVEL_LABEL[reg.event.level]}</Badge>
                    <Badge variant="outline">{reg.status}</Badge>
                  </div>
                  <CardTitle className="text-lg">{reg.event.title}</CardTitle>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  <p className="text-sm text-[color:var(--color-text-secondary)]">
                    {formatDateTime(reg.event.starts_at)}
                  </p>
                  <p className="text-xs text-[color:var(--color-text-tertiary)]">
                    {reg.event.location_label ?? reg.event.region}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </section>
  );
}
