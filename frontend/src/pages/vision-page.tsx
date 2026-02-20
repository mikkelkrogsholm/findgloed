import { motion } from "framer-motion";

import { appConfig } from "@/config/app-config";
import { PartnerInterestModal } from "@/components/partner/partner-interest-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { getMotionMode, revealVariants, staggerContainerVariants } from "@/lib/motion";

export function VisionPage() {
  const motionMode = getMotionMode();

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
          <motion.span className="glass-pill rounded-full px-4 py-2" variants={revealVariants(motionMode, "item")}>
            Vi mødes i virkeligheden først
          </motion.span>
          <motion.span className="glass-pill rounded-full px-4 py-2" variants={revealVariants(motionMode, "item")}>
            Fællesskab før algoritmer
          </motion.span>
          <motion.span className="glass-pill rounded-full px-4 py-2" variants={revealVariants(motionMode, "item")}>
            Diskretion, samtykke og respekt
          </motion.span>
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
            className="space-y-8"
            variants={staggerContainerVariants(motionMode, "section")}
            initial="hidden"
            animate="visible"
          >
          <motion.div variants={revealVariants(motionMode, "item")}>
            <CardTitle>Vi starter med Dansk Sexologisk Akademi</CardTitle>
            <p className="body-text mt-3">
              Glød starter i samarbejde med Dansk Sexologisk Akademi i Sønderjylland. Det gør vi, fordi vi deler
              samme mål: trygge rammer, tydelige normer og bedre møder mellem mennesker.
            </p>
            <p className="body-text mt-3">
              Samarbejdet er første skridt. Over tid åbner vi for flere relevante partnere.
            </p>
          </motion.div>

          <motion.div variants={revealVariants(motionMode, "item")}>
            <h2 className="noxus-title display-text text-2xl">For dig, der deltager</h2>
            <ul className="body-text mt-3 list-inside list-disc space-y-1">
              <li>Mød mennesker gennem events og fælles oplevelser.</li>
              <li>Udforsk relationer i rammer med tydelige forventninger.</li>
              <li>Vær en del af et miljø, hvor respekt er standard.</li>
              <li>Find venskaber, relationer eller dating med mere dybde.</li>
            </ul>
          </motion.div>

          <motion.div variants={revealVariants(motionMode, "item")}>
            <h2 className="noxus-title display-text text-2xl">For jer, der arrangerer</h2>
            <ul className="body-text mt-3 list-inside list-disc space-y-1">
              <li>Nå de rigtige deltagere med tydelig målretning.</li>
              <li>Skab trygge overgange fra interesse til deltagelse.</li>
              <li>Arbejd med klare normer for samtykke og adfærd.</li>
              <li>Bliv en del af et stærkere partnernetværk.</li>
            </ul>
          </motion.div>

          <motion.div variants={revealVariants(motionMode, "item")}>
            <h2 className="noxus-title display-text text-2xl">Tre principper i praksis</h2>
            <div className="mt-3 space-y-4">
              <div className="glass-pill rounded-2xl p-4">
                <p className="display-text text-base font-semibold">MitID-verificeret adgang</p>
                <p className="body-text mt-2 text-sm">
                  Vi bruger MitID til at sikre, at der står rigtige mennesker bag profilerne. Vi gemmer kun det
                  nødvendige.
                </p>
              </div>

              <div className="glass-pill rounded-2xl p-4">
                <p className="display-text text-base font-semibold">Event-first</p>
                <p className="body-text mt-2 text-sm">
                  Glød er bygget omkring events. Mennesker mødes først i virkeligheden, og det digitale understøtter
                  bagefter.
                </p>
              </div>

              <div className="glass-pill rounded-2xl p-4">
                <p className="display-text text-base font-semibold">Klare rammer</p>
                <p className="body-text mt-2 text-sm">
                  Tydelige regler giver ro. Det gør det lettere at være nysgerrig, social og til stede.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div className="flex flex-wrap gap-3" variants={revealVariants(motionMode, "item")}>
            <Button asChild>
              <a href={appConfig.routes.landing}>Til ventelisten</a>
            </Button>
            <PartnerInterestModal />
          </motion.div>
          </motion.div>
        </CardContent>
      </Card>
      </motion.div>
    </section>
  );
}
