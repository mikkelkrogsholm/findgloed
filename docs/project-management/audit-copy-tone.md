# Copy & Tone Audit — Glød

**Dato:** 16. maj 2026
**Auditor:** Claude (AI)
**Reference:** `docs/project-management/glod-design-beslutninger.md` — særligt beslutning 1 (voksen sensualitet) og beslutning 9 (sproglig bandlysning).

## Sammendrag

| Severity | Antal |
| -------- | ----- |
| Kritisk (bandlyst ord på brand)   | 5  |
| Høj (forkert tone / brand-voice)  | 14 |
| Medium (inkonsistens / engelsk)   | 17 |
| Lav (stavefejl / grammatik)       | 8  |
| **Total**                         | **44** |

**Mønstre:**

1. **"Trygt rum"-mantraet brydes massivt** — beslutning 9 siger "sig det én gang og vis det resten af tiden". Vi siger det 6+ gange på forsiden alene.
2. **Inkonsistent eventterminologi** — vi blander "events", "begivenheder", "aktiviteter", "tilmeldinger". Mangler ét fælles ord.
3. **Wellness-vokabular slipper igennem** — "rejse", "heling-agtige" formuleringer, "trygge overgange", "trygt rum".
4. **For terapeutisk/wellness-tone i seed-events** — "indre rejse"-agtige formuleringer; én bruger ordene "tantrisk", "sex-positiv" på platform-niveau.
5. **Tekniske kode-fragmenter eksponeret for bruger** — `subscription.status` viser rå engelsk; Stripe env-var navne i UI.
6. **Engelske ord i dansk flow** — "early access", "updates", "invites", "mock", "mixed events" (som badge-tekst).

---

## Issues (sorteret efter severity)

### KRITISK — bandlyste ord på brand-niveau

| # | Fil / linje | Aktuel tekst | Type | Forslag |
|---|-------------|-------------|------|---------|
| 1 | `backend/src/seed-demo.ts:117` | "...men heller ikke en tantrisk weekend." | bandlyst (tantra på brand) | "...men heller ikke en spirituel weekend." (eller fjern bisætningen) |
| 2 | `backend/src/seed-demo.ts:99` | facilitator_credential: "Sexolog & terapeut" | bandlyst-adjacent (terapeut signalerer wellness/heling) | "Sexolog, Sexologisk Akademi" — vi taler ikke om terapeuter |
| 3 | `backend/src/seed-demo.ts:145` | "Folk der er nye i sex-positive rum, eller som søger en blødere ramme." | bandlyst-adjacent — "sex-positive rum" er en subkulturel framing der trækker mod kink/swinger | "Folk der er nye i eksplicitte rum, eller som søger en blødere ramme." |
| 4 | `frontend/src/pages/membership-page.tsx:115` | "Et medlemskab er det filter der gør Glød trygt." | tone — "trygt" som mantra (5. gang) | "Et medlemskab er det filter der lukker resten af verden ude." |
| 5 | `frontend/src/components/partner/partner-interest-modal.tsx:32` | INTEREST_OPTIONS: "Styrke trygge rammer" | tone — "trygge" som mantra (6. gang) | "Styrke rammer for samtykke og respekt" |

### HØJ — forkert tone / wellness-spor / for terapeutisk

