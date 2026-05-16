import { useEffect, useState } from "react";
import { motion } from "motion/react";

import { appConfig } from "@/config/app-config";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMotionMode, revealVariants, staggerContainerVariants } from "@/lib/motion";

type LevelTab = "sensual_social" | "sensual" | "explicit";

const TAB_BY_HASH: Record<string, LevelTab> = {
  "#sensual-social": "sensual_social",
  "#sensual_social": "sensual_social",
  "#sensual": "sensual",
  "#explicit": "explicit",
  "#eksplicit": "explicit"
};

function resolveInitialTab(): LevelTab {
  if (typeof window === "undefined") return "sensual_social";
  return TAB_BY_HASH[window.location.hash] ?? "sensual_social";
}

type LevelSection = {
  value: LevelTab;
  label: string;
  kicker: string;
  summary: string;
  includes: string[];
  notOk: string[];
  consent: string[];
  dresscode: string;
  exitStrategy: string;
  consequences: string;
};

const SECTIONS: LevelSection[] = [
  {
    value: "sensual_social",
    label: "Sanseligt-socialt",
    kicker: "Niveau 1",
    summary:
      "Påklædt, samtale-drevet og flirtende. Det er aftener hvor vi mødes som voksne, drikker noget godt og taler om det vi sjældent taler om — uden at noget skal videre.",
    includes: [
      "Du er fuldt påklædt. Dresscoden er voksen, men ikke afklædt.",
      "Samtaler om begær, lyst, grænser, identitet — gerne nysgerrige, gerne legende.",
      "Flirten må gerne være tydelig, men foregår med ord og blikke, ikke med hænder."
    ],
    notOk: [
      "Krops-kontakt mellem fremmede ud over et håndtryk eller et kram efter aftale.",
      "Seksuelt eksplicit sprog rettet mod en konkret person uden hendes eller hans samtykke.",
      "Forsøg på at trække andre med ud af aftenen eller presse for kontaktoplysninger."
    ],
    consent: [
      "Et 'måske' er et nej, indtil det bliver til et tydeligt ja.",
      "Du kan trække enhver tilkendegivelse tilbage når som helst — også midt i en samtale.",
      "Ingen pres, ingen tigge-energi, ingen 'bare denne ene gang'."
    ],
    dresscode: "Frit, men struktureret — kom som du gerne vil mødes. Det meste er tilladt; intet er afkrævet.",
    exitStrategy:
      "Du må rejse dig stille når som helst. En vagt eller vært står i nærheden, og du kan altid bede om at blive fulgt ud eller hjem.",
    consequences:
      "Brud på rammerne giver først en advarsel ved værten. Gentagelse eller åbenlys overskridelse fører til bortvisning fra aftenen og — i grove tilfælde — permanent ban fra Glød."
  },
  {
    value: "sensual",
    label: "Sensuelt",
    kicker: "Niveau 2",
    summary:
      "Afklædt eller delvist afklædt. Det er aftener hvor intimiteten er mellem dig og din partner — andre er nær, men ikke en del af jeres berøring.",
    includes: [
      "Helt eller delvist afklædt deltagelse efter eventets ramme.",
      "Sensuelle øvelser, kropsbevidsthed, åndedrætsarbejde — typisk parvist eller individuelt.",
      "Intimt samvær med egen partner i samme rum som andre par."
    ],
    notOk: [
      "Berøring mellem fremmede uden eksplicit aftale faciliteret af værten.",
      "At kigge påtrængende eller kommentere andres kroppe eller intime øjeblikke.",
      "Optagelse, fotos eller noter — slet ikke. Aftenen findes kun i rummet."
    ],
    consent: [
      "Samtykke gives løbende, ikke en gang for hele aftenen.",
      "Et nej eller en pause er hellig — også fra din egen partner.",
      "Hvis nogen virker ubekvem, stopper du — også selvom de ikke har sagt det højt."
    ],
    dresscode:
      "Eventet angiver rammen. Forvent komfortabelt tøj du kan klæde af i, eller komme i bare hud under kåbe.",
    exitStrategy:
      "Vagter og værter er synlige hele aftenen. Du kan rejse dig fra enhver øvelse uden at forklare dig, og der er altid et stille rum du kan trække dig til.",
    consequences:
      "Overskridelse her er ikke en misforståelse — det er en grund til øjeblikkelig bortvisning. Permanent ban følger ved gentagelse eller alvor."
  },
  {
    value: "explicit",
    label: "Eksplicit",
    kicker: "Niveau 3",
    summary:
      "Alt går inden for samtykke. Det er aftener hvor seksuelle handlinger kan finde sted — mellem partnere, mellem flere, alene — så længe alle involverede har sagt et tydeligt ja.",
    includes: [
      "Seksuelle handlinger mellem voksne der har givet eksplicit samtykke.",
      "Lege, scener og fantasier udfoldet i fællesskab eller i privat rum på stedet.",
      "Mulighed for at observere eller deltage — efter aftale med de involverede."
    ],
    notOk: [
      "Berøring uden et tydeligt verbalt eller fysisk ja — ikke en antagelse, ikke et 'måske'.",
      "Pres for at deltage, optagelse af nogen form, eller at bringe andres aften videre udenfor.",
      "Alkohol eller rusmidler som påvirker evnen til at sige nej for dig selv eller for andre."
    ],
    consent: [
      "Samtykke er klart, frivilligt, informeret og kan til hver tid trækkes tilbage.",
      "Et nej kræver ingen begrundelse. En pause er et nej.",
      "Du tager ansvar for at læse den anden — og spørger hvis du er i tvivl."
    ],
    dresscode:
      "Som eventet angiver. Vær forberedt på at både påklædte og afklædte gæster bevæger sig i samme rum.",
    exitStrategy:
      "Værter og vagter er aktive hele aftenen. Stille rum er altid tilgængelige. Du kan blive fulgt ud eller hjem uden at give en grund.",
    consequences:
      "Overtrædelse af samtykke fører til øjeblikkelig bortvisning og permanent ban fra Glød. Vi vurderer i hver enkelt sag om vi anmelder forholdet — det er en mulighed, ikke en garanti."
  }
];

