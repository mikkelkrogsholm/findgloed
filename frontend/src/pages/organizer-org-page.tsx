import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";

import { AdminEventForm } from "@/components/admin/admin-event-form";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { appConfig } from "@/config/app-config";
import {
  api,
  type AdminEvent,
  type AdminEventInput,
  type OrganizationMember,
  type OrganizationWithRole,
  type OrgRole
} from "@/lib/api";
import { CATEGORY_LABEL, LEVEL_LABEL, formatDateTime } from "@/lib/event-display";
import { getMotionMode, revealVariants } from "@/lib/motion";
import { navigate } from "@/lib/nav";
import { useSession } from "@/lib/use-session";

const ORG_ROLE_LABEL: Record<string, string> = {
  owner: "Ejer",
  editor: "Redaktør"
};

const EMPTY_EVENT: AdminEventInput = {
  slug: "",
  title: "",
  description: "",
  not_for: "",
  category: "mixed",
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

function eventToFormValues(event: AdminEvent): AdminEventInput {
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

export function OrganizerOrgPage() {
  const session = useSession();
  const orgId = useMemo(() => {
    const prefix = `${appConfig.routes.organizer}/`;
    const path = window.location.pathname;
    return path.startsWith(prefix) ? decodeURIComponent(path.slice(prefix.length)) : "";
  }, []);

  const [org, setOrg] = useState<OrganizationWithRole | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [myOrgs, setMyOrgs] = useState<OrganizationWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Org-redigering
  const [editingOrg, setEditingOrg] = useState(false);
  const [orgForm, setOrgForm] = useState({ name: "", description: "", region: "", contact_email: "" });
  const [logoUploading, setLogoUploading] = useState(false);

  // Team
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<OrgRole>("editor");
  const [removeMemberTarget, setRemoveMemberTarget] = useState<OrganizationMember | null>(null);

  // Events
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [coHostIds, setCoHostIds] = useState<string[]>([]);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [deleteEventTarget, setDeleteEventTarget] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const motionMode = getMotionMode();

  const isAdmin = session.status === "authenticated" && session.profile.role === "admin";
  const isOwner = org?.org_role === "owner" || isAdmin;
  const canManageEvents = org?.org_role != null || isAdmin;

  async function reloadAll() {
    setLoading(true);
    const orgResult = await api.getOrganization(orgId);
    if (!orgResult.ok) {
      setLoading(false);
      if (orgResult.code === "FORBIDDEN") setForbidden(true);
      else if (orgResult.code === "NOT_FOUND") setNotFound(true);
      else setError("Kunne ikke hente organisationen.");
      return;
    }
    setOrg(orgResult.organization);
    setOrgForm({
      name: orgResult.organization.name,
      description: orgResult.organization.description ?? "",
      region: orgResult.organization.region ?? "",
      contact_email: orgResult.organization.contact_email ?? ""
    });

    const [membersResult, eventsResult, myOrgsResult] = await Promise.all([
      api.listOrgMembers(orgId),
      api.listOrgEvents(orgId),
      api.listOrganizations()
    ]);
    if (membersResult.ok) setMembers(membersResult.members);
    if (eventsResult.ok) setEvents(eventsResult.events);
    if (myOrgsResult.ok) setMyOrgs(myOrgsResult.organizations);
    setLoading(false);
  }

  useEffect(() => {
    if (session.status === "anonymous") {
      navigate(appConfig.routes.login);
      return;
    }
    if (session.status !== "authenticated") return;
    if (!orgId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    void reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, session.status]);

  async function handleSaveOrg(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const result = await api.updateOrganization(orgId, {
      name: orgForm.name,
      description: orgForm.description || null,
      region: orgForm.region || null,
      contact_email: orgForm.contact_email || null
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.code === "INVALID_EMAIL" ? "Ugyldig kontakt-email." : "Kunne ikke gemme.");
      return;
    }
    setSuccess("Organisationen er opdateret.");
    setEditingOrg(false);
    void reloadAll();
  }

  async function handleLogoUpload(file: File) {
    setLogoUploading(true);
    setError("");
    const result = await api.uploadOrganizationLogo(orgId, file);
    setLogoUploading(false);
    if (!result.ok) {
      setError(
        result.code === "FILE_TOO_LARGE"
          ? "Filen er for stor (max 8MB)."
          : result.code === "UNSUPPORTED_MIME_TYPE" || result.code === "MIME_MISMATCH"
            ? "Kun billedfiler (JPG, PNG, WebP)."
            : "Kunne ikke uploade logo."
      );
      return;
    }
    setSuccess("Logo opdateret.");
    void reloadAll();
  }

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const result = await api.addOrgMember(orgId, { email: memberEmail, org_role: memberRole });
    setSubmitting(false);
    if (!result.ok) {
      setError(
        result.code === "USER_NOT_FOUND"
          ? "Ingen bruger med den email."
          : "Kunne ikke tilføje medlemmet."
      );
      return;
    }
    setSuccess(`${result.member.email ?? memberEmail} er tilføjet.`);
    setMemberEmail("");
    setMemberRole("editor");
    void reloadAll();
  }

  async function performRemoveMember() {
    if (!removeMemberTarget) return;
    const target = removeMemberTarget;
    setRemoveMemberTarget(null);
    const result = await api.removeOrgMember(orgId, target.user_id);
    if (!result.ok) {
      setError(
        result.code === "LAST_OWNER"
          ? "Organisationen skal have mindst én ejer."
          : "Kunne ikke fjerne medlemmet."
      );
      return;
    }
    setSuccess("Medlemmet er fjernet.");
    void reloadAll();
  }

  async function handleCreateEvent(values: AdminEventInput) {
    setSubmitting(true);
    setError("");
    const result = await api.createOrgEvent(orgId, { ...values, co_organization_ids: coHostIds });
    setSubmitting(false);
    if (!result.ok) {
      setError(`Kunne ikke oprette event: ${result.code}`);
      return;
    }
    setSuccess("Event oprettet.");
    setShowCreateEvent(false);
    setCoHostIds([]);
    void reloadAll();
  }

  async function handleEditEvent(eventId: string, values: AdminEventInput) {
    setSubmitting(true);
    setError("");
    const { slug: _slug, ...rest } = values;
    const result = await api.updateOrgEvent(orgId, eventId, rest);
    setSubmitting(false);
    if (!result.ok) {
      setError(
        result.code === "NOT_PRIMARY_HOST"
          ? "Kun den arrangerende organisation kan redigere dette event."
          : `Kunne ikke gemme: ${result.code}`
      );
      return;
    }
    setSuccess("Event opdateret.");
    setEditingEventId(null);
    void reloadAll();
  }

  async function performDeleteEvent() {
    if (!deleteEventTarget) return;
    const id = deleteEventTarget;
    setDeleteEventTarget(null);
    const result = await api.deleteOrgEvent(orgId, id);
    if (!result.ok) {
      setError(
        result.code === "NOT_PRIMARY_HOST"
          ? "Kun den arrangerende organisation kan slette dette event."
          : "Kunne ikke slette eventet."
      );
      return;
    }
    setSuccess("Event slettet.");
    void reloadAll();
  }

  function toggleCoHost(id: string) {
    setCoHostIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  if (forbidden) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-12">
        <Alert role="alert">
          <AlertDescription>Du har ikke adgang til denne organisation.</AlertDescription>
        </Alert>
      </section>
    );
  }

  if (notFound) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-12">
        <Alert role="alert">
          <AlertDescription>Organisationen blev ikke fundet.</AlertDescription>
        </Alert>
      </section>
    );
  }

  const coHostOptions = myOrgs.filter((o) => o.id !== orgId);

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-10 md:py-16" data-testid="organizer-org-page">
      <motion.div initial="hidden" animate="visible" variants={revealVariants(motionMode, "hero")}>
        <button
          type="button"
          className="link-inline mb-4 text-sm"
          onClick={() => navigate(appConfig.routes.organizer)}
        >
          ← Alle organisationer
        </button>

        <PageHeader
          kicker="ORGANISATION"
          title={org?.name ?? "Indlæser…"}
          description={org?.region ?? undefined}
          actions={
            isOwner && org ? (
              <Button
                variant="outline"
                onClick={() => setEditingOrg((p) => !p)}
                data-testid="toggle-edit-org"
              >
                {editingOrg ? "Skjul redigering" : "Redigér organisation"}
              </Button>
            ) : undefined
          }
        />

        {error && (
          <Alert role="alert" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert role="status" className="mb-4">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <p className="body-text-muted text-sm">Indlæser…</p>
        ) : (
          <div className="space-y-8">
            {org && (
              <div className="flex items-center gap-4" data-testid="org-logo-section">
                {org.logo_path ? (
                  <img
                    src={`${api.organizationLogoUrl(org.slug)}?t=${encodeURIComponent(org.updated_at)}`}
                    alt={org.name}
                    className="h-20 w-20 rounded-2xl border border-[color:var(--border-subtle)] object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-[color:var(--border-subtle)] text-center text-[0.65rem] text-[color:var(--color-text-tertiary)]">
                    Intet logo
                  </div>
                )}
                {isOwner && (
                  <label className="glass-pill hover-glow partner-pill inline-flex cursor-pointer items-center rounded-full px-4 py-2 text-xs tracking-wider">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      data-testid="logo-input"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleLogoUpload(f);
                        e.target.value = "";
                      }}
                    />
                    {logoUploading ? "Uploader…" : org.logo_path ? "Skift logo" : "Upload logo"}
                  </label>
                )}
              </div>
            )}

            {editingOrg && isOwner && (
              <Card className="p-6" data-testid="edit-org-form">
                <CardHeader className="px-0 pt-0">
                  <CardTitle>Redigér organisation</CardTitle>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  <form className="space-y-4" onSubmit={handleSaveOrg}>
                    <div className="space-y-1">
                      <Label htmlFor="edit-org-name">Navn</Label>
                      <Input
                        id="edit-org-name"
                        value={orgForm.name}
                        onChange={(e) => setOrgForm((p) => ({ ...p, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-org-description">Beskrivelse</Label>
                      <Textarea
                        id="edit-org-description"
                        value={orgForm.description}
                        onChange={(e) => setOrgForm((p) => ({ ...p, description: e.target.value }))}
                        rows={3}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="edit-org-region">Region</Label>
                        <Input
                          id="edit-org-region"
                          value={orgForm.region}
                          onChange={(e) => setOrgForm((p) => ({ ...p, region: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="edit-org-email">Kontakt-email</Label>
                        <Input
                          id="edit-org-email"
                          type="email"
                          value={orgForm.contact_email}
                          onChange={(e) =>
                            setOrgForm((p) => ({ ...p, contact_email: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" disabled={submitting} className="glow-cta">
                        {submitting ? "Gemmer…" : "Gem ændringer"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setEditingOrg(false)}
                        disabled={submitting}
                      >
                        Annullér
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* ---------- Team ---------- */}
            <div data-testid="org-team-section">
              <h2 className="font-display mb-3 text-xl">Team</h2>
              <Card className="p-5">
                <ul className="divide-y divide-[color:var(--border-subtle)]">
                  {members.map((member) => (
                    <li
                      key={member.user_id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3"
                      data-testid={`member-row-${member.user_id}`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {member.display_name || "(uden navn)"}
                          </span>
                          <Badge variant="secondary">
                            {ORG_ROLE_LABEL[member.org_role] ?? member.org_role}
                          </Badge>
                        </div>
                        <p className="body-text-muted text-xs">{member.email}</p>
                      </div>
                      {isOwner && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setRemoveMemberTarget(member)}
                          data-testid={`remove-member-${member.user_id}`}
                        >
                          Fjern
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>

                {isOwner && (
                  <form
                    className="mt-4 flex flex-wrap items-end gap-3 border-t border-[color:var(--border-subtle)] pt-4"
                    onSubmit={handleAddMember}
                    data-testid="add-member-form"
                  >
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="member-email">Tilføj medlem (email)</Label>
                      <Input
                        id="member-email"
                        type="email"
                        value={memberEmail}
                        onChange={(e) => setMemberEmail(e.target.value)}
                        placeholder="navn@eksempel.dk"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Rolle</Label>
                      <Select value={memberRole} onValueChange={(v) => setMemberRole(v as OrgRole)}>
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="editor">Redaktør</SelectItem>
                          <SelectItem value="owner">Ejer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" disabled={submitting}>
                      Tilføj
                    </Button>
                  </form>
                )}
              </Card>
            </div>

            {/* ---------- Events ---------- */}
            <div data-testid="org-events-section">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-xl">Events</h2>
                {canManageEvents && (
                  <Button
                    onClick={() => {
                      setShowCreateEvent((p) => !p);
                      setCoHostIds([]);
                    }}
                    className="glow-cta"
                    data-testid="toggle-create-event"
                  >
                    {showCreateEvent ? "Skjul formular" : "Opret event"}
                  </Button>
                )}
              </div>

              {showCreateEvent && canManageEvents && (
                <div className="mb-6 space-y-3">
                  {coHostOptions.length > 0 && (
                    <Card className="p-5" data-testid="co-host-picker">
                      <CardHeader className="px-0 pt-0">
                        <CardTitle className="text-base">Co-host med andre organisationer</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 px-0 pb-0">
                        {coHostOptions.map((option) => (
                          <label
                            key={option.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Checkbox
                              checked={coHostIds.includes(option.id)}
                              onCheckedChange={() => toggleCoHost(option.id)}
                            />
                            {option.name}
                          </label>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                  <AdminEventForm
                    mode="create"
                    title="Nyt event"
                    initialValues={EMPTY_EVENT}
                    submitting={submitting}
                    onSubmit={handleCreateEvent}
                    onCancel={() => setShowCreateEvent(false)}
                  />
                </div>
              )}

              {events.length === 0 ? (
                <p className="body-text-muted text-center">Ingen events endnu.</p>
              ) : (
                <div className="space-y-3">
                  {events.map((event) => {
                    const isEditing = editingEventId === event.id;
                    return (
                      <div key={event.id} className="space-y-3">
                        <Card className="p-5" data-testid={`org-event-${event.id}`}>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex-1 space-y-1">
                              <div className="flex flex-wrap gap-1.5">
                                <Badge variant="secondary">{CATEGORY_LABEL[event.category]}</Badge>
                                <Badge variant="outline">{LEVEL_LABEL[event.level]}</Badge>
                                <Badge variant="outline">{event.status}</Badge>
                              </div>
                              <p className="font-display text-lg">{event.title}</p>
                              <p className="text-sm text-[color:var(--color-text-secondary)]">
                                {formatDateTime(event.starts_at)}
                              </p>
                            </div>
                            {canManageEvents && (
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setEditingEventId(isEditing ? null : event.id)
                                  }
                                  data-testid={`edit-org-event-${event.id}`}
                                >
                                  {isEditing ? "Skjul" : "Redigér"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDeleteEventTarget(event.id)}
                                  data-testid={`delete-org-event-${event.id}`}
                                >
                                  Slet
                                </Button>
                              </div>
                            )}
                          </div>
                        </Card>
                        {isEditing && (
                          <AdminEventForm
                            mode="edit"
                            title={`Redigér: ${event.title}`}
                            initialValues={eventToFormValues(event)}
                            submitting={submitting}
                            onSubmit={(values) => handleEditEvent(event.id, values)}
                            onCancel={() => setEditingEventId(null)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>

      <Dialog
        open={removeMemberTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveMemberTarget(null);
        }}
      >
        <DialogContent data-testid="remove-member-dialog">
          <DialogHeader>
            <DialogTitle>Fjern medlem?</DialogTitle>
            <DialogDescription>
              {removeMemberTarget?.display_name || removeMemberTarget?.email} mister
              adgang til organisationen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoveMemberTarget(null)}>
              Annullér
            </Button>
            <Button onClick={performRemoveMember} data-testid="confirm-remove-member">
              Fjern medlem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteEventTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteEventTarget(null);
        }}
      >
        <DialogContent data-testid="delete-org-event-dialog">
          <DialogHeader>
            <DialogTitle>Slet event?</DialogTitle>
            <DialogDescription>
              Eventet fjernes permanent, og alle tilmeldinger annulleres.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteEventTarget(null)}>
              Annullér
            </Button>
            <Button onClick={performDeleteEvent} data-testid="confirm-delete-org-event">
              Slet event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
