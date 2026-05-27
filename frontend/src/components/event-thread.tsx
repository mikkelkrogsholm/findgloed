import { FormEvent, useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

type Post = {
  id: string;
  author: { user_id: string; display_name: string | null };
  body: string;
  posted_at: string;
  can_delete: boolean;
};

export function EventThread({ slug }: { slug: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [allowed, setAllowed] = useState(true);
  // Dialog erstatter window.confirm (a11y-fix).
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  async function reload() {
    const result = await api.listEventPosts(slug);
    if (!result.ok) {
      if (result.code === "VERIFICATION_REQUIRED" || result.code === "FORBIDDEN") {
        setAllowed(false);
      } else {
        setError("Kunne ikke hente tråden.");
      }
    } else {
      setPosts(result.posts);
      setError("");
    }
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, [slug]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim()) return;
    setSubmitting(true);
    const result = await api.postEventComment(slug, draft.trim());
    setSubmitting(false);
    if (!result.ok) {
      setError(
        result.code === "PARTICIPATION_REQUIRED"
          ? "Kun tilmeldte kan poste i tråden."
          : "Kunne ikke poste."
      );
      return;
    }
    setDraft("");
    void reload();
  }

  async function performDelete() {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    const result = await api.deleteEventPost(slug, id);
    if (result.ok) void reload();
  }

  if (loading) {
    return (
      <Card className="p-5">
        <p className="body-text-muted text-center text-sm">Henter tråd…</p>
      </Card>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <Card className="p-6">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-lg">Diskussion</CardTitle>
        <p className="text-xs text-[color:var(--color-text-tertiary)]">
          En tråd til at fortsætte samtalen før og efter aftenen.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 px-0 pb-0">
        {error && (
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form className="space-y-2" onSubmit={handleSubmit}>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="Stil et spørgsmål eller del en tanke…"
            maxLength={1500}
            aria-label="Skriv kommentar"
          />
          <Button type="submit" disabled={submitting || !draft.trim()} size="sm">
            {submitting ? "Sender…" : "Send"}
          </Button>
        </form>

        {posts.length === 0 ? (
          <p className="body-text-muted py-4 text-center text-sm">
            Ingen kommentarer endnu.
          </p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] p-4"
              >
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-display text-sm">
                    {post.author.display_name ?? "Anonym"}
                  </p>
                  <p className="text-xs text-[color:var(--color-text-tertiary)]">
                    {new Date(post.posted_at).toLocaleString("da-DK", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                </div>
                <p className="whitespace-pre-line text-sm text-[color:var(--color-text-primary)]">
                  {post.body}
                </p>
                {post.can_delete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPendingDeleteId(post.id)}
                    className="mt-2"
                    data-testid={`delete-post-${post.id}`}
                  >
                    Slet
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Slet-kommentar Dialog (erstatter native window.confirm). */}
      <Dialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
      >
        <DialogContent data-testid="delete-comment-dialog">
          <DialogHeader>
            <DialogTitle>Slet din kommentar?</DialogTitle>
            <DialogDescription>
              Kommentaren fjernes fra tråden. Det kan ikke fortrydes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingDeleteId(null)}>
              Annullér
            </Button>
            <Button onClick={performDelete} data-testid="confirm-delete-comment">
              Slet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
