import { appConfig } from "@/config/app-config";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

export function PrivacyPage() {
  return (
    <section className="mx-auto w-full max-w-6xl space-y-8 px-6 py-16">
      <div className="glass-shell reveal-up p-8 md:p-10">
        <p className="noxus-kicker kicker-text mb-4 text-xs">Privatliv og data</p>
        <h1 className="noxus-title display-text text-4xl leading-tight md:text-5xl">Persondatapolitik</h1>
        <p className="body-text mt-4 max-w-3xl leading-relaxed">
          Vi indsamler kun de oplysninger, der er nødvendige for at håndtere din tilmelding og kommunikere om Glød.
          Vi sælger ikke dine data, og markedsføring er altid et separat valg.
        </p>
      </div>

      <Card className="reveal-up reveal-delay-2 p-8 md:p-10">
        <CardContent className="space-y-8 pt-0">
          <div>
            <CardTitle>Hvad vi indsamler</CardTitle>
            <ul className="body-text mt-3 list-inside list-disc space-y-1">
              <li>E-mailadresse, når du tilmelder dig ventelisten.</li>
              <li>Tidspunkt for tilmelding og bekræftelse (double opt-in).</li>
              <li>Registrering af samtykke til vilkår og persondatapolitik.</li>
              <li>Dit valg om markedsføring (kun hvis du aktivt siger ja).</li>
            </ul>
          </div>

          <div>
            <h2 className="noxus-title display-text text-2xl">Hvad vi bruger data til</h2>
            <ul className="body-text mt-3 list-inside list-disc space-y-1">
              <li>At bekræfte din tilmelding.</li>
              <li>At sende praktiske opdateringer om venteliste og lancering.</li>
              <li>At sende markedsføring om events og tilbud, kun hvis du har givet særskilt samtykke.</li>
            </ul>
          </div>

          <div>
            <h2 className="noxus-title display-text text-2xl">Double opt-in</h2>
            <p className="body-text mt-3">
              Når du tilmelder dig, sender vi en bekræftelsesmail. Din tilmelding er først aktiv, når du klikker på
              linket i mailen.
            </p>
          </div>

          <div>
            <h2 className="noxus-title display-text text-2xl">Dataminimering</h2>
            <p className="body-text mt-3">
              Vi gemmer kun det nødvendige. Vi opbevarer ikke CPR-nummer eller andre unødvendige
              identitetsoplysninger.
            </p>
          </div>

          <div>
            <h2 className="noxus-title display-text text-2xl">Deling af data</h2>
            <p className="body-text mt-3">
              Vi deler ikke dine oplysninger med uvedkommende. Data behandles kun af nødvendige databehandlere til
              drift af platformen og udsendelse af e-mails.
            </p>
          </div>

          <div>
            <h2 className="noxus-title display-text text-2xl">Dine rettigheder</h2>
            <p className="body-text mt-3">
              Du kan kontakte os for indsigt, rettelse eller sletning på{" "}
              <a className="link-inline" href="mailto:support@findgloed.dk">
                support@findgloed.dk
              </a>
              . Du kan altid afmelde markedsføring uden at miste vigtige driftsbeskeder om din tilmelding.
            </p>
          </div>

          <div>
            <h2 className="noxus-title display-text text-2xl">Kontakt</h2>
            <p className="body-text mt-3">
              E-mail:{" "}
              <a className="link-inline" href="mailto:support@findgloed.dk">
                support@findgloed.dk
              </a>
            </p>
          </div>

          <a className="link-inline" href={appConfig.routes.landing}>
            Tilbage til forsiden
          </a>
        </CardContent>
      </Card>
    </section>
  );
}
