import { useEffect, useState } from "react";
import { motion } from "motion/react";

import { AdminEventForm } from "@/components/admin/admin-event-form";
import { AdminSubnav } from "@/components/admin/admin-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type AdminEvent, type AdminEventInput } from "@/lib/api";
import { CATEGORY_LABEL, LEVEL_LABEL, formatDateTime } from "@/lib/event-display";
import { getMotionMode, revealVariants } from "@/lib/motion";

const EMPTY_FORM: AdminEventInput = {
  slug: "",
  title: "",
  description: "",
  not_for: "",
  category: "single_only",
  level: "sensual_social",
  beginner_friendly: false,
  experience_required: false,
  facilitator_name: "",
  facilitator_credential: "",
  starts_at: "",
  ends_at: "",
  capacity: 12,
  price_cents: 0,
  region: "",
  location_label: "",
  location_address: "",
  dresscode: "",
  exit_strategy: "",
  status: "draft"
};

// B10: dansk-vendt status-label til registrations så admin kan læse uden
// at huske enum-værdier.
const REGISTRATION_STATUS_LABEL: Record<string, string> = {
  pending: "Afventer",
  confirmed: "Tilmeldt",
  cancelled: "Afmeldt",
  attended: "Deltaget"
};

type Registration = {
  id: string;
  user_id: string;
  couple_id: string | null;
  status: string;
  registered_at: string;
  display_name: string | null;
  email: string | null;
};

function formatRegistrationStatus(status: string): string {
  return REGISTRATION_STATUS_LABEL[status] ?? status;
}

function adminEventToFormValues(event: AdminEvent): AdminEventInput {
  return {
    slug: event.slug,
    title: event.title,
    description: event.description,
    not_for: event.not_for ?? "",
    category: event.category,
    level: event.level,
    beginner_friendly: event.beginner_friendly,
    experience_required: event.experience_required,
    facilitator_name: event.facilitator_name,
    facilitator_credential: event.facilitator_credential ?? "",
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    capacity: event.capacity,
    price_cents: event.price_cents,
    region: event.region ?? "",
    location_label: event.location_label ?? "",
    location_address: event.location_address ?? "",
    dresscode: event.dresscode ?? "",
    exit_strategy: event.exit_strategy ?? "",
    status: event.status as AdminEventInput["status"]
  };
}

// B10: extract update-fields for edit submit — slug ekskluderes så vi
// ikke sender et felt der ville fejle som immutable. Vi sender også
// kun feltvariabler der må mutere.
function buildUpdatePayload(values: AdminEventInput): Partial<AdminEventInput> {
  const { slug: _ignored, ...rest } = values;
  return rest;
}

