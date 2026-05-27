# Glød — Designbeslutninger

**Dato:** 3. maj 2026
**Truffet af:** Mikkel, baseret på paneldebat 3. maj og Carina/Bjørns feedback fra april 2026.

Disse beslutninger er bindende for al efterfølgende design, copy og implementering. Hvis et nyt valg konflikter med en af disse, skal det op til Carina/Bjørn igen.

---

## 1. Tone-spektrum: Voksen sensualitet

Glød ligger mellem wellness og Erotic World — på "voksen sensualitet"-positionen (Maria/Frederik-zonen).

- Forsiden er hotelbar i halvmørke, ikke yoga-retreat og ikke porno
- Hud må antydes (nakke, ryg, hånd på lår), aldrig akt
- Sproget er voksent og direkte (lyst, begær, nærvær), aldrig krydre/rejse/hele
- Sexologisk Akademi er det legitimerende anker der gør at vi tør gå længere mod erotik uden at blive Erotic World, og længere mod tryghed uden at blive wellness

## 2. Positionering: Inviterende mand + bestemmende kvinde

Adopteret eksplicit fra Henrik & Louises indsigt.

- Onboarding spørger om initiativ-rollen i parret og tilpasser tonen
- Copy adresserer både "den der inviterer" og "den der bestemmer tempoet" som ligeværdige roller
- Marketing siger højt at vi forstår dynamikken — det er en konkurrencefordel ingen anden dansk platform har
- Det er ikke en rolle-tvang, men en anerkendelse når dynamikken findes

## 3. Events: Tre kategorier med opt-in mixed

- **Single-only** — kun for singles
- **Par-only** — kun for par
- **Mixed** — par der har aktivt opt'et ind for at deltage hvor singles også er

UI'et mærker kategorien tydeligt på hvert event. Par-profiler skal aktivt åbne for "vi vil gerne på events hvor der også er singles" før mixed events vises.

## 4. Profilbilleder: Lag-baseret med opt-in nøgenhed

Lag-modellen:

1. **Verden uden for Glød** (Google, ikke-medlemmer): ingen profil-data overhovedet, ingen indeksering
2. **Verificerede medlemmer** (lag 2): pseudonym + alder + region + kort tekst. Ansigt valgfrit (se beslutning 6).
3. **Match-niveau** (efter gensidig interesse): mere tekst, soft billeder, ansigt synligt
4. **Privat-delt** (aktivt åbnet for én person): alt brugeren vælger — inkl. nøgenhed med opt-in pr. visning

**Nøgenhed:**
- Aldrig på offentlig profil (lag 2)
- Aldrig automatisk synlig på match-niveau (lag 3)
- Kun i privat-delte albums hvor modtageren aktivt klikker "vis privat album" hver gang
- Brugeren kontrollerer pr. modtager hvem der får adgang

## 5. Begynder-spor: Filter, ikke identitet

- Intet separat begynder-spor eller -sektion
- Hvert event tagges med "også for første gang" eller "kræver erfaring"
- Intro-guide og FAQ tilgængelig overalt — ikke som en sektion man "tilhører"
- Line & Kasper kan filtrere; Camilla & Martin bliver ikke nedladt

## 6. Ansigt blandt verificerede: Valgfrit, default kun-efter-interesse

- Ved oprettelse spørges: vis ansigt for alle verificerede, eller kun efter gensidig interesse?
- **Default = kun efter interesse** (beskytter dem der ikke aktivt vælger)
- Brugeren kan ændre når som helst
- Default matcher beslutning 2: Louise har gatekeeper-beskyttelse pr. default; hun kan aktivt vælge at åbne sin synlighed når hun er klar

## 7. Eksplicitets-mærkning: Tre niveauer

Hvert event mærkes med præcist ét niveau:

1. **Sanseligt-socialt** — påklædt, samtale, flirtende
2. **Sensuelt** — afklædt eller delvist, intimt med egen partner men ikke mellem fremmede
3. **Eksplicit** — alt går inden for samtykke

Code of conduct og dresscode kobles pr. niveau. Tags kan tilføjes ovenpå senere hvis behov.

## 8. Beskedmodel: Gradueret tilladelse (Frederiks model)

- **Singles ↔ singles**: åbner efter gensidigt interesse-signal
- **Par ↔ par**: åbner efter gensidigt interesse-signal
- **Singles → par**: kræver at paret aktivt har slået "vi er åbne for kontakt fra singles" til
- **Samme event åbner chat for alle deltagere** uanset roller

Aldrig swipe, aldrig "match"-mekanik, aldrig likes, aldrig "online nu", aldrig gamification.

## 9. Sprog: Drop wellness-markers fra brand, tillad i konkrete event-titler

**Brand-niveau (forside, om-os, marketing, generel framing):** ingen tantra, wellness, selvudvikling, "indre rejse", "trygt rum" som mantra. "Trygt" siges én gang i privatlivspolitikken og vises gennem features (verificering, sexolog, code of conduct).

**Event-niveau:** Hvis Sexologisk Akademi rent faktisk afholder en tantrisk workshop, må event-titlen hedde "Tantrisk åndedrætsaften" — sproget skal følge den faktiske praksis.

### Bandlyste ord (alle niveauer)

❌ Krydre, "spice things up"
❌ Heling, "din indre rejse"
❌ Sårbarhed (som hovedord)
❌ Swinger, swingerklub
❌ Hardcore, kink (som primær framing)
❌ "Frække par søger"

### Accepterede ord

✓ Lyst, begær, nærvær, intimitet, sanselighed
✓ Voksen, mennesker, leg, mod
✓ Nysgerrighed, udforskning (som koncept, ikke som imperativ)

---

## Konsekvenser for implementering

- **Auth & profil**: lag-baseret synlighed kræver felter for synligheds-præferencer pr. lag
- **Onboarding**: 3 valg skal indfanges (ansigt-default, par-rolle, par-åbenhed for singles)
- **Events**: kategori (single/par/mixed) + eksplicitets-niveau (1-3) + erfaring-tag
- **Beskeder**: gradueret tilladelses-model — ikke et generisk "match"-system
- **Code of conduct**: skrives pr. eksplicitets-niveau
- **Copy-review**: alle nuværende landing/vision-tekster skal screenes mod bandlysningslisten
