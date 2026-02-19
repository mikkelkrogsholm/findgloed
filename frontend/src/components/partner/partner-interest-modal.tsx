import { FormEvent, useMemo, useState } from "react";

import { appConfig } from "@/config/app-config";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4564";

const ROLE_OPTIONS = [
  "Forening/organisation",
  "Eventarrangør",
  "Fagperson/behandler",
  "Andet"
] as const;

const INTEREST_OPTIONS = [
  "Oprette events",
  "Nå nye deltagere",
  "Styrke trygge rammer",
  "Samarbejde om platformen"
] as const;

type SubmitSuccess = {
  ok: true;
  message: string;
};

type SubmitError = {
  ok: false;
  code?: string;
  message?: string;
};

function normalize(value: string): string {
  return value.trim();
}

export function PartnerInterestModal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [role, setRole] = useState("");
  const [region, setRegion] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [acceptedTermsPrivacy, setAcceptedTermsPrivacy] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit = useMemo(() => {
    return (
      normalize(name).length > 0 &&
      normalize(email).length > 0 &&
      normalize(organization).length > 0 &&
      normalize(role).length > 0 &&
      interests.length > 0 &&
      acceptedTermsPrivacy &&
      !loading
    );
  }, [acceptedTermsPrivacy, email, interests.length, loading, name, organization, role]);

  function resetState() {
    setName("");
    setEmail("");
    setOrganization("");
    setRole("");
    setRegion("");
    setInterests([]);
    setAcceptedTermsPrivacy(false);
    setMarketingOptIn(false);
    setLoading(false);
    setSubmitted(false);
    setErrorMessage("");
  }

  function onOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen) {
      resetState();
    }
  }

  function toggleInterest(option: string, checked: boolean) {
    setInterests((current) => {
      if (checked) {
        if (current.includes(option)) {
          return current;
        }
        return [...current, option];
      }

      return current.filter((item) => item !== option);
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(`${API_URL}/api/partner-interest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          email,
          organization,
          role,
          region,
          interests,
          accept_terms_privacy: acceptedTermsPrivacy,
          marketing_opt_in: marketingOptIn
        })
      });

      const payload = (await response.json()) as SubmitSuccess | SubmitError;

      if (response.ok && payload.ok) {
        setSubmitted(true);
        return;
      }

      if (!payload.ok) {
        setErrorMessage(payload.message ?? "Noget gik galt. Prøv igen.");
      }
    } catch {
      setErrorMessage("Forbindelsesfejl. Prøv igen om lidt.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">Bliv samarbejdspartner</Button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-y-auto">
        {!submitted && (
          <>
            <DialogHeader>
              <DialogTitle>Bliv samarbejdspartner</DialogTitle>
              <DialogDescription>
                Fortæl kort om jer. Vi sender et bekræftelseslink, før vi går videre.
              </DialogDescription>
            </DialogHeader>

            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="partner_name">Dit navn</Label>
                <Input
                  id="partner_name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Fx Mikkel"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="partner_email">Din e-mail</Label>
                <Input
                  id="partner_email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="dig@eksempel.dk"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="partner_organization">Organisation</Label>
                <Input
                  id="partner_organization"
                  value={organization}
                  onChange={(event) => setOrganization(event.target.value)}
                  placeholder="Fx Dansk Sexologisk Akademi"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="partner_role">Rolle</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="partner_role" aria-label="Rolle">
                    <SelectValue placeholder="Vælg rolle" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="partner_region">By/område (valgfri)</Label>
                <Input
                  id="partner_region"
                  value={region}
                  onChange={(event) => setRegion(event.target.value)}
                  placeholder="Fx Sønderjylland"
                />
              </div>

              <div className="space-y-2">
                <p className="form-label">Hvad er I mest interesserede i?</p>
                <div className="space-y-3 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--glass-panel-surface)] p-4">
                  {INTEREST_OPTIONS.map((option) => {
                    const id = `partner_interest_${option.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;

                    return (
                      <div key={option} className="flex items-start gap-3">
                        <Checkbox
                          id={id}
                          checked={interests.includes(option)}
                          onCheckedChange={(value) => toggleInterest(option, Boolean(value))}
                        />
                        <Label htmlFor={id} className="body-text text-sm leading-relaxed">
                          {option}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--glass-panel-surface)] p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="partner_terms_privacy"
                    checked={acceptedTermsPrivacy}
                    onCheckedChange={(value) => setAcceptedTermsPrivacy(Boolean(value))}
                  />
                  <Label htmlFor="partner_terms_privacy" className="body-text text-sm leading-relaxed">
                    Jeg accepterer handelsbetingelser og persondatapolitik
                  </Label>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="partner_marketing_opt_in"
                    checked={marketingOptIn}
                    onCheckedChange={(value) => setMarketingOptIn(Boolean(value))}
                  />
                  <Label htmlFor="partner_marketing_opt_in" className="body-text text-sm leading-relaxed">
                    Ja tak til relevante opdateringer
                  </Label>
                </div>
              </div>

              <a href={appConfig.routes.privacy} className="link-inline text-sm">
                Læs persondatapolitik
              </a>

              {errorMessage && (
                <Alert>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                  Luk
                </Button>
                <Button type="submit" disabled={!canSubmit}>
                  {loading ? "Sender..." : "Send forespørgsel"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}

        {submitted && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Tak for din interesse</DialogTitle>
              <DialogDescription>
                Tak. Tjek din e-mail for at bekræfte din henvendelse.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Luk
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
