import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { appConfig } from "@/config/app-config";
import { api, type EventCategory, type EventLevel, type PublicEvent } from "@/lib/api";
import {
  CATEGORY_LABEL,
  LEVEL_LABEL,
  formatDateTime,
  formatPrice
} from "@/lib/event-display";
import { getMotionMode, revealVariants } from "@/lib/motion";
import { navigate } from "@/lib/nav";

export function EventsPage() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState<EventCategory | "all">("all");
  const [level, setLevel] = useState<EventLevel | "all">("all");
  const [beginner, setBeginner] = useState<"all" | "true" | "false">("all");
  const motionMode = getMotionMode();

  const filters = useMemo(
    () => ({
      category: category === "all" ? undefined : category,
      level: level === "all" ? undefined : level,
      beginner_friendly: beginner === "all" ? undefined : beginner === "true"
    }),
    [category, level, beginner]
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.listEvents(filters).then((result) => {
      if (!active) return;
      if (!result.ok) {
        setError(
          result.code === "UNAUTHORIZED"
            ? "Log ind for at se events."
            : result.code === "VERIFICATION_REQUIRED"
              ? "Du skal være verificeret."
              : "Kunne ikke hente events."
        );
      } else {
        setEvents(result.events);
        setError("");
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [filters]);

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-10 md:py-16">
      <motion.div initial="hidden" animate="visible" variants={revealVariants(motionMode, "hero")}>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="noxus-kicker kicker-text text-[0.65rem]">Begivenheder</p>
            <h1 className="font-display text-3xl">Voksne rum at mødes i</h1>
            <p className="mt-1 max-w-xl text-sm text-[color:var(--color-text-secondary)]">
              Faciliteret af Sexologisk Akademi. Vælg event-type og niveau der passer dig.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate(appConfig.routes.myEvents)}>
            Mine tilmeldinger
          </Button>
        </div>

        <Card className="mb-6 p-5">
          <CardContent className="grid gap-3 px-0 pb-0 pt-0 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-[color:var(--color-text-tertiary)]">
                Type
              </label>
              <Select value={category} onValueChange={(v) => setCategory(v as EventCategory | "all")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="single_only">{CATEGORY_LABEL.single_only}</SelectItem>
                  <SelectItem value="couple_only">{CATEGORY_LABEL.couple_only}</SelectItem>
                  <SelectItem value="mixed">{CATEGORY_LABEL.mixed}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-[color:var(--color-text-tertiary)]">
                Niveau
              </label>
              <Select value={level} onValueChange={(v) => setLevel(v as EventLevel | "all")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="sensual_social">{LEVEL_LABEL.sensual_social}</SelectItem>
                  <SelectItem value="sensual">{LEVEL_LABEL.sensual}</SelectItem>
                  <SelectItem value="explicit">{LEVEL_LABEL.explicit}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-[color:var(--color-text-tertiary)]">
                Erfaring
              </label>
              <Select value={beginner} onValueChange={(v) => setBeginner(v as "all" | "true" | "false")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Vis alle</SelectItem>
                  <SelectItem value="true">Også for første gang</SelectItem>
                  <SelectItem value="false">Kræver erfaring</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <p className="body-text-muted text-center">Henter events…</p>
        ) : events.length === 0 ? (
          <p className="body-text-muted text-center">
            Ingen events lige nu. Kom tilbage senere — eller justér filtrene.
          </p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Card
                key={event.id}
                className="cursor-pointer overflow-hidden p-0 transition-transform hover:scale-[1.01]"
                onClick={() => navigate(`${appConfig.routes.events}/${event.slug}`)}
              >
                <div className="bg-[color:var(--surface-glass)] p-5">
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{CATEGORY_LABEL[event.category]}</Badge>
                    <Badge variant="outline">{LEVEL_LABEL[event.level]}</Badge>
                    {event.beginner_friendly && <Badge variant="outline">Også for første gang</Badge>}
                    {event.experience_required && <Badge variant="outline">Kræver erfaring</Badge>}
                  </div>
                  <h2 className="font-display text-xl">{event.title}</h2>
                  <p className="mt-1 text-xs text-[color:var(--color-text-secondary)]">
                    {formatDateTime(event.starts_at)}
                  </p>
                </div>
                <CardContent className="space-y-3 p-5">
                  <p className="line-clamp-3 text-sm text-[color:var(--color-text-secondary)]">
                    {event.description}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[color:var(--color-text-secondary)]">
                      {event.region ?? "Region oplyses"}
                    </span>
                    <span className="font-display">{formatPrice(event.price_cents)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[color:var(--color-text-tertiary)]">
                    <span>
                      {event.spots_left} af {event.capacity} pladser tilbage
                    </span>
                    {event.is_registered && <Badge variant="secondary">Tilmeldt</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </section>
  );
}
