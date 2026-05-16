import { useEffect, useState } from "react";
import { motion } from "motion/react";

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
import { appConfig } from "@/config/app-config";
import { api, type AdminReport } from "@/lib/api";
import { getMotionMode, revealVariants } from "@/lib/motion";
import { navigate } from "@/lib/nav";

type ResolveStatus = "reviewed" | "dismissed" | "actioned";

const RESOLVE_LABEL: Record<ResolveStatus, string> = {
  reviewed: "Set — ingen handling",
  dismissed: "Afvist",
  actioned: "Handling taget"
};

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
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="noxus-kicker kicker-text text-[0.65rem]">Admin</p>
            <h1 className="font-display text-3xl">Anmeldelser</h1>
            <p className="body-text-muted mt-1 max-w-2xl text-sm">
              Brugeranmeldelser af profiler, beskeder og event-kommentarer.
              Behandl dem hurtigt — også afviste anmeldelser kræver en kort
              note så vi kan dokumentere beslutningen.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate(appConfig.routes.admin)}>
              Til lead-oversigt
            </Button>
            <Button variant="outline" onClick={() => navigate(appConfig.routes.adminVerifications)}>
              Til verifikationer
            </Button>
            <Button variant="outline" onClick={() => navigate(appConfig.routes.adminEvents)}>
              Til events
            </Button>
          </div>
        </div>

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
                    <p>
                      <span className="body-text-muted">Anmeldt event-kommentar: </span>
                      <span className="font-mono">{shortenId(report.reported_event_post_id)}</span>
                    </p>
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
