import { appConfig } from "@/config/app-config";
import { PartnerInterestModal } from "@/components/partner/partner-interest-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

export function VisionPage() {
  return (
    <section className="mx-auto w-full max-w-6xl space-y-8 px-6 py-16">
      <div className="glass-shell reveal-up p-8 md:p-10">
        <p className="noxus-kicker kicker-text mb-4 text-xs">Vores vision</p>
        <h1 className="noxus-title display-text text-4xl leading-tight md:text-5xl">
          Et trygt sted at udforske, mødes og høre til
        </h1>
        <p className="body-text mt-4 max-w-3xl leading-relaxed">
          Glød er en platform for mennesker, der vil mødes i virkeligheden først.
        </p>
        <p className="body-text mt-3 max-w-3xl leading-relaxed">
          Ikke kun for dating, men også for nysgerrighed, læring, fælles oplevelser og fællesskab omkring
          seksualitet og relationer.
        </p>
        <p className="body-text mt-3 max-w-3xl leading-relaxed">
          Vi tror på, at ægte forbindelser starter bedre i et rum, hvor man kan være sig selv, end i en endeløs
          chat.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <span className="glass-pill rounded-full px-4 py-2">Vi mødes i virkeligheden først</span>
          <span className="glass-pill rounded-full px-4 py-2">Fællesskab før algoritmer</span>
          <span className="glass-pill rounded-full px-4 py-2">Tryghed, samtykke og diskretion</span>
        </div>
      </div>

      <Card className="reveal-up reveal-delay-2 p-8 md:p-10">
        <CardContent className="space-y-8 pt-0">
          <div>
            <CardTitle>Vi starter med Dansk Sexologisk Akademi</CardTitle>
            <p className="body-text mt-3">
              Glød er startet i tæt samarbejde med Dansk Sexologisk Akademi i Sønderjylland. Det er vores første
              partner, fordi behovet er tydeligt, og fordi vi deler samme mål: mere tryghed, mere respekt og bedre
              rammer for mennesker, der vil udforske.
            </p>
            <p className="body-text mt-3">
              Samarbejdet er begyndelsen, ikke grænsen. Platformen er åben for flere foreninger, fagpersoner og
              organisationer, der vil være med til at skabe et stærkt miljø.
            </p>
          </div>

          <div>
            <h2 className="noxus-title display-text text-2xl">For dig, der kommer som menneske</h2>
            <ul className="body-text mt-3 list-inside list-disc space-y-1">
              <li>At udforske din seksualitet i trygge rammer.</li>
              <li>At møde andre mennesker gennem fælles oplevelser.</li>
              <li>At finde relationer, venskaber eller dating med mere dybde.</li>
              <li>At være en del af et fællesskab, hvor respekt er udgangspunktet.</li>
            </ul>
          </div>

          <div>
            <h2 className="noxus-title display-text text-2xl">For jer, der arbejder med mennesker</h2>
            <ul className="body-text mt-3 list-inside list-disc space-y-1">
              <li>At nå de rigtige mennesker med de rigtige events.</li>
              <li>At skabe trygge overgange fra første nysgerrighed til reel deltagelse.</li>
              <li>At bygge et sundt miljø med tydelige normer for samtykke og respekt.</li>
              <li>At stå stærkere sammen på tværs af organisationer.</li>
            </ul>
          </div>

          <div>
            <h2 className="noxus-title display-text text-2xl">Vores værdier</h2>
            <ul className="body-text mt-3 list-inside list-disc space-y-1">
              <li>Samtykke før alt.</li>
              <li>Respekt i måden vi mødes på.</li>
              <li>Tryghed gennem fællesskab.</li>
              <li>Plads til nysgerrighed uden fordømmelse.</li>
              <li>Diskretion og omtanke for privatliv.</li>
            </ul>
          </div>

          <div>
            <h2 className="noxus-title display-text text-2xl">Tre principper i praksis</h2>
            <div className="mt-3 space-y-4">
              <div className="glass-pill rounded-2xl p-4">
                <p className="display-text text-base font-semibold">MitID-verificeret adgang</p>
                <p className="body-text mt-2 text-sm">
                  Vi bruger MitID for at sikre, at der er rigtige mennesker på platformen. Med en zero-knowledge
                  tilgang ved vi ikke, hvem du er i detaljer, kun at du findes i virkeligheden.
                </p>
              </div>

              <div className="glass-pill rounded-2xl p-4">
                <p className="display-text text-base font-semibold">Event-first struktur</p>
                <p className="body-text mt-2 text-sm">
                  Vi tror på, at det fysiske møde gennem fælles oplevelser giver bedre relationer. Derfor mødes vi
                  først i virkeligheden og tager det digitale derfra.
                </p>
              </div>

              <div className="glass-pill rounded-2xl p-4">
                <p className="display-text text-base font-semibold">Tryghed og klare rammer</p>
                <p className="body-text mt-2 text-sm">
                  Tydelige forventninger, samtykke og respekt skaber ro. Det gør det lettere at udforske og møde
                  andre mennesker på en måde, der føles sikker og ordentlig.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <a href={appConfig.routes.landing}>Til ventelisten</a>
            </Button>
            <PartnerInterestModal />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
