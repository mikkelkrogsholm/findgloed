import { FormEvent, useEffect, useState } from "react";
import { motion } from "motion/react";

import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { appConfig } from "@/config/app-config";
import { api, type OrganizationWithRole } from "@/lib/api";
import { getMotionMode, revealVariants } from "@/lib/motion";
import { navigate } from "@/lib/nav";
import { useSession } from "@/lib/use-session";

const ORG_ROLE_LABEL: Record<string, string> = {
  owner: "Ejer",
  editor: "Redaktør"
};

export function OrganizerPage() {
  const session = useSession();
  const [orgs, setOrgs] = useState<OrganizationWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    region: "",
    contact_email: ""
  });

  const motionMode = getMotionMode();

  const canCreate =
    session.status === "authenticated" &&
    (session.profile.role === "organizer" || session.profile.role === "admin");

  async function reload() {
    setLoading(true);
    const result = await api.listOrganizations();
    setLoading(false);
    if (!result.ok) {
      setError("Kunne ikke hente dine organisationer.");
      return;
    }
    setError("");
    setOrgs(result.organizations);
  }

  useEffect(() => {
    if (session.status === "anonymous") {
      navigate(appConfig.routes.login);
      return;
    }
    if (session.status === "authenticated") {
      void reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const result = await api.createOrganization({
      name: form.name,
      description: form.description || null,
      region: form.region || null,
      contact_email: form.contact_email || null
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(
        result.code === "INVALID_EMAIL"
          ? "Kontakt-emailen er ugyldig."
          : result.code === "FORBIDDEN"
            ? "Du har ikke rettigheder til at oprette organisationer."
            : "Kunne ikke oprette organisationen."
      );
      return;
    }
    navigate(`${appConfig.routes.organizer}/${result.organization.id}`);
  }

  if (session.status === "authenticated" && !canCreate) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-12">
        <Alert role="alert">
          <AlertDescription>
            Denne side er kun for arrangører. Kontakt en administrator hvis du
            skal kunne oprette en organisation.
          </AlertDescription>
        </Alert>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-10 md:py-16" data-testid="organizer-page">
      <motion.div initial="hidden" animate="visible" variants={revealVariants(motionMode, "hero")}>
        <PageHeader
          kicker="ARRANGØR"
          title="Mine organisationer"
          description="Opret og administrér organisationer. En organisation kan afholde events — alene eller sammen med andre."
          actions={
            <Button
              onClick={() => setShowForm((prev) => !prev)}
              className="glow-cta"
              data-testid="toggle-create-org"
            >
              {showForm ? "Skjul formular" : "Opret organisation"}
            </Button>
          }
        />

        {error && (
          <Alert role="alert" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {showForm && (
          <Card className="mb-6 p-6" data-testid="create-org-form">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Ny organisation</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <form className="space-y-4" onSubmit={handleCreate}>
                <div className="space-y-1">
                  <Label htmlFor="org-name">Navn</Label>
                  <Input
                    id="org-name"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="org-description">Beskrivelse</Label>
                  <Textarea
                    id="org-description"
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="org-region">Region</Label>
                    <Input
                      id="org-region"
                      value={form.region}
                      onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}
                      placeholder="København"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="org-email">Kontakt-email</Label>
                    <Input
                      id="org-email"
                      type="email"
                      value={form.contact_email}
                      onChange={(e) => setForm((p) => ({ ...p, contact_email: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={submitting} className="glow-cta">
                    {submitting ? "Opretter…" : "Opret organisation"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowForm(false)}
                    disabled={submitting}
                  >
                    Annullér
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <p className="body-text-muted text-sm">Indlæser…</p>
        ) : orgs.length === 0 ? (
          <p className="body-text-muted text-center">
            Du har ingen organisationer endnu. Opret din første ovenfor.
          </p>
        ) : (
          <div className="space-y-3">
            {orgs.map((org) => (
              <Card
                key={org.id}
                className="cursor-pointer p-5 transition hover:border-[color:var(--border-strong)]"
                data-testid={`org-card-${org.id}`}
                onClick={() => navigate(`${appConfig.routes.organizer}/${org.id}`)}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-lg">{org.name}</p>
                      {org.org_role && (
                        <Badge variant="secondary">
                          {ORG_ROLE_LABEL[org.org_role] ?? org.org_role}
                        </Badge>
                      )}
                      {org.status === "suspended" && (
                        <Badge variant="outline">Suspenderet</Badge>
                      )}
                    </div>
                    {org.region && (
                      <p className="body-text-muted text-sm">{org.region}</p>
                    )}
                  </div>
                  <span className="body-text-muted text-sm">Åbn →</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </section>
  );
}
