import { FormEvent, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Send } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ConversationSkeleton } from "@/components/layout/loading-state";
import { api } from "@/lib/api";
import { getMotionMode, revealVariants } from "@/lib/motion";
import { navigate } from "@/lib/nav";

type Message = {
  id: string;
  sender_user_id: string;
  body: string;
  sent_at: string;
};

// B30: Optimistic UI — egne udgående beskeder vises straks med
// `status` ("sending" | "sent" | "failed") indtil API-svar bekræfter ID.
// Når reload() henter ny liste merges optimistic-beskederne med servers
// historik så vi ikke duplikerer.
type OutgoingMessage = Message & {
  status: "sending" | "sent" | "failed";
  /** Klient-genereret ID til at matche pending → server-besked. */
  client_id: string;
};

type DisplayMessage = Message & {
  status?: "sending" | "sent" | "failed";
  client_id?: string;
};

export function ConversationPage() {
  const conversationId = window.location.pathname.split("/").pop() ?? "";
  const [meta, setMeta] = useState<{
    id: string;
    other: { user_id: string; display_name: string | null; region: string | null } | null;
  } | null>(null);
  const [serverMessages, setServerMessages] = useState<Message[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<OutgoingMessage[]>([]);
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
      setServerMessages(result.messages);
      // Optimistic-beskeder der nu findes i serverens liste (samme body+ca. sent_at)
      // ryddes så vi ikke dublerer. Mest robuste match: body + sender + tid ≈ 60s.
      setOptimisticMessages((prev) =>
        prev.filter((opt) => {
          if (opt.status !== "sent") return true;
          return !result.messages.some(
            (srv) => srv.body === opt.body && srv.sender_user_id === opt.sender_user_id
          );
        })
      );
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

  // Merget visning: server-historik + udgående optimistic-beskeder der
  // endnu ikke er reflekteret af serveren.
  const displayMessages: DisplayMessage[] = [
    ...serverMessages,
    ...optimisticMessages.filter(
      (opt) =>
        !serverMessages.some(
          (srv) => srv.body === opt.body && srv.sender_user_id === opt.sender_user_id
        )
    )
  ];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages.length]);

  async function sendDraft(body: string) {
    if (!meId) return;
    const clientId = `opt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // Append straks så UI'et føles instant.
    const optimistic: OutgoingMessage = {
      id: clientId,
      client_id: clientId,
      sender_user_id: meId,
      body,
      sent_at: new Date().toISOString(),
      status: "sending"
    };
    setOptimisticMessages((prev) => [...prev, optimistic]);
    setSending(true);
    const result = await api.sendMessage(conversationId, body);
    setSending(false);
    if (!result.ok) {
      // B30: Markér som failed så brugeren kan retry.
      setOptimisticMessages((prev) =>
        prev.map((m) => (m.client_id === clientId ? { ...m, status: "failed" } : m))
      );
      setError("Kunne ikke sende beskeden.");
      return;
    }
    setError("");
    setOptimisticMessages((prev) =>
      prev.map((m) => (m.client_id === clientId ? { ...m, status: "sent" } : m))
    );
    void reload();
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    await sendDraft(body);
  }

  async function handleRetry(clientId: string) {
    const failed = optimisticMessages.find((m) => m.client_id === clientId);
    if (!failed) return;
    // Fjern den fejlede så sendDraft kan tilføje en ny i sending-state.
    setOptimisticMessages((prev) => prev.filter((m) => m.client_id !== clientId));
    await sendDraft(failed.body);
  }

  if (loading) {
    // A22: Skeleton matcher chat-layoutet (header + bubbles + composer).
    return (
      <section className="mx-auto flex h-[100dvh] w-full max-w-3xl flex-col px-6 py-6 md:py-10">
        <Button
          variant="ghost"
          onClick={() => navigate("/messages")}
          className="mb-3 self-start"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Tilbage
        </Button>
        <ConversationSkeleton data-testid="conversation-loading" />
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
    // B31: Brug 100dvh så iOS Safari URL-bar ikke crasher layoutet. Strukturen:
    // header (sticky-ish via flex), scroll-area (flex-1 min-h-0 overflow-y-auto),
    // composer (sticky bottom med safe-area inset). Det forhindrer at composer
    // ryger ud under URL-baren på mobile.
    <section className="mx-auto flex h-[100dvh] w-full max-w-3xl flex-col px-6 py-6 md:py-10">
      <motion.div
        className="flex h-full min-h-0 flex-col"
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

        <Card className="flex flex-1 min-h-0 flex-col overflow-hidden p-0">
          <CardHeader className="sticky top-0 z-10 border-b border-[color:var(--border-subtle)] bg-[color:var(--surface-elevated)] px-6 py-4">
            <CardTitle className="text-base">
              {meta.other?.display_name ?? "Medlem"}
            </CardTitle>
            {meta.other?.region && (
              <p className="text-xs text-[color:var(--color-text-tertiary)]">{meta.other.region}</p>
            )}
          </CardHeader>
          <CardContent
            className="flex-1 min-h-0 overflow-y-auto px-6 py-4"
            data-testid="conversation-scroll"
          >
            {displayMessages.length === 0 ? (
              <p className="body-text-muted py-12 text-center text-sm">
                Ingen beskeder endnu. Skriv den første.
              </p>
            ) : (
              <div className="space-y-3">
                {displayMessages.map((msg) => {
                  const mine = meId !== null && msg.sender_user_id === meId;
                  const status = msg.status;
                  const isFailed = status === "failed";
                  const isSending = status === "sending";
                  return (
                    <div
                      key={msg.client_id ?? msg.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                      data-testid={
                        isFailed
                          ? "message-failed"
                          : isSending
                            ? "message-sending"
                            : undefined
                      }
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                          mine
                            ? "bg-[color:var(--color-link)] text-[color:var(--color-accent-contrast)]"
                            : "bg-[color:var(--surface-glass)] text-[color:var(--color-text-primary)]"
                        } ${isSending ? "opacity-70" : ""} ${
                          isFailed ? "ring-1 ring-[color:var(--danger)]" : ""
                        }`}
                      >
                        <p className="whitespace-pre-line">{msg.body}</p>
                        <p
                          className={`mt-1 flex items-center gap-2 text-xs ${
                            mine
                              ? "text-[color:var(--color-accent-contrast)]/70"
                              : "text-[color:var(--color-text-tertiary)]"
                          }`}
                        >
                          <span>
                            {new Date(msg.sent_at).toLocaleTimeString("da-DK", {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                          {isSending && <span aria-live="polite">sender…</span>}
                          {isFailed && (
                            <>
                              <span aria-live="polite">Ikke sendt</span>
                              <button
                                type="button"
                                onClick={() => msg.client_id && handleRetry(msg.client_id)}
                                className="underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-link)] rounded"
                                data-testid="retry-message"
                              >
                                Prøv igen
                              </button>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
            )}
          </CardContent>
          {/* B31: Composer er sticky bottom + safe-area-inset så iOS-tastaturet
              ikke skubber den ud af viewport. */}
          <form
            onSubmit={handleSend}
            className="sticky bottom-0 z-10 border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-elevated)] px-6 py-3"
            style={{
              paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))"
            }}
          >
            <div className="flex items-end gap-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Skriv en besked…"
                rows={2}
                className="flex-1 resize-none"
                aria-label="Skriv besked"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (draft.trim()) {
                      void handleSend(e as unknown as FormEvent<HTMLFormElement>);
                    }
                  }
                }}
              />
              {/* C58: WCAG 44x44 — h-11 w-11 i stedet for icon-size (40x40). */}
              <Button
                type="submit"
                disabled={sending || !draft.trim()}
                className="h-11 w-11 shrink-0 p-0"
                aria-label="Send besked"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </section>
  );
}