| # | Fil / linje | Aktuel tekst | Type | Forslag |
|---|-------------|-------------|------|---------|
| 6 | `frontend/src/pages/vision-page.tsx:110` | "...samme mål: trygge rammer, tydelige normer og bedre møder mellem mennesker." | tone — "trygge" på brand-side | "...samme mål: klare normer og bedre møder mellem voksne." |
| 7 | `frontend/src/pages/vision-page.tsx:152` | "Skab trygge overgange fra interesse til deltagelse." | tone — "trygge overgange" lyder som change-management-konsulent | "Før deltagerne fra interesse til deltagelse med klare rammer." |
| 8 | `frontend/src/pages/signup-page.tsx:75` | "Vi verificerer alle medlemmer manuelt — det er det der gør Glød trygt at være på." | tone — "trygt" igen + sælgende kommentar | "Vi verificerer alle medlemmer manuelt. Det filtrerer voksent fra resten." |
| 9 | `frontend/src/pages/landing-page.tsx:92` | "Et trygt sted for nysgerrige voksne." (H1) | tone — H1 er litterært "trygt rum"-mantra | "Et voksent sted at mødes — i virkeligheden først." |
| 10 | `frontend/src/pages/landing-page.tsx:95` | "...vil møde mennesker gennem oplevelser - ikke swipe-kultur." | tone — bindestreg burde være tankestreg; "oplevelser" er vagt | "...vil møde mennesker gennem virkelige aftener — ikke gennem swipes." |
| 11 | `frontend/src/pages/landing-page.tsx:149` | "...får besked om lancering, early access og kommende events. Ingen støj." | engelsk + tone — "early access" + "ingen støj" er SaaS-startup-tone | "...får besked om lancering, om at komme tidligt ind, og om kommende aftener." |
| 12 | `frontend/src/pages/landing-page.tsx:186` | "Ja tak - send mig eksklusive invites, nyheder og updates fra Glød." | engelsk — "invites" og "updates" | "Ja tak — send mig invitationer og opdateringer fra Glød." |
| 13 | `backend/src/seed-demo.ts:63` | "En faciliteret aften med øvelser i tilstedeværelse og åbning... Du går derfra med konkrete redskaber..." | tone — "redskaber", "tilstedeværelse" er coach/wellness-talk | "En aften med øvelser i nærvær og åbning... Du går derfra med en tydeligere fornemmelse af hvad nærvær gør ved kontakten." |
| 14 | `backend/src/seed-demo.ts:92` | "Par der søger spænding mellem fremmede. Det her er om jeres relation." | tone OK, men "spænding mellem fremmede" er kliché — kan strammes | "Par der søger andre par. Det her er om jer to." |
| 15 | `frontend/src/pages/vision-page.tsx:133` | "Find venskaber, relationer eller dating med mere dybde." | tone — "med mere dybde" er Tinder-konkurrent-sprog | "Find venskaber, relationer eller noget der starter med en samtale i stedet for en swipe." |
| 16 | `frontend/src/pages/vision-page.tsx:60-69` | "Vi bygger en platform, hvor nysgerrighed, respekt og samtykke går hånd i hånd." | tone — "går hånd i hånd" er trivielt PR-sprog | "Nysgerrighed, respekt og samtykke står ikke i konflikt — de hænger sammen." |
| 17 | `frontend/src/components/event-thread.tsx:85` | "Skab fællesskab før og efter eventet — det her er ikke et kødmarked, men en samtale." | tone — "kødmarked" er for hårdt/krænkende på brand | "En tråd til at fortsætte samtalen før og efter aftenen." |
| 18 | `frontend/src/pages/vision-page.tsx:160` | "Bliv en del af et stærkere partnernetværk." | tone — corporate-network-sprog | "Vær med i et netværk af partnere der deler vores standard." |
| 19 | `frontend/src/pages/onboarding-page.tsx:206-208` | "Glød er bygget til at adressere både den der inviterer respektfuldt og den der bestemmer tempoet." | tone — "adressere respektfuldt" er management-sprog | "Glød anerkender både den der inviterer og den der bestemmer tempoet — som ligeværdige roller." |

### MEDIUM — inkonsistens / engelsk / tekniske termer eksponeret

