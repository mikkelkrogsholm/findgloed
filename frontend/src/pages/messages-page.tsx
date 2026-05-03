import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Mail, Sparkles } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
        <div className="mb-6">
          <p className="noxus-kicker kicker-text text-[0.65rem]">Beskeder</p>
          <h1 className="font-display text-3xl">Dine samtaler</h1>
          <p className="mt-1 max-w-xl text-sm text-[color:var(--color-text-secondary)]">
            Samtaler åbnes ved gensidig interesse eller når I begge deltager i samme event.
          </p>
        </div>

        {error && (
          <Alert className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <p className="body-text-muted text-center">Henter…</p>
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
            {conversations.map((conv) => (
              <Card
                key={conv.id}
                className="cursor-pointer p-5 transition-transform hover:scale-[1.005]"
                onClick={() => navigate(`/messages/${conv.id}`)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-display text-base">
                        {conv.other.display_name ?? "Medlem"}
                      </p>
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
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </section>
  );
}