export function CodeOfConductPage() {
  const motionMode = getMotionMode();
  const [tab, setTab] = useState<LevelTab>(() => resolveInitialTab());

  useEffect(() => {
    const handler = () => setTab(resolveInitialTab());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  return (
    <section className="mx-auto w-full max-w-3xl space-y-8 px-6 py-16">
      <motion.div
        className="glass-shell motion-reveal-shell p-8 md:p-10"
        data-testid="coc-hero-shell"
        initial="hidden"
        animate="visible"
        variants={revealVariants(motionMode, "hero")}
      >
        <p className="noxus-kicker kicker-text mb-4 text-xs">Rammer og samtykke</p>
        <h1 className="noxus-title display-text text-4xl leading-tight md:text-5xl">Code of conduct</h1>
        <p className="body-text mt-4 max-w-2xl text-lg leading-relaxed">
          Glød bygger på samtykke. Alle medlemmer accepterer disse principper. Læs niveauet for de events du tilmelder
          dig — ikke alle gælder alle aftener.
        </p>
        <p className="body-text-muted mt-3 max-w-2xl text-sm leading-relaxed">
          Vores tre niveauer matcher event-typen. Du vælger selv hvilke aftener du møder op til, og hver enkelt event
          gør det tydeligt hvilket niveau du går ind i, før du tilmelder dig.
        </p>
      </motion.div>

      <motion.div
        data-testid="coc-content-card"
        initial="hidden"
        animate="visible"
        variants={revealVariants(motionMode, "section")}
      >
        <Card className="motion-reveal-card p-6 md:p-8">
          <CardContent className="pt-0">
            <Tabs
              value={tab}
              onValueChange={(value) => {
                setTab(value as LevelTab);
                if (typeof window !== "undefined") {
                  const hash =
                    value === "sensual_social"
                      ? "#sensual-social"
                      : value === "sensual"
                        ? "#sensual"
                        : "#explicit";
                  window.history.replaceState(null, "", `${window.location.pathname}${hash}`);
                }
              }}
            >
              <TabsList className="mb-6 w-full flex-wrap" data-testid="coc-tabs-list">
                {SECTIONS.map((section) => (
                  <TabsTrigger key={section.value} value={section.value} className="flex-1">
                    {section.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {SECTIONS.map((section) => (
                <TabsContent
                  key={section.value}
                  value={section.value}
                  data-testid={`coc-panel-${section.value}`}
                >
                  <motion.div
                    className="space-y-6"
                    variants={staggerContainerVariants(motionMode, "section")}
                    initial="hidden"
                    animate="visible"
                  >
                    <motion.div variants={revealVariants(motionMode, "item")}>
                      <p className="noxus-kicker kicker-text mb-2 text-[0.65rem]">{section.kicker}</p>
                      <CardTitle>{section.label}</CardTitle>
                      <p className="body-text mt-3 leading-relaxed">{section.summary}</p>
                    </motion.div>

                    <motion.div variants={revealVariants(motionMode, "item")}>
                      <h2 className="noxus-title display-text text-xl">Hvad aftenen typisk indebærer</h2>
                      <ul className="body-text mt-3 list-inside list-disc space-y-1.5">
                        {section.includes.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </motion.div>

                    <motion.div variants={revealVariants(motionMode, "item")}>
                      <h2 className="noxus-title display-text text-xl">Hvad er ikke OK på dette niveau</h2>
                      <ul className="body-text mt-3 list-inside list-disc space-y-1.5">
                        {section.notOk.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </motion.div>

                    <motion.div variants={revealVariants(motionMode, "item")}>
                      <h2 className="noxus-title display-text text-xl">Samtykke-principper</h2>
                      <ul className="body-text mt-3 list-inside list-disc space-y-1.5">
                        {section.consent.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </motion.div>

                    <motion.div
                      className="grid gap-4 sm:grid-cols-2"
                      variants={revealVariants(motionMode, "item")}
                    >
                      <div className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] p-4">
                        <p className="text-xs uppercase tracking-wider text-[color:var(--color-text-tertiary)]">
                          Dresscode
                        </p>
                        <p className="mt-1 text-sm text-[color:var(--color-text-secondary)]">
                          {section.dresscode}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-glass)] p-4">
                        <p className="text-xs uppercase tracking-wider text-[color:var(--color-text-tertiary)]">
                          Hvis du vil gå
                        </p>
                        <p className="mt-1 text-sm text-[color:var(--color-text-secondary)]">
                          {section.exitStrategy}
                        </p>
                      </div>
                    </motion.div>

                    <motion.div variants={revealVariants(motionMode, "item")}>
                      <h2 className="noxus-title display-text text-xl">Konsekvenser ved overtrædelse</h2>
                      <p className="body-text mt-3 leading-relaxed">{section.consequences}</p>
                    </motion.div>
                  </motion.div>
                </TabsContent>
              ))}
            </Tabs>

            <div className="mt-10 space-y-3 border-t border-[color:var(--border-subtle)] pt-6">
              <h2 className="noxus-title display-text text-xl">Spørgsmål eller en oplevelse vi skal kende?</h2>
              <p className="body-text leading-relaxed">
                Skriv til{" "}
                <a className="link-inline" href="mailto:mikkel@findgloed.dk">
                  mikkel@findgloed.dk
                </a>
                . Vi læser alt, og vi handler. Se også vores{" "}
                <a className="link-inline" href={appConfig.routes.privacy}>
                  persondatapolitik
                </a>{" "}
                og{" "}
                <a className="link-inline" href={appConfig.routes.terms}>
                  handelsbetingelser
                </a>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}
