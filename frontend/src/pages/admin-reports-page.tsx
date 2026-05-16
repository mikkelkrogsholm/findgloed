import { useEffect, useState } from "react";
import { motion } from "motion/react";

import { AdminSubnav } from "@/components/admin/admin-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { api, type AdminReport } from "@/lib/api";
import { getMotionMode, revealVariants } from "@/lib/motion";

type ResolveStatus = "reviewed" | "dismissed" | "actioned";

const RESOLVE_LABEL: Record<ResolveStatus, string> = {
  reviewed: "Set — ingen handling",
  dismissed: "Afvist",
  actioned: "Handling taget"
};

// B17: state for de event-post-previews der hentes lazy pr. report.
// "loading" mens fetch er undervejs, EventPostPreview ved success,
// "error" hvis 404/network, "hidden" når admin har skjult posten.
type EventPostPreview = {
  id: string;
  body: string;
  posted_at: string;
  hidden_by_admin_at: string | null;
  author_user_id: string;
};

type EventPostState = "loading" | "error" | "hiding" | "hidden" | EventPostPreview;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("da-DK");
}

function shortenId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

export function AdminReportsPage() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resolving, setResolving] = useState<AdminReport | null>(null);
  const [status, setStatus] = useState<ResolveStatus>("reviewed");
  const [notes, setNotes] = useState("");
  const [acting, setActing] = useState(false);

  // B17: preview-state for event-post reports. Key er post-id, ikke
  // report-id, så samme post kun fetches én gang selv hvis flere reports
  // peger på den.
  const [postPreviews, setPostPreviews] = useState<Record<string, EventPostState>>({});

  const motionMode = getMotionMode();

  async function reload() {
    setLoading(true);
    const result = await api.listAdminReports();
    if (!result.ok) {
      if (result.code === "FORBIDDEN") {
        setError("Kun for admins.");
      } else if (result.code === "UNAUTHORIZED") {
        setError("Log ind for at se denne side.");
      } else {
        setError("Kunne ikke hente anmeldelser.");
      }
      setReports([]);
    } else {
      setReports(result.reports);
      setError("");
    }
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, []);

  // B17: når reports loaded — hent preview for hver post-rapport hvis
  // ikke allerede cached. Vi sætter "loading" først så UI viser
  // skeleton mens fetch er undervejs.
  useEffect(() => {
    const ids = Array.from(
      new Set(
        reports
          .map((r) => r.reported_event_post_id)
          .filter((id): id is string => id !== null)
      )
    );
    const toFetch = ids.filter((id) => !postPreviews[id]);
    if (toFetch.length === 0) return;

    setPostPreviews((prev) => {
      const next = { ...prev };
      for (const id of toFetch) {
        next[id] = "loading";
      }
      return next;
    });

    let cancelled = false;
    for (const id of toFetch) {
      void (async () => {
        const result = await api.getAdminEventPost(id);
        if (cancelled) return;
        if (!result.ok) {
          setPostPreviews((prev) => ({ ...prev, [id]: "error" }));
          return;
        }
        const preview: EventPostPreview = {
          id: result.post.id,
          body: result.post.body,
          posted_at: result.post.posted_at,
          hidden_by_admin_at: result.post.hidden_by_admin_at,
          author_user_id: result.post.author_user_id
        };
        if (result.post.hidden_by_admin_at) {
          setPostPreviews((prev) => ({ ...prev, [id]: "hidden" }));
        } else {
          setPostPreviews((prev) => ({ ...prev, [id]: preview }));
        }
      })();
    }
    return () => {
      cancelled = true;
    };
  }, [reports, postPreviews]);

  async function handleHidePost(postId: string) {
    setPostPreviews((prev) => ({ ...prev, [postId]: "hiding" }));
    setError("");
    const result = await api.hideAdminEventPost(postId);
    if (!result.ok) {
      setError(`Kunne ikke skjule kommentaren: ${result.code}`);
      // Genhent posten så preview vender tilbage til synlig tilstand.
      const fresh = await api.getAdminEventPost(postId);
      if (fresh.ok) {
        const preview: EventPostPreview = {
          id: fresh.post.id,
          body: fresh.post.body,
          posted_at: fresh.post.posted_at,
          hidden_by_admin_at: fresh.post.hidden_by_admin_at,
          author_user_id: fresh.post.author_user_id
        };
        setPostPreviews((prev) => ({
          ...prev,
          [postId]: fresh.post.hidden_by_admin_at ? "hidden" : preview
        }));
      } else {
        setPostPreviews((prev) => ({ ...prev, [postId]: "error" }));
      }
      return;
    }
    setPostPreviews((prev) => ({ ...prev, [postId]: "hidden" }));
    setSuccess("Kommentaren er skjult.");
  }

  async function handleResolve() {
    if (!resolving) {
      return;
    }
    setActing(true);
    setSuccess("");
    setError("");
    const result = await api.resolveAdminReport(
      resolving.id,
      status,
      notes.trim() || undefined
    );
    setActing(false);
    if (!result.ok) {
      setError(`Kunne ikke afslutte: ${result.code}`);
      return;
    }
    setSuccess(`Anmeldelse afsluttet (${RESOLVE_LABEL[status]}).`);
    setResolving(null);
    setNotes("");
    setStatus("reviewed");
    void reload();
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-10 md:py-16">
      <motion.div initial="hidden" animate="visible" variants={revealVariants(motionMode, "hero")}>
        <AdminSubnav />

        <PageHeader
          kicker="Admin"
          title="Anmeldelser"
          description="Brugeranmeldelser af profiler, beskeder og event-kommentarer. Behandl dem hurtigt — også afviste anmeldelser kræver en kort note så vi kan dokumentere beslutningen."
          data-testid="admin-reports-header"
        />

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

        {loading ? (
          <p className="body-text-muted text-center">Henter…</p>
        ) : reports.length === 0 ? (
          <Card className="p-6">
            <p className="body-text-muted text-center">
              Ingen åbne anmeldelser. Roen er på vores side.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <Card key={report.id} className="p-5">
                <CardHeader className="px-0 pt-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="secondary">{report.status}</Badge>
                        <Badge variant="outline">{report.reason}</Badge>
                      </div>
                      <CardTitle className="text-base">
                        Anmeldelse #{shortenId(report.id)}
                      </CardTitle>
                      <p className="text-sm text-[color:var(--color-text-secondary)]">
                        Indsendt {formatDate(report.created_at)}
                      </p>
                    </div>
                    <div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setResolving(report);
                          setStatus("reviewed");
                          setNotes("");
                          setError("");
                        }}
                        disabled={acting}
                        className="glow-cta"
                      >
                        Afslut
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 px-0 pb-0 text-sm">
                  <p>
                    <span className="body-text-muted">Anmelder: </span>
                    <span className="font-mono">{shortenId(report.reporter_user_id)}</span>
                  </p>
                  {report.reported_user_id && (
                    <p>
                      <span className="body-text-muted">Anmeldt bruger: </span>
                      <span className="font-mono">{shortenId(report.reported_user_id)}</span>
                    </p>
                  )}
                  {report.reported_message_id && (
                    <p>
                      <span className="body-text-muted">Anmeldt besked: </span>
                      <span className="font-mono">{shortenId(report.reported_message_id)}</span>
                    </p>
                  )}
                  {report.reported_event_post_id && (
                    <div className="space-y-2">
                      <p>
                        <span className="body-text-muted">Anmeldt event-kommentar: </span>
                        <span className="font-mono">{shortenId(report.reported_event_post_id)}</span>
                      </p>
                      {(() => {
                        const previewState = postPreviews[report.reported_event_post_id];
                        if (!previewState || previewState === "loading") {
                          return (
                            <div
                              className="rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] p-3"
                              data-testid={`event-post-preview-loading-${report.reported_event_post_id}`}
                            >
                              <p className="body-text-muted text-xs">
                                Henter kommentar…
                              </p>
                            </div>
                          );
                        }
                        if (previewState === "error") {
                          return (
                            <Alert>
                              <AlertDescription>
                                Kunne ikke hente kommentaren.
                              </AlertDescription>
                            </Alert>
                          );
                        }
                        if (previewState === "hidden") {
                          return (
                            <div
                              className="rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] p-3"
                              data-testid={`event-post-preview-hidden-${report.reported_event_post_id}`}
                            >
                              <p className="body-text-muted text-xs">
                                Kommentaren er skjult af admin.
                              </p>
                            </div>
                          );
                        }
                        if (previewState === "hiding") {
                          return (
                            <div className="rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] p-3">
                              <p className="body-text-muted text-xs">
                                Skjuler kommentar…
                              </p>
                            </div>
                          );
                        }
                        // previewState er en EventPostPreview
                        const postId = report.reported_event_post_id;
                        return (
                          <div
                            className="space-y-2 rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] p-3"
                            data-testid={`event-post-preview-${postId}`}
                          >
                            <p className="body-text-muted text-xs">
                              Kommentar
                            </p>
                            <p className="whitespace-pre-line">{previewState.body}</p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleHidePost(postId)}
                              data-testid={`hide-event-post-${postId}`}
                            >
                              Skjul kommentar
                            </Button>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {report.details && (
                    <div className="mt-2 rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] p-3">
                      <p className="body-text-muted text-xs">Detaljer</p>
                      <p className="whitespace-pre-line">{report.details}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>

      <Dialog
        open={resolving !== null}
        onOpenChange={(open) => {
          if (!open) {
            setResolving(null);
            setNotes("");
            setStatus("reviewed");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Afslut anmeldelse</DialogTitle>
            <DialogDescription>
              Vælg en konklusion og tilføj evt. en intern note. Noter er kun
              synlige for admins.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Konklusion</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as ResolveStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reviewed">{RESOLVE_LABEL.reviewed}</SelectItem>
                  <SelectItem value="dismissed">{RESOLVE_LABEL.dismissed}</SelectItem>
                  <SelectItem value="actioned">{RESOLVE_LABEL.actioned}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="resolution-notes">Intern note (valgfri)</Label>
              <Textarea
                id="resolution-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                placeholder="Talt med begge parter, brugeren accepterede advarsel, …"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setResolving(null);
                setNotes("");
                setStatus("reviewed");
              }}
              disabled={acting}
            >
              Annullér
            </Button>
            <Button onClick={handleResolve} disabled={acting} className="glow-cta">
              {acting ? "Afslutter…" : "Afslut anmeldelse"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
