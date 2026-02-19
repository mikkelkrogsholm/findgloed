import { appConfig } from "@/config/app-config";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

export function PrivacyPage() {
  return (
    <section className="mx-auto w-full max-w-6xl space-y-8 px-6 py-16">
      <div className="glass-shell reveal-up p-8 md:p-10">
        <p className="noxus-kicker kicker-text mb-4 text-xs">Privatliv og databeskyttelse</p>
        <h1 className="noxus-title display-text text-4xl leading-tight md:text-5xl">Persondatapolitik</h1>
        <p className="body-text mt-4 max-w-3xl leading-relaxed">
          Glød indsamler kun data, der er nødvendig for venteliste-flow, samtykkehåndtering og relevante
          event-opdateringer. Vi arbejder med dataminimering, neutral kommunikation og tydelige valgmuligheder.
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
              <li>Valgfri marketing-opt-in, hvis du aktivt vælger det.</li>
            </ul>
          </div>

          <div>
            <h2 className="noxus-title display-text text-2xl">Hvad vi bruger data til</h2>
            <ul className="body-text mt-3 list-inside list-disc space-y-1">
              <li>At sende bekræftelsesmail og aktivere venteliste-tilmelding.</li>
              <li>At sende velkomstmail efter bekræftelse.</li>
              <li>At sende marketing/opdateringer kun ved separat samtykke.</li>
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
              Vi deler ikke dine data med uvedkommende. Vi bruger databehandlere til mail og drift, når det er
              nødvendigt for at levere tjenesten sikkert.
            </p>
          </div>

          <div>
            <h2 className="noxus-title display-text text-2xl">Dine rettigheder</h2>
            <p className="body-text mt-3">
              Du kan til enhver tid kontakte os for indsigt, rettelse eller sletning via{" "}
              <a className="link-inline" href="mailto:support@findgloed.dk">
                support@findgloed.dk
              </a>
              . Du kan også framelde marketing ved at skrive til samme adresse.
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