export function AdminEventsPage() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // B10: deltagerliste pr. event. Vi caching pr. event-id så toggle ikke
  // refetcher hver gang, men reload() rydder den så fersk data hentes.
  const [expandedRegistrationsId, setExpandedRegistrationsId] = useState<string | null>(
    null
  );
  const [registrationsByEvent, setRegistrationsByEvent] = useState<
    Record<string, Registration[] | "loading" | "error">
  >({});

  const motionMode = getMotionMode();

  async function reload() {
    setLoading(true);
    const result = await api.listAdminEvents();
    if (!result.ok) {
      setError(result.code === "FORBIDDEN" ? "Kun for admins." : "Kunne ikke hente events.");
    } else {
      setEvents(result.events);
      setError("");
    }
    setRegistrationsByEvent({});
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, []);

  async function handleCreate(values: AdminEventInput) {
    setSubmitting(true);
    setError("");
    setSuccess("");
    const result = await api.createEvent(values);
    setSubmitting(false);
    if (!result.ok) {
      setError(`Kunne ikke oprette: ${result.code}`);
      return;
    }
    setSuccess("Event oprettet.");
    setShowForm(false);
    void reload();
  }

  async function handleEdit(eventId: string, values: AdminEventInput) {
    setSubmitting(true);
    setError("");
    setSuccess("");
    const result = await api.updateEvent(eventId, buildUpdatePayload(values));
    setSubmitting(false);
    if (!result.ok) {
      setError(`Kunne ikke gemme: ${result.code}`);
      return;
    }
    setSuccess("Event opdateret.");
    setEditingEventId(null);
    void reload();
  }

  async function handlePublish(eventId: string) {
    const result = await api.updateEvent(eventId, { status: "published" });
    if (!result.ok) {
      setError("Kunne ikke publicere.");
      return;
    }
    void reload();
  }

  async function performDelete() {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);
    const result = await api.deleteEvent(id);
    if (!result.ok) {
      setError("Kunne ikke slette.");
      return;
    }
    void reload();
  }

  async function toggleRegistrations(eventId: string) {
    if (expandedRegistrationsId === eventId) {
      setExpandedRegistrationsId(null);
      return;
    }
    setExpandedRegistrationsId(eventId);
    if (registrationsByEvent[eventId]) {
      return;
    }
    setRegistrationsByEvent((prev) => ({ ...prev, [eventId]: "loading" }));
    const result = await api.listEventRegistrations(eventId);
    if (!result.ok) {
      setRegistrationsByEvent((prev) => ({ ...prev, [eventId]: "error" }));
      return;
    }
    setRegistrationsByEvent((prev) => ({
      ...prev,
      [eventId]: result.registrations
    }));
  }

  function registrationCounts(eventId: string): { confirmed: number; total: number } {
    const cached = registrationsByEvent[eventId];
    if (!Array.isArray(cached)) {
      return { confirmed: 0, total: 0 };
    }
    return {
      confirmed: cached.filter((r) => r.status === "confirmed" || r.status === "attended")
        .length,
      total: cached.length
    };
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-10 md:py-16">
      <motion.div initial="hidden" animate="visible" variants={revealVariants(motionMode, "hero")}>
        <AdminSubnav />

        <PageHeader
          kicker="Admin"
          title="Events"
          description="Opret, redigér og publicér events. Klik på et event for at se deltagerlisten."
          data-testid="admin-events-header"
          actions={
            <Button
              onClick={() => setShowForm((prev) => !prev)}
              className="glow-cta"
              data-testid="toggle-create-event-form"
            >
              {showForm ? "Skjul formular" : "Opret nyt event"}
            </Button>
          }
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

        {showForm && (
          <AdminEventForm
            mode="create"
            title="Nyt event"
            initialValues={EMPTY_FORM}
            submitting={submitting}
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        )}

        {loading ? (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="p-5">
                <Skeleton className="mb-2 h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </Card>
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="body-text-muted text-center">Ingen events oprettet endnu.</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const isEditing = editingEventId === event.id;
              const isExpanded = expandedRegistrationsId === event.id;
              const regs = registrationsByEvent[event.id];

              return (
                <div key={event.id} className="space-y-3">
                  <Card className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="secondary">{CATEGORY_LABEL[event.category]}</Badge>
                          <Badge variant="outline">{LEVEL_LABEL[event.level]}</Badge>
                          <Badge variant="outline">{event.status}</Badge>
                          {Array.isArray(regs) && (
                            <Badge variant="outline" data-testid={`registration-count-${event.id}`}>
                              {registrationCounts(event.id).confirmed}/{event.capacity}{" "}
                              tilmeldt
                            </Badge>
                          )}
                        </div>
                        <p className="font-display text-lg">{event.title}</p>
                        <p className="text-sm text-[color:var(--color-text-secondary)]">
                          {formatDateTime(event.starts_at)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {event.status === "draft" && (
                          <Button
                            size="sm"
                            onClick={() => handlePublish(event.id)}
                            data-testid={`publish-event-${event.id}`}
                          >
                            Publicer
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setEditingEventId(isEditing ? null : event.id)
                          }
                          data-testid={`edit-event-${event.id}`}
                        >
                          {isEditing ? "Skjul redigering" : "Redigér"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleRegistrations(event.id)}
                          data-testid={`toggle-registrations-${event.id}`}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? "Skjul deltagere" : "Deltagere"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteTargetId(event.id)}
                          data-testid={`open-delete-event-${event.id}`}
                        >
                          Slet
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div
                        className="mt-4 border-t border-[color:var(--border-subtle)] pt-4"
                        data-testid={`registrations-${event.id}`}
                      >
                        {regs === "loading" ? (
                          <div className="space-y-2" aria-busy="true">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-4 w-1/2" />
                          </div>
                        ) : regs === "error" ? (
                          <Alert>
                            <AlertDescription>
                              Kunne ikke hente deltagerlisten.
                            </AlertDescription>
                          </Alert>
                        ) : !regs || regs.length === 0 ? (
                          <p className="body-text-muted text-sm">
                            Ingen tilmeldte endnu.
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {regs.map((reg) => (
                              <li
                                key={reg.id}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] px-3 py-2 text-sm"
                                data-testid={`registration-row-${reg.id}`}
                              >
                                <div className="space-y-0.5">
                                  <p className="font-medium">
                                    {reg.display_name ?? "(uden navn)"}
                                  </p>
                                  <p className="body-text-muted text-xs">
                                    {reg.email ?? "(slettet bruger)"}
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline">
                                    {formatRegistrationStatus(reg.status)}
                                  </Badge>
                                  <span className="body-text-muted text-xs">
                                    {new Date(reg.registered_at).toLocaleString("da-DK")}
                                  </span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </Card>

                  {isEditing && (
                    <AdminEventForm
                      mode="edit"
                      title={`Redigér: ${event.title}`}
                      initialValues={adminEventToFormValues(event)}
                      submitting={submitting}
                      onSubmit={(values) => handleEdit(event.id, values)}
                      onCancel={() => setEditingEventId(null)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Slet-event Dialog (erstatter native window.confirm). */}
        <Dialog
          open={deleteTargetId !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteTargetId(null);
          }}
        >
          <DialogContent data-testid="delete-event-dialog">
            <DialogHeader>
              <DialogTitle>Slet event?</DialogTitle>
              <DialogDescription>
                Eventet fjernes permanent, og alle tilmeldinger annulleres. Det
                kan ikke fortrydes.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDeleteTargetId(null)}>
                Annullér
              </Button>
              <Button onClick={performDelete} data-testid="confirm-delete-event">
                Slet event
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </section>
  );
}
