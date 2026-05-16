import { FormEvent, useEffect, useState } from "react";
import { motion } from "motion/react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  type EventCategory,
  type EventLevel
} from "@/lib/api";
import { CATEGORY_LABEL, LEVEL_LABEL, formatDateTime } from "@/lib/event-display";
import { getMotionMode, revealVariants } from "@/lib/motion";
import { navigate } from "@/lib/nav";

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

export function AdminEventsPage() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<AdminEventInput>(EMPTY_FORM);
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
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, []);

  function setField<K extends keyof AdminEventInput>(key: K, value: AdminEventInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    const startsIso = form.starts_at ? new Date(form.starts_at).toISOString() : "";
    const endsIso = form.ends_at ? new Date(form.ends_at).toISOString() : "";

    const result = await api.createEvent({
      ...form,
      starts_at: startsIso,
      ends_at: endsIso,
      not_for: form.not_for || null,
      facilitator_credential: form.facilitator_credential || null,
      region: form.region || null,
      location_label: form.location_label || null,
      location_address: form.location_address || null,
      dresscode: form.dresscode || null,
      exit_strategy: form.exit_strategy || null
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(`Kunne ikke oprette: ${result.code}`);
      return;
    }
    setSuccess("Event oprettet.");
    setForm(EMPTY_FORM);
    setShowForm(false);
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

  async function handleDelete(eventId: string) {
    if (!window.confirm("Slet event helt? Tilmeldinger fjernes også.")) return;
    const result = await api.deleteEvent(eventId);
    if (!result.ok) {
      setError("Kunne ikke slette.");
      return;
    }
    void reload();
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-10 md:py-16">
      <motion.div initial="hidden" animate="visible" variants={revealVariants(motionMode, "hero")}>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="noxus-kicker kicker-text text-[0.65rem]">Admin</p>
            <h1 className="font-display text-3xl">Events</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate(appConfig.routes.admin)}>
              Til lead-oversigt
            </Button>
            <Button variant="outline" onClick={() => navigate(appConfig.routes.adminVerifications)}>
              Til verifikationer
            </Button>
            <Button variant="outline" onClick={() => navigate(appConfig.routes.adminReports)}>
              Til reports
            </Button>
            <Button onClick={() => setShowForm((prev) => !prev)} className="glow-cta">
              {showForm ? "Skjul formular" : "Opret nyt event"}
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

        {showForm && (
          <Card className="mb-6 p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Nyt event</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-0 pb-0">
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="slug">Slug</Label>
                    <Input
                      id="slug"
                      value={form.slug}
                      onChange={(e) => setField("slug", e.target.value)}
                      placeholder="aabent-nakkeparti-aften"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="title">Titel</Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(e) => setField("title", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="description">Beskrivelse</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                    rows={5}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="not_for">Hvem eventet IKKE er for</Label>
                  <Textarea
                    id="not_for"
                    value={form.not_for ?? ""}
                    onChange={(e) => setField("not_for", e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Kategori</Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) => setField("category", v as EventCategory)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single_only">{CATEGORY_LABEL.single_only}</SelectItem>
                        <SelectItem value="couple_only">{CATEGORY_LABEL.couple_only}</SelectItem>
                        <SelectItem value="mixed">{CATEGORY_LABEL.mixed}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Niveau</Label>
                    <Select value={form.level} onValueChange={(v) => setField("level", v as EventLevel)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sensual_social">{LEVEL_LABEL.sensual_social}</SelectItem>
                        <SelectItem value="sensual">{LEVEL_LABEL.sensual}</SelectItem>
                        <SelectItem value="explicit">{LEVEL_LABEL.explicit}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.beginner_friendly}
                      onCheckedChange={(c) => setField("beginner_friendly", c === true)}
                    />
                    Også for første gang
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.experience_required}
                      onCheckedChange={(c) => setField("experience_required", c === true)}
                    />
                    Kræver erfaring
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="facilitator_name">Vært (navn)</Label>
                    <Input
                      id="facilitator_name"
                      value={form.facilitator_name}
                      onChange={(e) => setField("facilitator_name", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="facilitator_credential">Vært (titel)</Label>
                    <Input
                      id="facilitator_credential"
                      value={form.facilitator_credential ?? ""}
                      onChange={(e) => setField("facilitator_credential", e.target.value)}
                      placeholder="Sexolog, Sexologisk Akademi"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="starts_at">Start</Label>
                    <Input
                      id="starts_at"
                      type="datetime-local"
                      value={form.starts_at}
                      onChange={(e) => setField("starts_at", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ends_at">Slut</Label>
                    <Input
                      id="ends_at"
                      type="datetime-local"
                      value={form.ends_at}
                      onChange={(e) => setField("ends_at", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor="capacity">Kapacitet</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min={1}
                      value={form.capacity}
                      onChange={(e) => setField("capacity", Number(e.target.value))}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="price_cents">Pris (øre)</Label>
                    <Input
                      id="price_cents"
                      type="number"
                      min={0}
                      value={form.price_cents}
                      onChange={(e) => setField("price_cents", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="region">Region</Label>
                    <Input
                      id="region"
                      value={form.region ?? ""}
                      onChange={(e) => setField("region", e.target.value)}
                      placeholder="København"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="location_label">Lokation (offentlig)</Label>
                    <Input
                      id="location_label"
                      value={form.location_label ?? ""}
                      onChange={(e) => setField("location_label", e.target.value)}
                      placeholder="Indre by, København"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="location_address">Adresse (skjult før tilmelding)</Label>
                    <Input
                      id="location_address"
                      value={form.location_address ?? ""}
                      onChange={(e) => setField("location_address", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="dresscode">Dresscode</Label>
                    <Input
                      id="dresscode"
                      value={form.dresscode ?? ""}
                      onChange={(e) => setField("dresscode", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="exit_strategy">Exit-strategi</Label>
                    <Input
                      id="exit_strategy"
                      value={form.exit_strategy ?? ""}
                      onChange={(e) => setField("exit_strategy", e.target.value)}
                      placeholder="Kan rejse sig stille når som helst."
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setField("status", v as AdminEventInput["status"])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Kladde</SelectItem>
                      <SelectItem value="published">Publiceret</SelectItem>
                      <SelectItem value="cancelled">Aflyst</SelectItem>
                      <SelectItem value="completed">Afholdt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" disabled={submitting} className="glow-cta">
                  {submitting ? "Opretter…" : "Opret event"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <p className="body-text-muted text-center">Henter…</p>
        ) : events.length === 0 ? (
          <p className="body-text-muted text-center">Ingen events oprettet endnu.</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <Card key={event.id} className="p-5">
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
                  <div className="flex flex-wrap gap-2">
                    {event.status === "draft" && (
                      <Button size="sm" onClick={() => handlePublish(event.id)}>
                        Publicer
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(event.id)}
                    >
                      Slet
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </section>
  );
}
