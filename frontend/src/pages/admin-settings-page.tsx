import { FormEvent, useEffect, useState } from "react";
import { motion } from "motion/react";

import { AdminSubnav } from "@/components/admin/admin-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { getMotionMode, revealVariants } from "@/lib/motion";

// Skal matche APP_SETTING_KEYS i backend/src/app-settings.ts.
const KEY_REQUIRE = "signup.require_invite_code";
const KEY_CODE = "signup.invite_code";

export function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  // De to settings vi eksponerer i UI'et. require styrer toggle; code er
  // den faktiske kode. Vi gemmer dem separat så toggle kan slås til/fra
  // uden at miste den indtastede kode.
  const [requireInvite, setRequireInvite] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

  const motionMode = getMotionMode();

  async function reload() {
    setLoading(true);
    setError("");
    const result = await api.listAdminSettings();
    setLoading(false);
    if (!result.ok) {
      if (result.code === "FORBIDDEN") {
        setForbidden(true);
        return;
      }
      setError("Kunne ikke hente indstillinger.");
      return;
    }
    for (const setting of result.settings) {
      if (setting.key === KEY_REQUIRE && typeof setting.value === "boolean") {
        setRequireInvite(setting.value);
      }
      if (setting.key === KEY_CODE && typeof setting.value === "string") {
        setInviteCode(setting.value);
      }
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    // Hvis admin slår require til, skal de have skrevet en kode først —
    // ellers vil signup blokere alle nye brugere (inkl. dem med "korrekt"
    // tom kode, jf. server-side edge case).
    if (requireInvite && inviteCode.trim().length === 0) {
      setError("Skriv en invitationskode før du slår kravet til.");
      setSaving(false);
      return;
    }

    const codeResult = await api.updateAdminSetting(KEY_CODE, inviteCode);
    if (!codeResult.ok) {
      setError("Kunne ikke gemme invitationskoden.");
      setSaving(false);
      return;
    }
    const requireResult = await api.updateAdminSetting(KEY_REQUIRE, requireInvite);
    if (!requireResult.ok) {
      setError("Kunne ikke gemme kravet.");
      setSaving(false);
      return;
    }

    setSuccess(
      requireInvite
        ? "Gemt. Nye signups skal nu bruge invitationskoden."
        : "Gemt. Signup er åbent for alle."
    );
    setSaving(false);
  }

  if (forbidden) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-12">
        <Alert role="alert">
          <AlertDescription>Du har ikke adgang til denne side.</AlertDescription>
        </Alert>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-6 py-12" data-testid="admin-settings-page">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={revealVariants(motionMode, "hero")}
      >
        <PageHeader
          kicker="INDSTILLINGER"
          title="Globale indstillinger"
          description="Styr signup-adgang og andre globale flags. Ændringer træder i kraft med det samme."
        />

        <AdminSubnav />

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

        <Card>
          <CardHeader>
            <CardTitle>Invitationskode ved signup</CardTitle>
            <p className="body-text-muted mt-1 text-sm">
              Når slået til kan ingen oprette konto uden den korrekte invitationskode.
              Brug den fx i en lukket beta eller når du vil styre hvem der får adgang.
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-[color:var(--color-text-secondary)]">Indlæser…</p>
            ) : (
              <form onSubmit={onSubmit} className="space-y-5">
                <label className="flex items-start gap-3 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] p-4 cursor-pointer">
                  <Checkbox
                    id="require-invite"
                    checked={requireInvite}
                    onCheckedChange={(checked) => setRequireInvite(checked === true)}
                    className="mt-1"
                    data-testid="require-invite-switch"
                  />
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Kræv invitationskode</span>
                    <p className="text-xs text-[color:var(--color-text-tertiary)]">
                      {requireInvite
                        ? "Signup er lukket — kun personer med koden kan oprette konto."
                        : "Signup er åbent for alle med en gyldig email."}
                    </p>
                  </div>
                </label>

                <div className="space-y-2">
                  <Label htmlFor="invite-code">Invitationskode</Label>
                  <Input
                    id="invite-code"
                    type="text"
                    value={inviteCode}
                    onChange={(event) => setInviteCode(event.target.value)}
                    placeholder="f.eks. gloed-launch-2026"
                    maxLength={200}
                    autoComplete="off"
                    data-testid="invite-code-input"
                  />
                  <p className="text-xs text-[color:var(--color-text-tertiary)]">
                    Del koden manuelt med dem du vil invitere. Den er case-sensitive.
                    Skift den når som helst — eksisterende brugere påvirkes ikke.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={saving}
                  className="glow-cta"
                  data-testid="save-settings-button"
                >
                  {saving ? "Gemmer…" : "Gem"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}
