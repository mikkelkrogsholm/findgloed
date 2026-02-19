import { appConfig } from "@/config/app-config";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

export function PrivacyPage() {
  return (
    <section className="mx-auto w-full max-w-6xl space-y-8 px-6 py-16">
      <div className="glass-shell reveal-up p-8 md:p-10">
        <p className="noxus-kicker kicker-text mb-4 text-xs">Privatliv og databeskyttelse</p>
        <h1 className="noxus-title display-text text-4xl leading-tight md:text-5xl">Persondatapolitik</h1>
        <p className="body-text mt-4 max-w-3xl leading-relaxed">
          Glød indsamler kun de oplysninger, der er nødvendige for at håndtere ventelisten, bekræfte din tilmelding
          og holde dig opdateret om platformen. Opdateringer om Glød og lancering er en del af venteliste-tilmeldingen.
          Markedsføring om events, tilbud og samarbejdspartnere er altid et separat tilvalg.
        </p>
      </div>

      <Card className="reveal-up reveal-delay-2 p-8 md:p-10">
        <CardContent className="space-y-8 pt-0">
          <div>
            <CardTitle>Hvad vi indsamler</CardTitle>
            <ul className="body-text mt-3 list-inside list-disc space-y-1">
              <li>Emailadresse, når du skriver dig på ventelisten.</li>
              <li>Tidspunkt for tilmelding og bekræftelse (double opt-in).</li>
              <li>Samtykke til handelsbetingelser og persondatapolitik.</li>
              <li>Dit valg om markedsføring (kun hvis du aktivt siger ja).</li>
            </ul>
          </div>

          <div>
            <h2 className="noxus-title display-text text-2xl">Hvad vi bruger data til</h2>
            <ul className="body-text mt-3 list-inside list-disc space-y-1">
              <li>At sende bekræftelsesmail og aktivere venteliste-tilmelding.</li>
              <li>At sende opdateringer om Glød, vores fremdrift og besked om lancering.</li>
              <li>At sende markedsføring om events, tilbud og samarbejder, kun hvis du har givet særskilt samtykke.</li>
            </ul>
          </div>

          <div>
            <h2 className="noxus-title display-text text-2xl">Double opt-in</h2>
            <p className="body-text mt-3">
              Når du skriver dig op, sender vi en bekræftelsesmail. Tilmeldingen bliver først aktiv, når du
              klikker på linket. Det beskytter både dig og platformen mod misbrug.
            </p>
          </div>

          <div>
            <h2 className="noxus-title display-text text-2xl">Deling af data</h2>
            <p className="body-text mt-3">
              Vi deler ikke dine oplysninger med uvedkommende. Vi bruger kun databehandlere, der er nødvendige for
              sikker drift af platformen og udsendelse af emails.
            </p>
          </div>

          <div>
            <h2 className="noxus-title display-text text-2xl">Dine rettigheder</h2>
            <p className="body-text mt-3">
              Du kan til enhver tid kontakte os for indsigt, rettelse eller sletning via{" "}
              <a className="link-inline" href="mailto:support@findgloed.dk">
                support@findgloed.dk
              </a>
              . Du kan også altid afmelde markedsføring uden at miste vigtige opdateringer om din venteliste-tilmelding.
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
