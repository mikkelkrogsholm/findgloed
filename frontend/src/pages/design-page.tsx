import { useEffect, useState } from "react";

import { appConfig, type ThemePreset } from "@/config/app-config";
import { designSystem, type TokenItem } from "@/config/design-system";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport
} from "@/components/ui/toast";

type ToastVariant = "default" | "success" | "destructive";

function TokenPreview({ token }: { token: TokenItem }) {
  const [resolvedValue, setResolvedValue] = useState("");

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    setResolvedValue(styles.getPropertyValue(token.variable).trim());
  }, [token.variable]);

  return (
    <div className="glass-pill rounded-2xl p-4">
      <div className="mb-3 h-12 rounded-xl border border-[color:var(--border-subtle)]" style={{ background: `var(${token.variable})` }} />
      <p className="display-text text-sm font-semibold">{token.label}</p>
      <p className="body-text-muted text-xs">{token.variable}</p>
      <p className="body-text-muted mt-1 text-xs">{resolvedValue}</p>
      <p className="body-text mt-2 text-xs">{token.note}</p>
    </div>
  );
}

function ThemeComparisonCard({ preset }: { preset: ThemePreset }) {
  const presetMeta = designSystem.presets[preset];
  const consentId = `theme-consent-${preset}`;
  const coreTokens: TokenItem[] = [
    { label: "Accent", variable: "--color-accent", note: "Primær handling" },
    { label: "Link", variable: "--color-link", note: "Sekundær handling" },
    { label: "Baggrund", variable: "--color-bg-base", note: "Grundtone" },
    { label: "Glass", variable: "--glass-card-surface", note: "Kortlag" }
  ];

  return (
    <div data-theme={preset} className="rounded-3xl border border-[color:var(--border-subtle)] p-4 md:p-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="noxus-kicker kicker-text text-[0.68rem]">{presetMeta.name}</p>
          <p className="display-text text-lg font-semibold">{presetMeta.tone}</p>
        </div>

        <div className="glass-shell space-y-4 rounded-3xl p-4">
          <p className="noxus-title display-text text-2xl">Kurateret event-atmosfære</p>
          <p className="body-text text-sm">Samme komponenter, nyt token-lag. Fokus på tryghed, læsbarhed og ro.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {coreTokens.map((token) => (
              <div key={`${preset}-${token.variable}`} className="glass-pill rounded-xl p-2">
                <div className="mb-1 h-6 rounded-md border border-[color:var(--border-subtle)]" style={{ background: `var(${token.variable})` }} />
                <p className="body-text text-xs font-semibold">{token.label}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="glass-pill rounded-full px-3 py-1 text-xs">MitID-verificeret</span>
            <span className="glass-pill rounded-full px-3 py-1 text-xs">Tryg adgang</span>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`compare-email-${preset}`}>Email</Label>
            <Input id={`compare-email-${preset}`} placeholder={designSystem.componentCopy.inputPlaceholder} />
          </div>
          <div className="glass-pill flex items-start gap-3 rounded-xl p-3">
            <Checkbox id={consentId} checked />
            <Label htmlFor={consentId} className="body-text text-sm leading-relaxed">
              Jeg har læst og accepterer handelsbetingelserne og persondatapolitikken.
            </Label>
          </div>
          <div className="flex gap-2">
            <Button size="sm">Primær</Button>
            <Button size="sm" variant="outline">
              Sekundær
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DesignPage() {
  const [consentAccepted, setConsentAccepted] = useState(true);
  const [channel, setChannel] = useState("mitid");
  const [toastOpen, setToastOpen] = useState(false);
  const [toastVariant, setToastVariant] = useState<ToastVariant>("default");
  const [toastTitle, setToastTitle] = useState("Demo");
  const [toastDescription, setToastDescription] = useState("Komponenten virker og følger tokens.");

  function triggerToast(variant: ToastVariant, title: string, description: string) {
    setToastVariant(variant);
    setToastTitle(title);
    setToastDescription(description);
    setToastOpen(false);
    requestAnimationFrame(() => setToastOpen(true));
  }

  return (
    <ToastProvider>
      <section className="mx-auto w-full max-w-6xl space-y-8 px-6 py-16">
        <Card className="reveal-up p-8 md:p-10">
          <CardContent className="space-y-4 pt-0">
            <CardTitle>{designSystem.title}</CardTitle>
            <p className="body-text">{designSystem.description}</p>
            <p className="body-text text-sm">
              Aktivt preset: <strong>{designSystem.presets[designSystem.activePreset].name}</strong>
            </p>
            <p className="body-text-muted text-sm">
              Deploy toggle: <code>VITE_ENABLE_DESIGN_PAGE=false</code>
            </p>
            <p className="body-text-muted text-sm">
              Theme toggle: <code>VITE_THEME_PRESET=legacy|anthro-v1</code>
            </p>
            <div className="glass-pill rounded-2xl p-4">
              <p className="display-text text-sm font-semibold">Designprincipper</p>
              <ul className="body-text mt-2 list-inside list-disc space-y-1 text-sm">
                {designSystem.principles.map((principle) => (
                  <li key={principle}>{principle}</li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <a href={appConfig.routes.landing}>Til landing</a>
              </Button>
              <Button variant="outline" asChild>
                <a href={appConfig.routes.privacy}>Til privacy</a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="reveal-up reveal-delay-1 p-8 md:p-10">
          <CardContent className="space-y-6 pt-0">
            <CardTitle>Theme Comparison</CardTitle>
            <p className="body-text">
              Samme primitives og komponenter vist i begge presets, så forskellen kan vurderes direkte.
            </p>
            <div className="grid gap-4 xl:grid-cols-2">
              <ThemeComparisonCard preset="legacy" />
              <ThemeComparisonCard preset="anthro-v1" />
            </div>
          </CardContent>
        </Card>

        <Card className="reveal-up reveal-delay-2 p-8 md:p-10">
          <CardContent className="space-y-6 pt-0">
            <CardTitle>Typografi</CardTitle>
            <div className="space-y-4">
              {designSystem.typography.map((font) => (
                <div key={font.variable} className="glass-pill rounded-2xl p-4">
                  <p className="body-text-muted text-xs">{font.variable}</p>
                  <p className="display-text mt-2 text-sm font-semibold">{font.label}</p>
                  <p className="display-text mt-2 text-2xl" style={{ fontFamily: `var(${font.variable})` }}>
                    {font.sample}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {designSystem.tokenGroups.map((group) => (
          <Card key={group.title} className="p-8 md:p-10">
            <CardContent className="space-y-4 pt-0">
              <CardTitle>{group.title}</CardTitle>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {group.items.map((token) => (
                  <TokenPreview key={token.variable} token={token} />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        <Card className="p-8 md:p-10">
          <CardContent className="space-y-6 pt-0">
            <CardTitle>Buttons, Cards, Pills</CardTitle>
            <div className="flex flex-wrap gap-3">
              <Button>Primary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button disabled>Gemmer...</Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="success">Godkendt</Badge>
              <Badge variant="warning">Afventer</Badge>
              <Badge variant="destructive">Afvist</Badge>
              <Badge variant="outline">Partner</Badge>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <p className="display-text text-lg font-semibold">{designSystem.componentCopy.cardTitle}</p>
              <p className="body-text mt-2">{designSystem.componentCopy.cardBody}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="p-8 md:p-10">
          <CardContent className="space-y-6 pt-0">
            <CardTitle>Form Controls</CardTitle>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{designSystem.componentCopy.inputLabel}</Label>
                <Input placeholder={designSystem.componentCopy.inputPlaceholder} />
              </div>

              <div className="space-y-2">
                <Label>Kanal</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vælg kanal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Tilgang</SelectLabel>
                      <SelectItem value="mitid">MitID event</SelectItem>
                      <SelectItem value="waitlist">Waitlist email</SelectItem>
                      <SelectItem value="partner">Partner invitation</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Besked</Label>
              <Textarea placeholder="Skriv en intern note..." />
            </div>

            <div className="glass-pill flex items-start gap-3 rounded-xl p-4">
              <Checkbox id="consent" checked={consentAccepted} onCheckedChange={(value) => setConsentAccepted(Boolean(value))} />
              <Label htmlFor="consent" className="body-text text-sm leading-relaxed">
                Jeg accepterer handelsbetingelserne og persondatapolitikken. <a className="link-inline" href={appConfig.routes.privacy}>Læs vilkår</a>
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card className="p-8 md:p-10">
          <CardContent className="space-y-6 pt-0">
            <CardTitle>Navigation & Overlays</CardTitle>

            <div className="flex flex-wrap gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Åbn Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Bekræft handling</DialogTitle>
                    <DialogDescription>Er du sikker på, at du vil markere denne billet som brugt?</DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="ghost">Annuller</Button>
                    <Button>Bekræft</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline">Åbn Sheet</Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Mobil panel</SheetTitle>
                    <SheetDescription>Bruges til hurtige handlinger på små skærme.</SheetDescription>
                  </SheetHeader>
                  <div className="my-6 space-y-2">
                    <Button className="w-full">Scan næste QR</Button>
                    <Button variant="ghost" className="w-full">
                      Se gæsteliste
                    </Button>
                  </div>
                  <SheetFooter>
                    <Button variant="outline" className="w-full">
                      Luk panel
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </div>

            <Tabs defaultValue="events" className="w-full">
              <TabsList>
                <TabsTrigger value="events">Events</TabsTrigger>
                <TabsTrigger value="tickets">Billetter</TabsTrigger>
                <TabsTrigger value="settings">Indstillinger</TabsTrigger>
              </TabsList>
              <TabsContent value="events">
                <div className="glass-pill rounded-xl p-4">
                  <p className="body-text">Event-oversigt med kommende datoer, lokation og kapacitet.</p>
                </div>
              </TabsContent>
              <TabsContent value="tickets">
                <div className="glass-pill rounded-xl p-4">
                  <p className="body-text">Billetstatus med check-in historik og QR id.</p>
                </div>
              </TabsContent>
              <TabsContent value="settings">
                <div className="glass-pill rounded-xl p-4">
                  <p className="body-text">Brugerindstillinger og datapræferencer.</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="p-8 md:p-10">
          <CardContent className="space-y-6 pt-0">
            <CardTitle>Data Table & Loading</CardTitle>

            <Table>
              <TableCaption>Gæsteliste til DKSA introaften</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Alias</TableHead>
                  <TableHead>Billet</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Fjordlys</TableCell>
                  <TableCell>#A12Q9</TableCell>
                  <TableCell>
                    <Badge variant="success">Godkendt</Badge>
                  </TableCell>
                  <TableCell>19:12</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Nordvind</TableCell>
                  <TableCell>#B44M2</TableCell>
                  <TableCell>
                    <Badge variant="warning">Afventer</Badge>
                  </TableCell>
                  <TableCell>-</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Skovregn</TableCell>
                  <TableCell>#Q11D7</TableCell>
                  <TableCell>
                    <Badge variant="destructive">Afvist</Badge>
                  </TableCell>
                  <TableCell>18:49</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <div className="grid gap-3 sm:grid-cols-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          </CardContent>
        </Card>

        <Card className="p-8 md:p-10">
          <CardContent className="space-y-6 pt-0">
            <CardTitle>Alerts & Toast</CardTitle>

            <div className="space-y-3">
              <Alert variant="info">
                <AlertDescription>Info: Email blev gemt på ventelisten.</AlertDescription>
              </Alert>
              <Alert variant="success">
                <AlertDescription>Success: Billet oprettet og sendt via Resend.</AlertDescription>
              </Alert>
              <Alert variant="error">
                <AlertDescription>Error: Verificering fejlede, prøv igen.</AlertDescription>
              </Alert>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => triggerToast("default", "Systembesked", "Design-preview er aktiv i dette miljø.")}
              >
                Vis standard toast
              </Button>
              <Button
                variant="outline"
                onClick={() => triggerToast("success", "Billet sendt", "Brugeren modtog QR-billet på email.")}
              >
                Vis success toast
              </Button>
              <Button
                variant="outline"
                onClick={() => triggerToast("destructive", "Scan afvist", "Koden er allerede brugt kl. 19:12")}
              >
                Vis error toast
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="p-8 md:p-10">
          <CardContent className="space-y-6 pt-0">
            <CardTitle>Domain Patterns</CardTitle>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="glass-card rounded-2xl p-5">
                <p className="display-text text-base font-semibold">Waitlist Form States</p>
                <Tabs defaultValue="idle" className="mt-4 w-full">
                  <TabsList>
                    <TabsTrigger value="idle">Idle</TabsTrigger>
                    <TabsTrigger value="success">Success</TabsTrigger>
                    <TabsTrigger value="error">Error</TabsTrigger>
                  </TabsList>
                  <TabsContent value="idle" className="space-y-3">
                    <Input placeholder="dig@eksempel.dk" />
                    <Button className="w-full">Skriv mig op</Button>
                  </TabsContent>
                  <TabsContent value="success">
                    <Alert variant="success">
                      <AlertDescription>Tak. Du er nummer 24 i køen.</AlertDescription>
                    </Alert>
                  </TabsContent>
                  <TabsContent value="error">
                    <Alert variant="error">
                      <AlertDescription>Kunne ikke gemme email. Prøv igen om lidt.</AlertDescription>
                    </Alert>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="glass-card rounded-2xl p-5">
                <p className="display-text text-base font-semibold">Ticket Card + QR</p>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge>DKSA Event</Badge>
                    <span className="body-text-muted text-xs">#A12Q9</span>
                  </div>
                  <p className="display-text text-lg">Glod x DKSA Introaften</p>
                  <p className="body-text-muted text-sm">Torsdag 21:00 • København</p>
                  <div className="flex justify-center rounded-xl border border-dashed border-[color:var(--border-subtle)] bg-[color:var(--glass-panel-surface)] p-4">
                    <div className="grid h-32 w-32 place-items-center rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--surface-elevated)] font-mono text-xs tracking-widest text-[color:var(--color-text-tertiary)]">
                      QR: A12Q9
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5 xl:col-span-2">
                <p className="display-text text-base font-semibold">Scan Result States</p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-[color:var(--color-success-border)] bg-[color:var(--color-success-soft)] p-4">
                    <Badge variant="success">GODKENDT</Badge>
                    <p className="mt-2 text-sm font-semibold text-[color:var(--color-success-text)]">Alias: Fjordlys</p>
                    <p className="text-xs text-[color:var(--color-success-text)]">Check-in 19:12</p>
                  </div>
                  <div className="rounded-xl border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] p-4">
                    <Badge variant="warning">ALLEREDE BRUGT</Badge>
                    <p className="mt-2 text-sm font-semibold text-[color:var(--color-warning-text)]">Først scannet 19:12</p>
                    <p className="text-xs text-[color:var(--color-warning-text)]">Forsøg igen 19:18</p>
                  </div>
                  <div className="rounded-xl border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-soft)] p-4">
                    <Badge variant="destructive">UGYLDIG</Badge>
                    <p className="mt-2 text-sm font-semibold text-[color:var(--color-danger)]">Kode ikke fundet</p>
                    <p className="text-xs text-[color:var(--color-danger)]">Bed gæsten tjekke billetten</p>
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5">
                <p className="display-text text-base font-semibold">Empty State</p>
                <p className="body-text-muted mt-2 text-sm">Ingen events endnu. Opret første event for at komme i gang.</p>
                <Button className="mt-4" variant="outline">
                  Opret event
                </Button>
              </div>

              <div className="glass-card rounded-2xl p-5">
                <p className="display-text text-base font-semibold">Error State</p>
                <Alert variant="error" className="mt-3">
                  <AlertDescription>Kunne ikke hente events. Prøv igen eller kontakt support.</AlertDescription>
                </Alert>
                <Button className="mt-4" variant="destructive">
                  Prøv igen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Toast open={toastOpen} onOpenChange={setToastOpen} variant={toastVariant} duration={2600}>
        <div className="grid gap-1">
          <ToastTitle>{toastTitle}</ToastTitle>
          <ToastDescription>{toastDescription}</ToastDescription>
        </div>
        <ToastAction altText="Luk">OK</ToastAction>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}
