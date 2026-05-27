import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Mail, Sparkles } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { SkeletonGrid } from "@/components/layout/loading-state";
import { appConfig } from "@/config/app-config";
import { api, type ConversationSummary } from "@/lib/api";
import { getMotionMode, revealVariants } from "@/lib/motion";
import { navigate } from "@/lib/nav";

export function MessagesPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const motionMode = getMotionMode();

  useEffect(() => {
    let active = true;
    api.listConversations().then((result) => {
      if (!active) return;
      if (!result.ok) {
        setError(
          result.code === "VERIFICATION_REQUIRED"
            ? "Du skal være verificeret for at sende beskeder."
            : "Kunne ikke hente samtaler."
        );
      } else {
        setConversations(result.conversations);
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
        <PageHeader
          kicker="Beskeder"
          title="Dine samtaler"
          description="Samtaler åbnes ved gensidig interesse eller når I begge deltager i samme event."
        />

        {error && (
          <Alert className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <SkeletonGrid variant="messages" count={4} data-testid="messages-loading" />
        ) : conversations.length === 0 ? (
          <Card className="p-8 text-center">
            <CardContent className="space-y-3 px-0 pb-0">
              <Mail className="mx-auto h-8 w-8 text-[color:var(--color-text-tertiary)]" />
              <p className="text-sm text-[color:var(--color-text-secondary)]">
                Ingen samtaler endnu. Vis interesse for et medlem fra{" "}
                <button
                  type="button"
                  className="link-inline"
                  onClick={() => navigate(appConfig.routes.members)}
                >
                  medlemsbrowseren
                </button>{" "}
                eller deltag i et event.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => {
              const convHref = `/messages/${conv.id}`;
              const convLabel = conv.other.display_name ?? "Medlem";
              return (
                // A20: Hele rækken er en <a> så tastatur-fokus virker uden hack.
                <Card
                  key={conv.id}
                  className="p-0 transition-transform hover:scale-[1.005] focus-within:ring-2 focus-within:ring-[color:var(--color-link)] focus-within:ring-offset-2 focus-within:ring-offset-[color:var(--color-bg-base)]"
                >
                  <a
                    href={convHref}
                    onClick={(e) => {
                      if (
                        e.defaultPrevented ||
                        e.metaKey ||
                        e.ctrlKey ||
                        e.shiftKey ||
                        e.button !== 0
                      ) {
                        return;
                      }
                      e.preventDefault();
                      navigate(convHref);
                    }}
                    className="block p-5 focus:outline-none"
                    aria-label={`Åbn samtale med ${convLabel}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-display text-base">{convLabel}</p>
                          {conv.origin === "shared_event" && (
                            <Badge variant="outline">
                              <Sparkles className="mr-1 h-3 w-3" />
                              Fælles event
                            </Badge>
                          )}
                          {conv.origin === "mutual_interest" && (
                            <Badge variant="outline">Gensidig interesse</Badge>
                          )}
                        </div>
                        {conv.other.region && (
                          <p className="text-xs text-[color:var(--color-text-tertiary)]">
                            {conv.other.region}
                          </p>
                        )}
                      </div>
                      {conv.unread_count > 0 && (
                        <Badge variant="secondary">{conv.unread_count} nye</Badge>
                      )}
                    </div>
                  </a>
                </Card>
              );
            })}
          </div>
        )}
      </motion.div>
    </section>
  );
}
