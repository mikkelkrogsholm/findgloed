import { motion } from "motion/react";

import { appConfig } from "@/config/app-config";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { getMotionMode, revealVariants, staggerContainerVariants } from "@/lib/motion";

export function TermsPage() {
  const motionMode = getMotionMode();

  return (
    <section className="mx-auto w-full max-w-3xl space-y-8 px-6 py-16">
      <motion.div
        className="glass-shell motion-reveal-shell p-8 md:p-10"
        data-testid="terms-hero-shell"
        initial="hidden"
        animate="visible"
        variants={revealVariants(motionMode, "hero")}
      >
        <p className="noxus-kicker kicker-text mb-4 text-xs">Vilkår og rammer</p>
        <h1 className="noxus-title display-text text-4xl leading-tight md:text-5xl">Handelsbetingelser</h1>
        <p className="body-text mt-4 max-w-2xl text-lg leading-relaxed">
          Disse vilkår beskriver dine rettigheder og forpligtelser som medlem af Glød. Læs dem inden du tilmelder dig
          eller køber et medlemskab — de er bindende fra det øjeblik du opretter en konto.
        </p>
        <p className="body-text-muted mt-3 text-sm">Senest opdateret: 16. maj 2026.</p>
      </motion.div>

      <motion.div
        data-testid="terms-content-card"
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
              <motion.div variants={revealVariants(motionMode, "item")} data-testid="terms-section-operator">
                <CardTitle>Hvem driver Glød</CardTitle>
                <p className="body-text mt-3 leading-relaxed">
                  Glød drives af <strong>Mikkel Freltoft Krogsholm</strong>, der også er dataansvarlig for platformen.
                  Henvendelser kan sendes til{" "}
                  <a className="link-inline" href="mailto:mikkel@findgloed.dk">
                    mikkel@findgloed.dk
                  </a>
                  . Se vores{" "}
                  <a className="link-inline" href={appConfig.routes.privacy}>
                    persondatapolitik
                  </a>{" "}
                  for hvordan vi behandler dine oplysninger.
                </p>
              </motion.div>

              <motion.div variants={revealVariants(motionMode, "item")} data-testid="terms-section-what">
                <CardTitle>Hvad Glød er</CardTitle>
                <p className="body-text mt-3 leading-relaxed">
                  Glød er en event-platform for voksne i Danmark. Vi formidler aftener, hvor medlemmer kan mødes om
                  samtale, sanselighed og — på de eksplicitte aftener — fælles oplevelser inden for klart samtykke.
                  Glød er ikke en dating-app. Vi tilbyder ikke matching, swiping eller profilsøgning som
                  primær-funktion; mødet sker først til events.
                </p>
              </motion.div>

              <motion.div variants={revealVariants(motionMode, "item")} data-testid="terms-section-membership">
                <CardTitle>Medlemskab, pris og opsigelse</CardTitle>
                <p className="body-text mt-3 leading-relaxed">
                  Et medlemskab tegnes som månedligt eller årligt abonnement. Prisen fremgår tydeligt før betaling og
                  trækkes via vores betalingspartner. Du kan opsige dit medlemskab når som helst med øjeblikkelig
                  virkning fra næste betalingsperiode — du beholder adgang til udgangen af den periode, du allerede har
                  betalt for.
                </p>
                <p className="body-text mt-3 leading-relaxed">
                  Som forbruger har du <strong>14 dages fortrydelsesret</strong> jf. forbrugeraftaleloven fra det
                  tidspunkt, hvor du har afgivet bestillingen. Bemærk at fortrydelsesretten bortfalder, hvis du
                  udtrykkeligt anmoder om at få adgang til medlemslukket indhold straks — fx ved at tilmelde dig et
                  event, der afholdes inden for fortrydelsesfristen.
                </p>
              </motion.div>

              <motion.div variants={revealVariants(motionMode, "item")} data-testid="terms-section-event-cancellation">
                <CardTitle>Event-tilmeldinger og afmelding</CardTitle>
                <p className="body-text mt-3 leading-relaxed">
                  Tilmelding til et event er bindende fra det øjeblik, du har bekræftet din plads. Det enkelte event
                  angiver sin afmeldingsfrist; melder du afbud før fristen, refunderes eventets pris fuldt ud (eksklusive
                  eventuelt betalingsgebyr).
                </p>
                <p className="body-text mt-3 leading-relaxed">
                  Hvis Glød aflyser et event, refunderer vi 100 % af event-prisen til dit oprindelige betalingsmiddel
                  inden for 14 dage. Force majeure (sygdom hos værten, ekstreme vejrforhold, myndighedspålæg m.v.) kan
                  give anledning til ny dato i stedet for refundering — du har dog altid valget mellem ny dato og
                  refundering.
                </p>
              </motion.div>

              <motion.div variants={revealVariants(motionMode, "item")} data-testid="terms-section-not-allowed">
                <CardTitle>Hvad der ikke er tilladt</CardTitle>
                <ul className="body-text mt-3 list-inside list-disc space-y-1.5">
                  <li>Chikane, trusler, krænkelser eller anden form for grænseoverskridende adfærd.</li>
                  <li>Falske profiler, identitetstyveri eller manipulation af verifikation.</li>
                  <li>Deling af andre medlemmers oplysninger, billeder eller beskeder udenfor platformen.</li>
                  <li>Optagelse, fotos eller videregivelse af det, der sker på et event.</li>
                  <li>Kommerciel udnyttelse af medlemskabet — sexarbejde, escort eller hvervning er ikke tilladt.</li>
                  <li>Adfærd der bryder vores{" "}
                    <a className="link-inline" href={appConfig.routes.codeOfConduct}>
                      code of conduct
                    </a>{" "}
                    på events eller i platformen.</li>
                </ul>
              </motion.div>

              <motion.div variants={revealVariants(motionMode, "item")} data-testid="terms-section-moderation">
                <CardTitle>Moderation og konsekvenser</CardTitle>
                <p className="body-text mt-3 leading-relaxed">
                  Glød forbeholder sig retten til at moderere indhold, fjerne profiler og afbryde medlemskaber, hvis
                  vilkår eller code of conduct overtrædes. Konsekvenser kan være advarsel, midlertidig udelukkelse fra
                  konkrete events, eller permanent ban fra platformen. Alvorlige overtrædelser — særligt af samtykke —
                  kan føre til politianmeldelse.
                </p>
                <p className="body-text mt-3 leading-relaxed">
                  Du kan altid anmelde en oplevelse via reports-flowet i platformen eller ved at skrive direkte til{" "}
                  <a className="link-inline" href="mailto:mikkel@findgloed.dk">
                    mikkel@findgloed.dk
                  </a>
                  . Vi læser alle henvendelser og handler diskret.
                </p>
              </motion.div>

              <motion.div variants={revealVariants(motionMode, "item")} data-testid="terms-section-refund">
                <CardTitle>Refundering ved ophør</CardTitle>
                <p className="body-text mt-3 leading-relaxed">
                  Hvis vi ophæver dit medlemskab på grund af overtrædelse af vilkår eller code of conduct, refunderer
                  vi ikke for resterende periode. Hvis vi vælger at lukke Glød som platform, refunderes pro-rata for
                  uudnyttet medlemsperiode.
                </p>
              </motion.div>

              <motion.div variants={revealVariants(motionMode, "item")} data-testid="terms-section-changes">
                <CardTitle>Ændringer af vilkårene</CardTitle>
                <p className="body-text mt-3 leading-relaxed">
                  Vi kan ændre disse vilkår. Væsentlige ændringer varsles på e-mail med <strong>mindst 30 dages
                  varsel</strong>, inden de træder i kraft. Hvis du ikke kan acceptere en ændring, kan du opsige dit
                  medlemskab inden ikrafttræden og få refunderet pro-rata for resterende betalt periode.
                </p>
              </motion.div>

              <motion.div variants={revealVariants(motionMode, "item")} data-testid="terms-section-disputes">
                <CardTitle>Tvister og værneting</CardTitle>
                <p className="body-text mt-3 leading-relaxed">
                  Aftalen er underlagt dansk ret. Tvister søges først løst i dialog. Lykkes det ikke, kan du som
                  forbruger klage til Forbruger Europa eller Center for Klageløsning. Sag kan i sidste instans indbringes
                  for danske domstole med værneting hos sagsøgers hjemting.
                </p>
              </motion.div>

              <motion.div variants={revealVariants(motionMode, "item")} data-testid="terms-section-contact">
                <CardTitle>Kontakt</CardTitle>
                <p className="body-text mt-3">
                  Glød v/ <strong>Mikkel Freltoft Krogsholm</strong>
                  <br />
                  E-mail:{" "}
                  <a className="link-inline" href="mailto:mikkel@findgloed.dk">
                    mikkel@findgloed.dk
                  </a>
                </p>
              </motion.div>

              <motion.a
                className="link-inline"
                href={appConfig.routes.landing}
                variants={revealVariants(motionMode, "item")}
              >
                Tilbage til forsiden
              </motion.a>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}
