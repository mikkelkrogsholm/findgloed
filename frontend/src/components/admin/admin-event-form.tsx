import { FormEvent, useState } from "react";

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
import type { AdminEventInput, EventCategory, EventLevel } from "@/lib/api";
import { CATEGORY_LABEL, LEVEL_LABEL } from "@/lib/event-display";

// B9: Genbrugbar event-form til både create og edit. Tager initialValues
// + onSubmit-callback. Convertering af datetime-local <-> ISO håndteres
// inde i submit-funktionen så caller får ISO-strenge direkte.
type Mode = "create" | "edit";

type Props = {
  mode: Mode;
  initialValues: AdminEventInput;
  submitting: boolean;
  onSubmit: (values: AdminEventInput) => Promise<void> | void;
  onCancel?: () => void;
  title: string;
};

function toDatetimeLocal(value: string | undefined): string {
  // Konvertér ISO → "YYYY-MM-DDTHH:mm" som `datetime-local` forstår.
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AdminEventForm({
  mode,
  initialValues,
  submitting,
  onSubmit,
  onCancel,
  title
}: Props) {
  // Konvertér datetime-felter til "datetime-local"-kompatibelt format ved
  // initialisering (ellers vises ISO-strengen ikke i HTML-inputtet).
  const [form, setForm] = useState<AdminEventInput>({
    ...initialValues,
    starts_at: toDatetimeLocal(initialValues.starts_at),
    ends_at: toDatetimeLocal(initialValues.ends_at)
  });

  function setField<K extends keyof AdminEventInput>(
    key: K,
    value: AdminEventInput[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const startsIso = form.starts_at ? new Date(form.starts_at).toISOString() : "";
    const endsIso = form.ends_at ? new Date(form.ends_at).toISOString() : "";
    await onSubmit({
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
  }

  return (
    <Card className="mb-6 p-6" data-testid={`admin-event-form-${mode}`}>
      <CardHeader className="px-0 pt-0">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-0 pb-0">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`${mode}-slug`}>Slug</Label>
              <Input
                id={`${mode}-slug`}
                value={form.slug ?? ""}
                onChange={(e) => setField("slug", e.target.value)}
                placeholder="aabent-nakkeparti-aften"
                // Slug må ikke ændres efter create — links og delte URLs ville
                // pege på et hul.
                disabled={mode === "edit"}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${mode}-title`}>Titel</Label>
              <Input
                id={`${mode}-title`}
                value={form.title ?? ""}
                onChange={(e) => setField("title", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor={`${mode}-description`}>Beskrivelse</Label>
            <Textarea
              id={`${mode}-description`}
              value={form.description ?? ""}
              onChange={(e) => setField("description", e.target.value)}
              rows={5}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor={`${mode}-not-for`}>Hvem eventet IKKE er for</Label>
            <Textarea
              id={`${mode}-not-for`}
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
              <Select
                value={form.level}
                onValueChange={(v) => setField("level", v as EventLevel)}
              >
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
                checked={form.beginner_friendly ?? false}
                onCheckedChange={(c) => setField("beginner_friendly", c === true)}
              />
              Også for første gang
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.experience_required ?? false}
                onCheckedChange={(c) => setField("experience_required", c === true)}
              />
              Kræver erfaring
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`${mode}-facilitator-name`}>Vært (navn)</Label>
              <Input
                id={`${mode}-facilitator-name`}
                value={form.facilitator_name ?? ""}
                onChange={(e) => setField("facilitator_name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${mode}-facilitator-credential`}>Vært (titel)</Label>
              <Input
                id={`${mode}-facilitator-credential`}
                value={form.facilitator_credential ?? ""}
                onChange={(e) => setField("facilitator_credential", e.target.value)}
                placeholder="Sexolog, Sexologisk Akademi"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`${mode}-starts-at`}>Start</Label>
              <Input
                id={`${mode}-starts-at`}
                type="datetime-local"
                value={form.starts_at ?? ""}
                onChange={(e) => setField("starts_at", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${mode}-ends-at`}>Slut</Label>
              <Input
                id={`${mode}-ends-at`}
                type="datetime-local"
                value={form.ends_at ?? ""}
                onChange={(e) => setField("ends_at", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor={`${mode}-capacity`}>Kapacitet</Label>
              <Input
                id={`${mode}-capacity`}
                type="number"
                min={1}
                value={form.capacity ?? 0}
                onChange={(e) => setField("capacity", Number(e.target.value))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${mode}-price-cents`}>Pris (øre)</Label>
              <Input
                id={`${mode}-price-cents`}
                type="number"
                min={0}
                value={form.price_cents ?? 0}
                onChange={(e) => setField("price_cents", Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${mode}-region`}>Region</Label>
              <Input
                id={`${mode}-region`}
                value={form.region ?? ""}
                onChange={(e) => setField("region", e.target.value)}
                placeholder="København"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`${mode}-location-label`}>Lokation (offentlig)</Label>
              <Input
                id={`${mode}-location-label`}
                value={form.location_label ?? ""}
                onChange={(e) => setField("location_label", e.target.value)}
                placeholder="Indre by, København"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${mode}-location-address`}>
                Adresse (skjult før tilmelding)
              </Label>
              <Input
                id={`${mode}-location-address`}
                value={form.location_address ?? ""}
                onChange={(e) => setField("location_address", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`${mode}-dresscode`}>Dresscode</Label>
              <Input
                id={`${mode}-dresscode`}
                value={form.dresscode ?? ""}
                onChange={(e) => setField("dresscode", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${mode}-exit-strategy`}>Exit-strategi</Label>
              <Input
                id={`${mode}-exit-strategy`}
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
              onValueChange={(v) =>
                setField("status", v as AdminEventInput["status"])
              }
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

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={submitting} className="glow-cta">
              {submitting
                ? mode === "edit"
                  ? "Gemmer…"
                  : "Opretter…"
                : mode === "edit"
                  ? "Gem ændringer"
                  : "Opret event"}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={submitting}
              >
                Annullér
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
