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
import { api } from "@/lib/api";
import { getMotionMode, revealVariants } from "@/lib/motion";

type PendingVerification = {
  id: string;
  user_id: string;
  email: string;
  status: string;
  submitted_at: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("da-DK");
}

export function AdminVerificationsPage() {
  const [items, setItems] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rejecting, setRejecting] = useState<PendingVerification | null>(null);
  const [reason, setReason] = useState("");
  const [acting, setActing] = useState(false);

  const motionMode = getMotionMode();

  async function reload() {
    setLoading(true);
    const result = await api.listPendingVerifications();
    if (!result.ok) {
      if (result.code === "FORBIDDEN") {
        setError("Kun for admins.");
      } else if (result.code === "UNAUTHORIZED") {
        setError("Log ind for at se denne side.");
      } else {
        setError("Kunne ikke hente verifikationer.");
      }
      setItems([]);
    } else {
      setItems(result.items);
      setError("");
    }
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, []);

  async function handleApprove(item: PendingVerification) {
    if (!window.confirm(`Godkend verifikation for ${item.email}?`)) {
      return;
    }
    setActing(true);
    setSuccess("");
    setError("");
    const result = await api.approveVerification(item.id);
    setActing(false);
    if (!result.ok) {
      setError(`Kunne ikke godkende: ${result.code}`);
      return;
    }
    setSuccess(`Godkendt: ${item.email}`);
    void reload();
  }

  async function handleReject() {
    if (!rejecting) {
      return;
    }
    if (reason.trim().length === 0) {
      setError("Begrundelse mangler.");
      return;
    }
    setActing(true);
    setSuccess("");
    setError("");
    const result = await api.rejectVerification(rejecting.id, reason.trim());
    setActing(false);
    if (!result.ok) {
      setError(`Kunne ikke afvise: ${result.code}`);
      return;
    }
    setSuccess(`Afvist: ${rejecting.email}`);
    setRejecting(null);
    setReason("");
    void reload();
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-10 md:py-16">
      <motion.div initial="hidden" animate="visible" variants={revealVariants(motionMode, "hero")}>
        <AdminSubnav />

        <PageHeader
          kicker="Admin"
          title="Verifikationer"
          description="Indsendte ID-dokumenter og selfies fra brugere som har bedt om manuel verificering. Vi behandler dem her indtil MitID er live."
          data-testid="admin-verifications-header"
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
        ) : items.length === 0 ? (
          <Card className="p-6">
            <p className="body-text-muted text-center">
              Ingen verifikationer venter på behandling.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.id} className="p-5">
                <CardHeader className="px-0 pt-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="secondary">{item.status}</Badge>
                      </div>
                      <CardTitle className="text-lg">{item.email}</CardTitle>
                      <p className="text-sm text-[color:var(--color-text-secondary)]">
                        Indsendt {formatDate(item.submitted_at)}
                      </p>
                      <p className="text-xs text-[color:var(--color-text-tertiary)]">
                        Bruger-ID: {item.user_id}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(item)}
                        disabled={acting}
                        className="glow-cta"
                      >
                        Godkend
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRejecting(item);
                          setReason("");
                          setError("");
                        }}
                        disabled={acting}
                      >
                        Afvis
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 px-0 pb-0 md:grid-cols-2">
                  <figure className="space-y-1">
                    <figcaption className="body-text-muted text-xs">
                      ID-dokument
                    </figcaption>
                    <img
                      src={api.asset(
                        `/api/admin/verifications/${item.id}/files/id`
                      )}
                      alt={`ID for ${item.email}`}
                      className="w-full rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] object-cover"
                      loading="lazy"
                    />
                  </figure>
                  <figure className="space-y-1">
                    <figcaption className="body-text-muted text-xs">
                      Selfie
                    </figcaption>
                    <img
                      src={api.asset(
                        `/api/admin/verifications/${item.id}/files/selfie`
                      )}
                      alt={`Selfie for ${item.email}`}
                      className="w-full rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] object-cover"
                      loading="lazy"
                    />
                  </figure>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>

      <Dialog
        open={rejecting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejecting(null);
            setReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Afvis verifikation</DialogTitle>
            <DialogDescription>
              Skriv en kort begrundelse — den gemmes internt så vi kan svare
              brugeren konsistent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Begrundelse</Label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              placeholder="ID kunne ikke aflæses, selfie matchede ikke ID, …"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setRejecting(null);
                setReason("");
              }}
              disabled={acting}
            >
              Annullér
            </Button>
            <Button onClick={handleReject} disabled={acting} className="glow-cta">
              {acting ? "Afviser…" : "Afvis"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