| # | Fil / linje | Aktuel tekst | Type | Forslag |
|---|-------------|-------------|------|---------|
| 20 | `frontend/src/pages/events-page.tsx:73` vs `events-page.tsx:163` | "Begivenheder" (kicker) men kort efter "{event.title}" og overalt ellers "events" | inkonsistens — vi bruger "events" og "begivenheder" om hinanden | Vælg ét: brug "Aftener" eller "Events" konsekvent. "Begivenheder" lyder kommunalt. |
| 21 | `frontend/index.html:16,23,24,31,46,57` | "begivenheder" overalt i meta (Open Graph, JSON-LD) | inkonsistens — meta siger "begivenheder", app siger "events" | Match app: "events" eller "aftener" i meta også. |
| 22 | `frontend/src/pages/vision-page.tsx:23` | "Du møder andre mennesker via aktiviteter og events" | inkonsistens — "aktiviteter og events" er pleonastisk + blander termer | "Du møder andre mennesker til events, ikke ved at swippe profiler." |
| 23 | `frontend/src/pages/membership-page.tsx:135` | `<Badge>{subscription.status}</Badge>` | fejlbesked — viser rå engelsk ("active", "trialing", "past_due") til bruger | Map til dansk: "Aktiv", "Prøveperiode", "Mislykket betaling" |
| 24 | `frontend/src/pages/my-events-page.tsx:84` | `<Badge>{reg.status}</Badge>` | fejlbesked — viser rå "confirmed"/"cancelled" | Map til dansk: "Tilmeldt", "Afmeldt", "På venteliste" |
| 25 | `frontend/src/pages/admin-events-page.tsx:420` | `<Badge>{event.status}</Badge>` | fejlbesked — admin-page men stadig brugersynligt | Map: "Kladde", "Publiceret", "Aflyst", "Afholdt" |
| 26 | `frontend/src/pages/membership-page.tsx:233-238` | "Stripe er ikke aktiveret endnu — alle abonnementer i denne version er mock... Når Stripe-nøglerne er sat (env vars `STRIPE_SECRET_KEY` og `STRIPE_WEBHOOK_SECRET`) overtager den rigtige integration." | placeholder + eksponerer kode | Skjul helt for almindelig bruger. Hvis det skal vises: "Betaling er endnu ikke aktiveret — denne version registrerer kun din intention. Vi sender besked, når faktura aktiveres." |
| 27 | `frontend/src/pages/landing-page.tsx:198` | "Sender..." (tre prikker) | inkonsistens — andre steder bruges ellipsis-tegn `…` | "Sender…" |
| 28 | `frontend/src/pages/signup-page.tsx:155` | "Opretter..." | inkonsistens — samme som ovenstående | "Opretter…" |
| 29 | `frontend/src/pages/login-page.tsx:166` | "Arbejder..." | tone + inkonsistens — "Arbejder" er teknisk; ellipsis-stil | "Logger ind…" |
| 30 | `frontend/src/components/partner/partner-interest-modal.tsx:294` | "Sender..." | inkonsistens | "Sender…" |
| 31 | `frontend/src/pages/member-detail-page.tsx:164` | `{profile.display_name ?? "Anonym"}` | inkonsistens — `members-page.tsx:120` siger "Anonymt alias" for samme situation | Match: "Anonym" begge steder, eller "Uden alias" begge steder. |
| 32 | `frontend/src/pages/member-detail-page.tsx:203` | `<Badge>Mixed events OK</Badge>` | engelsk på brand badge | "Åbne for mixed-events" eller "Også for blandede aftener" |
| 33 | `frontend/src/pages/member-detail-page.tsx:226` | "Interesse sendt — fjern" | tone — knap-tekst er fragmenteret | "Træk interesse tilbage" |
| 34 | `frontend/src/pages/profile-page.tsx:268-271` | "Synlighed: **verificeret** ses af alle verificerede. **match** kræver gensidig interesse. **privat** kun for dem du eksplicit åbner dit private album for." | tone — for teknisk, lange forklaringer på inline-niveau | Brug definition-list eller hover-tooltip. Kort: "Synlighed bestemmer hvem der ser hvilke billeder. Læs guiden." |
| 35 | `frontend/src/pages/profile-page.tsx:217` | placeholder "Voksent, direkte, dig." | tone OK men kunne være varmere | "F.eks. hvad du laver når du ikke er på arbejde, og hvad du leder efter her." |
| 36 | `frontend/src/pages/onboarding-page.tsx:311` | "{bio.length}/600 tegn. Skriv som dig selv — ikke som en annonce." | tone OK, men "som en annonce" er overflødigt belærende | "{bio.length}/600 tegn. Skriv som dig selv." |

