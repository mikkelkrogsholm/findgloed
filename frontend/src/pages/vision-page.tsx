import { motion } from "motion/react";

import { appConfig } from "@/config/app-config";
import { PartnerInterestModal } from "@/components/partner/partner-interest-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { getMotionMode, hoverLiftVariants, revealVariants, staggerContainerVariants } from "@/lib/motion";

const FAQ_ITEMS = [
  {
    question: "Hvad er Glød?",
    answer:
      "Glød er en dansk platform for voksne, der ønsker at møde andre nysgerrige mennesker via begivenheder og aktiviteter — ikke via profil-swiping. Alle brugere verificeres med MitID."
  },
  {
    question: "Hvordan sikrer Glød tryghed?",
    answer:
      "Glød bruger MitID-verificering, klare samtykkeregler og et struktureret samtykkesystem. Platformen er udviklet i samarbejde med Dansk Sexologisk Akademi."
  },
  {
    question: "Er Glød et dating-site?",
    answer:
      "Nej — Glød er begivenhedsbaseret, ikke profilbaseret. Du møder andre mennesker via aktiviteter og events, ikke ved at browse profiler og swippe."
  },
  {
    question: "Hvem kan bruge Glød?",
    answer:
      "Glød er for alle nysgerrige voksne (+18) i Danmark. Du behøver ingen erfaring — blot en åben sind og lyst til at møde ligesindede via events."
  }
];

const PRINCIPLE_ITEMS = [
  {
    title: "MitID-verificeret adgang",
    body: "Vi bruger MitID til at sikre, at der står rigtige mennesker bag profilerne. Vi gemmer kun det nødvendige."
  },
  {
    title: "Event-first",
    body: "Glød er bygget omkring events. Mennesker mødes først i virkeligheden, og det digitale understøtter bagefter."
  },
  {
    title: "Klare rammer",
    body: "Tydelige regler giver ro. Det gør det lettere at være nysgerrig, social og til stede."
  }
];

