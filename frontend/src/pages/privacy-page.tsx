import { motion } from "framer-motion";

import { appConfig } from "@/config/app-config";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { getMotionMode, revealVariants, staggerContainerVariants } from "@/lib/motion";

export function PrivacyPage() {
  const motionMode = getMotionMode();

  return (
    <section className="mx-auto w-full max-w-6xl space-y-8 px-6 py-16">
      <motion.div
        className="glass-shell motion-reveal-shell p-8 md:p-10"
        data-testid="privacy-hero-shell"
        initial="hidden"
        animate="visible"
        variants={revealVariants(motionMode, "hero")}
      >
        <p className="noxus-kicker kicker-text mb-4 text-xs">Privatliv og data</p>
        <h1 className="noxus-title display-text text-4xl leading-tight md:text-5xl xl:text-6xl">Persondatapolitik</h1>
        <p className="body-text mt-4 max-w-3xl text-lg leading-relaxed">
          Vi indsamler kun de oplysninger, der er nødvendige for at håndtere din tilmelding og kommunikere om Glød.
          Vi sælger ikke dine data, og markedsføring er altid et separat valg.
        </p>
      </motion.div>

      <motion.div
        data-testid="privacy-content-card"
        initial="hidden"
        animate="visible"
        variants={revealVariants(motionMode, "section")}
      >
      <Card className="motion-reveal-card p-8 md:p-10">
        <CardContent className="pt-0">
          <motion.div
            className="space-y-8 md:space-y-10"
            variants={staggerContainerVariants(motionMode, "section")}
            initial="hidden"
            animate="visible"
          >
          <motion.div variants={revealVariants(motionMode, "item")}>
            <CardTitle>Hvad vi indsamler</CardTitle>
            <ul className="body-text mt-3 list-inside list-disc space-y-1">
              <li>E-mailadresse, når du tilmelder dig ventelisten.</li>
              <li>Tidspunkt for tilmelding og bekræftelse (double opt-in).</li>
              <li>Registrering af samtykke til vilkår og persondatapolitik.</li>
              <li>Dit valg om markedsføring (kun hvis du aktivt siger ja).</li>
            </ul>
          </motion.div>

          <motion.div variants={revealVariants(motionMode, "item")}>
            <h2 className="noxus-title display-text text-2xl">Hvad vi bruger data til</h2>
            <ul className="body-text mt-3 list-inside list-disc space-y-1">
              <li>At bekræfte din tilmelding.</li>
              <li>At sende praktiske opdateringer om venteliste og lancering.</li>
              <li>At sende markedsføring om events og tilbud, kun hvis du har givet særskilt samtykke.</li>
            </ul>
          </motion.div>

          <motion.div variants={revealVariants(motionMode, "item")}>
            <h2 className="noxus-title display-text text-2xl">Double opt-in</h2>
            <p className="body-text mt-3 leading-relaxed">
              Når du tilmelder dig, sender vi en bekræftelsesmail. Din tilmelding er først aktiv, når du klikker på
              linket i mailen.
            </p>
          </motion.div>

          <motion.div variants={revealVariants(motionMode, "item")}>
            <h2 className="noxus-title display-text text-2xl">Dataminimering</h2>
            <p className="body-text mt-3 leading-relaxed">
              Vi gemmer kun det nødvendige. Vi opbevarer ikke CPR-nummer eller andre unødvendige
              identitetsoplysninger.
            </p>
          </motion.div>

          <motion.div variants={revealVariants(motionMode, "item")}>
            <h2 className="noxus-title display-text text-2xl">Deling af data</h2>
            <p className="body-text mt-3 leading-relaxed">
              Vi deler ikke dine oplysninger med uvedkommende. Data behandles kun af nødvendige databehandlere til
              drift af platformen og udsendelse af e-mails.
            </p>
          </motion.div>

          <motion.div variants={revealVariants(motionMode, "item")}>
            <h2 className="noxus-title display-text text-2xl">Dine rettigheder</h2>
            <p className="body-text mt-3 leading-relaxed">
              Du kan kontakte os for indsigt, rettelse eller sletning på{" "}
              <a className="link-inline" href="mailto:support@findgloed.dk">
                support@findgloed.dk
              </a>
              . Du kan altid afmelde markedsføring uden at miste vigtige driftsbeskeder om din tilmelding.
            </p>
          </motion.div>

          <motion.div variants={revealVariants(motionMode, "item")}>
            <h2 className="noxus-title display-text text-2xl">Kontakt</h2>
            <p className="body-text mt-3">
              E-mail:{" "}
              <a className="link-inline" href="mailto:support@findgloed.dk">
                support@findgloed.dk
              </a>
            </p>
          </motion.div>

          <motion.a className="link-inline" href={appConfig.routes.landing} variants={revealVariants(motionMode, "item")}>
            Tilbage til forsiden
          </motion.a>
          </motion.div>
        </CardContent>
      </Card>
      </motion.div>
    </section>
  );
}
