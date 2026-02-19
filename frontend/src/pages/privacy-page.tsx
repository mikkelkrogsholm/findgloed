import { appConfig } from "@/config/app-config";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

export function PrivacyPage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16">
      <Card className="p-8 md:p-10">
        <CardContent className="space-y-6 pt-0">
          <CardTitle>Persondatapolitik</CardTitle>
          <p className="body-text">
            Glød indsamler kun den data, der er nødvendig for at administrere venteliste og kommende events.
          </p>

          <div>
            <h2 className="noxus-title display-text mb-2 text-2xl">Hvad vi indsamler</h2>
            <ul className="body-text list-inside list-disc space-y-1">
              <li>Emailadresse, når du skriver dig på ventelisten.</li>
              <li>Tidspunkt for tilmelding.</li>
              <li>Samtykke til handelsbetingelser/persondatapolitik.</li>
              <li>Valgfri marketing-opt-in (hvis du aktivt vælger det).</li>
            </ul>
          </div>

          <div>
            <h2 className="noxus-title display-text mb-2 text-2xl">Hvad vi bruger data til</h2>
            <ul className="body-text list-inside list-disc space-y-1">
              <li>At sende bekræftelsesmail (double opt-in) og ventelisteopdateringer.</li>
              <li>At sende marketing/opdateringer kun hvis du har givet separat samtykke.</li>
            </ul>
          </div>

          <div>
            <h2 className="noxus-title display-text mb-2 text-2xl">Double opt-in</h2>
            <p className="body-text">
              Når du skriver dig op, sender vi en bekræftelsesmail. Din tilmelding aktiveres først, når du klikker
              på bekræftelseslinket.
            </p>
          </div>

          <div>
            <h2 className="noxus-title display-text mb-2 text-2xl">Deling af data</h2>
            <p className="body-text">
              Vi deler ikke dine data med uvedkommende. Vi bruger databehandlere til mail og
              betalingsinfrastruktur, når det er nødvendigt for driften.
            </p>
          </div>

          <div>
            <h2 className="noxus-title display-text mb-2 text-2xl">Dine rettigheder</h2>
            <p className="body-text">
              Du kan til enhver tid kontakte os for indsigt eller sletning af dine data via{" "}
              <a className="link-inline" href="mailto:support@findgloed.dk">
                support@findgloed.dk
              </a>
              . Hvis du vil framelde marketing, kan du også skrive til samme adresse.
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