export function VisionPage() {
  const motionMode = getMotionMode();
  const pillHover = hoverLiftVariants(motionMode);

  return (
    <section className="mx-auto w-full max-w-6xl space-y-8 px-6 py-16 md:py-20">
      <motion.div
        className="glass-shell ambient-breathe motion-reveal-shell p-8 md:p-10"
        data-testid="vision-hero-shell"
        initial="hidden"
        animate="visible"
        variants={revealVariants(motionMode, "hero")}
      >
        <p className="noxus-kicker kicker-text mb-4 text-xs">Vores vision</p>
        <h1 className="noxus-title display-text text-4xl leading-tight md:text-5xl xl:text-6xl">
          Et voksent fællesskab, bygget omkring oplevelser
        </h1>
        <p className="body-text mt-4 max-w-3xl text-lg leading-relaxed">
          Glød er for mennesker, der vil mødes i virkeligheden først.
        </p>
        <p className="body-text mt-3 max-w-3xl text-lg leading-relaxed">
          Vi bygger en platform, hvor nysgerrighed, respekt og samtykke går hånd i hånd.
        </p>
        <motion.div
          className="mt-6 flex flex-wrap gap-3 text-sm"
          variants={staggerContainerVariants(motionMode, "hero")}
          initial="hidden"
          animate="visible"
        >
          {["Vi mødes i virkeligheden først", "Fællesskab før algoritmer", "Diskretion, samtykke og respekt"].map(
            (label) => (
              <motion.span
                key={label}
                className="glass-pill hover-glow rounded-full px-4 py-2"
                variants={{ ...revealVariants(motionMode, "item"), ...pillHover }}
                whileHover="hover"
              >
                {label}
              </motion.span>
            )
          )}
        </motion.div>
      </motion.div>

      <motion.div
        data-testid="vision-content-card"
        initial="hidden"
        animate="visible"
        variants={revealVariants(motionMode, "section")}
      >
        <Card className="motion-reveal-card p-8 md:p-10">
          <CardContent className="pt-0">
            <motion.div
              className="space-y-10"
              variants={staggerContainerVariants(motionMode, "section")}
              initial="hidden"
              animate="visible"
            >
              {/* Intro section */}
              <motion.div variants={revealVariants(motionMode, "item")}>
                <CardTitle className="mb-3">Vi starter med Dansk Sexologisk Akademi</CardTitle>
                <p className="body-text">
                  Glød starter i samarbejde med Dansk Sexologisk Akademi i Sønderjylland. Det gør vi, fordi vi deler
                  samme mål: trygge rammer, tydelige normer og bedre møder mellem mennesker.
                </p>
                <p className="body-text mt-3">
                  Samarbejdet er første skridt. Over tid åbner vi for flere relevante partnere.
                </p>
              </motion.div>

              {/* Two column audience grid */}
              <motion.div
                className="grid gap-6 md:grid-cols-2"
                variants={staggerContainerVariants(motionMode, "item")}
              >
                <motion.div
                  className="glass-pill rounded-2xl p-6"
                  variants={{ ...revealVariants(motionMode, "item"), ...pillHover }}
                  whileHover="hover"
                >
                  <h2 className="noxus-title display-text mb-3 text-xl">For dig, der deltager</h2>
                  <ul className="body-text space-y-2 text-sm leading-relaxed">
                    {[
                      "Mød mennesker gennem events og fælles oplevelser.",
                      "Udforsk relationer i rammer med tydelige forventninger.",
                      "Vær en del af et miljø, hvor respekt er standard.",
                      "Find venskaber, relationer eller dating med mere dybde."
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-accent)]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </motion.div>

                <motion.div
                  className="glass-pill rounded-2xl p-6"
                  variants={{ ...revealVariants(motionMode, "item"), ...pillHover }}
                  whileHover="hover"
                >
                  <h2 className="noxus-title display-text mb-3 text-xl">For jer, der arrangerer</h2>
                  <ul className="body-text space-y-2 text-sm leading-relaxed">
                    {[
                      "Nå de rigtige deltagere med tydelig målretning.",
                      "Skab trygge overgange fra interesse til deltagelse.",
                      "Arbejd med klare normer for samtykke og adfærd.",
                      "Bliv en del af et stærkere partnernetværk."
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-accent)]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </motion.div>

              {/* Tre principper */}
              <motion.div variants={revealVariants(motionMode, "item")}>
                <h2 className="noxus-title display-text mb-5 text-2xl">Tre principper i praksis</h2>
                <motion.div
                  className="space-y-4"
                  variants={staggerContainerVariants(motionMode, "item")}
                  initial="hidden"
                  animate="visible"
                >
                  {PRINCIPLE_ITEMS.map((principle, index) => (
                    <motion.div
                      key={principle.title}
                      className="glass-pill hover-glow rounded-2xl p-5"
                      variants={{ ...revealVariants(motionMode, "item"), ...pillHover }}
                      whileHover="hover"
                      custom={index}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                          style={{
                            background: "var(--color-overlay-gold)",
                            color: "var(--color-accent)"
                          }}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <p className="display-text text-base font-semibold">{principle.title}</p>
                          <p className="body-text mt-1.5 text-sm leading-relaxed">{principle.body}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>

              {/* CTA */}
              <motion.div className="flex flex-wrap gap-3" variants={revealVariants(motionMode, "item")}>
                <Button asChild className="glow-cta">
                  <a href={appConfig.routes.landing}>Til ventelisten</a>
                </Button>
                <PartnerInterestModal />
              </motion.div>

              {/* Nøglefakta — GEO-boost */}
              <motion.div variants={revealVariants(motionMode, "item")}>
                <h2 className="noxus-title display-text mb-4 text-2xl">Nøglefakta om Glød</h2>
                <motion.div
                  className="grid gap-3 sm:grid-cols-3"
                  variants={staggerContainerVariants(motionMode, "item")}
                >
                  {[
                    { label: "Verificering", value: "MitID", sub: "Danmarks officielle digitale identitet, brugt af over 5 mio. danskere" },
                    { label: "Model", value: "Event-first", sub: "Alle møder starter med en fælles oplevelse — ikke profil-browsing" },
                    { label: "Sikkerhed", value: "100% verificeret", sub: "Ingen anonyme profiler — bekræftet identitet er et krav for adgang" }
                  ].map((fact) => (
                    <motion.div
                      key={fact.label}
                      className="glass-pill rounded-2xl p-5 text-center"
                      variants={revealVariants(motionMode, "item")}
                    >
                      <p className="noxus-kicker kicker-text mb-1 text-xs">{fact.label}</p>
                      <p className="display-text text-lg font-bold">{fact.value}</p>
                      <p className="body-text mt-1 text-xs leading-relaxed opacity-70">{fact.sub}</p>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>

              {/* FAQ — synlig for brugere og crawlere */}
              <motion.div variants={revealVariants(motionMode, "item")}>
                <h2 className="noxus-title display-text mb-5 text-2xl">Ofte stillede spørgsmål</h2>
                <motion.dl
                  className="space-y-4"
                  variants={staggerContainerVariants(motionMode, "item")}
                  initial="hidden"
                  animate="visible"
                >
                  {FAQ_ITEMS.map((faq) => (
                    <motion.div
                      key={faq.question}
                      className="glass-pill rounded-2xl p-5"
                      variants={revealVariants(motionMode, "item")}
                    >
                      <dt className="display-text text-base font-semibold">{faq.question}</dt>
                      <dd className="body-text mt-2 text-sm leading-relaxed">{faq.answer}</dd>
                    </motion.div>
                  ))}
                </motion.dl>
              </motion.div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}
