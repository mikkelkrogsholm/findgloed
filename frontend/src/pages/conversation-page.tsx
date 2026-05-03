import { FormEvent, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Send } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { getMotionMode, revealVariants } from "@/lib/motion";
import { navigate } from "@/lib/nav";

type Message = {
  id: string;
  sender_user_id: string;
  body: string;
  sent_at: string;
};

export function ConversationPage() {
  const conversationId = window.location.pathname.split("/").pop() ?? "";
  const [meta, setMeta] = useState<{
    id: string;
    other: { user_id: string; display_name: string | null; region: string | null } | null;
  } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);
  const motionMode = getMotionMode();
  const endRef = useRef<HTMLDivElement>(null);

  async function reload() {
    const me = await api.getMe();
    if (me.ok) setMeId(me.profile.user_id);

    const result = await api.getConversation(conversationId);
    if (!result.ok) {
      setError(result.code === "FORBIDDEN" ? "Ingen adgang." : "Kunne ikke hente samtalen.");
    } else {
      setMeta({ id: result.conversation.id, other: result.conversation.other });
      setMessages(result.messages);
      setError("");
    }
    setLoading(false);
  }

  useEffect(() => {
    void reload();
    const interval = setInterval(() => {
      void reload();
    }, 8000);
    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    const result = await api.sendMessage(conversationId, draft.trim());
    setSending(false);
    if (!result.ok) {
      setError("Kunne ikke sende beskeden.");
      return;
    }
    setDraft("");
    void reload();
  }

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-md px-6 py-20 text-center">
        <p className="body-text-muted">Indlæser…</p>
      </section>
    );
  }

  if (!meta) {
    return (
      <section className="mx-auto w-full max-w-md px-6 py-20">
        <Alert className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => navigate("/messages")}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Til beskeder
        </Button>
      </section>
    );
  }

  return (
    <section className="mx-auto flex h-[calc(100dvh-12rem)] w-full max-w-3xl flex-col px-6 py-6 md:py-10">
      <motion.div
        className="flex h-full flex-col"
        initial="hidden"
        animate="visible"
        variants={revealVariants(motionMode, "hero")}
      >
        <Button
          variant="ghost"
          onClick={() => navigate("/messages")}
          className="mb-3 self-start"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Tilbage
        </Button>

        <Card className="flex flex-1 flex-col overflow-hidden p-0">
          <CardHeader className="border-b border-[color:var(--border-subtle)] px-6 py-4">
            <CardTitle className="text-base">
              {meta.other?.display_name ?? "Medlem"}
            </CardTitle>
            {meta.other?.region && (
              <p className="text-xs text-[color:var(--color-text-tertiary)]">{meta.other.region}</p>
            )}
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto px-6 py-4">
            {messages.length === 0 ? (
              <p className="body-text-muted py-12 text-center text-sm">
                Ingen beskeder endnu. Skriv den første.
              </p>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const mine = meId !== null && msg.sender_user_id === meId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                          mine
                            ? "bg-[color:var(--color-link)] text-[color:var(--color-accent-contrast)]"
                            : "bg-[color:var(--surface-glass)] text-[color:var(--color-text-primary)]"
                        }`}
                      >
                        <p className="whitespace-pre-line">{msg.body}</p>
                        <p
                          className={`mt-1 text-xs ${
                            mine
                              ? "text-[color:var(--color-accent-contrast)]/70"
                              : "text-[color:var(--color-text-tertiary)]"
                          }`}
                        >
                          {new Date(msg.sent_at).toLocaleTimeString("da-DK", {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
            )}
          </CardContent>
          <form
            onSubmit={handleSend}
            className="border-t border-[color:var(--border-subtle)] px-6 py-3"
          >
            <div className="flex gap-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Skriv en besked…"
                rows={2}
                className="flex-1 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (draft.trim()) {
                      void handleSend(e as unknown as FormEvent<HTMLFormElement>);
                    }
                  }
                }}
              />
              <Button type="submit" disabled={sending || !draft.trim()} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </section>
  );
}