### LAV — stavefejl, grammatik, kommatering

| # | Fil / linje | Aktuel tekst | Type | Forslag |
|---|-------------|-------------|------|---------|
| 37 | `frontend/src/pages/not-found-page.tsx:11` | "Siden findes ikke, eller er deaktiveret i dette miljo." | stavefejl — "miljo" → "miljø" | "Siden findes ikke eller er deaktiveret i dette miljø." (også: komma skal væk; det er sideledssætning) |
| 38 | `frontend/src/pages/vision-page.tsx:28` | "...blot en åben sind og lyst til at møde ligesindede via events." | grammatik — "sind" er intetkøn: "et åbent sind" | "...blot et åbent sind og lyst til at møde ligesindede til events." |
| 39 | `frontend/src/pages/landing-page.tsx:95` | "...gennem oplevelser - ikke swipe-kultur." | typografi — bindestreg skal være tankestreg (— med spatier) | "...gennem oplevelser — ikke swipe-kultur." |
| 40 | `frontend/src/pages/landing-page.tsx:186` | "Ja tak - send mig..." | typografi — bindestreg skal være tankestreg | "Ja tak — send mig..." |
| 41 | `frontend/src/components/partner/partner-interest-modal.tsx:263` | "Jeg accepterer handelsbetingelser og persondatapolitik" | stilistik — mangler "..ne" + ".." (definite form) for konsistens med signup | "Jeg accepterer handelsbetingelserne og persondatapolitikken." (også: punktum mangler — andre checkbox-labels har punktum) |
| 42 | `frontend/src/pages/onboarding-page.tsx:267` | placeholder: "F.eks. Moa, Nordlys, eller dit fornavn" | komma — ingen komma før "eller" når der ikke følger ledsætning | "F.eks. Moa, Nordlys eller dit fornavn" |
| 43 | `frontend/src/pages/admin-events-page.tsx:179` | placeholder: "aabent-nakkeparti-aften" | placeholder — exempel-slug indeholder "nakkeparti" som er kropsdel; ikke fejl men måske ikke ideelt eksempel-slug | "intim-aabning-koebenhavn" eller noget mere generisk |
| 44 | `frontend/src/pages/member-detail-page.tsx:188-190` | "Skriver endnu ikke noget." | grammatik/tone — sætningen lyder forkert ("skriver" ikke "har skrevet") | "Har ikke skrevet noget endnu." |

---

## Anbefalinger på struktur-niveau

1. **Lav en `LABEL.ts`-fil for tekniske statusser.** Map alle `status`, `verified_via`, `code`-værdier til danske strings. Eksisterer allerede for `LEVEL_LABEL`/`CATEGORY_LABEL` (event-display.ts) — udvid mønsteret.

2. **Vælg ét ord for events.** Forslag: "events" på app-niveau (kort, kendt), "begivenheder" væk fra hele app + meta (lyder kommunalt). Eller skift til "aftener" der matcher voksen sensualitet-tonen bedst af alle — for så er hver event "Intim åbning — en aften om nærvær".

3. **Find-replace "trygt"/"trygge" projekt-bredt.** Reservér det ene brug til privatlivspolitikken jf. beslutning 9.

4. **Strip Stripe/env-var noter fra membership-siden.** Brugersynlig tekst må aldrig nævne `STRIPE_SECRET_KEY`.

5. **Standardisér ellipsis** (`…` ikke `...`) i alle loading-states.

6. **Brand-kicker-stil** — "noxus-kicker" navnet i CSS-klassen er en mærkelig artefakt; ikke en copy-issue men værd at bemærke for konsistens.

7. **Tilføj en samtykke-/brand-voice-test til CI** — lille regex-script der fanger bandlyste ord på brand-niveau (med whitelist for event-titler og kommentarer).
