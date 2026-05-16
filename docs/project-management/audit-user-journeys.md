# User Journey Audit — Glød

**Dato:** 2026-05-16
**Auditeret af:** Claude (Opus 4.7)
**Branch:** `feature/platform-fase-1-4`
**Scope:** 13 brugerrejser inkl. public, medlem, par, betaling og admin.

---

## Sammenfatning

| Severity | Antal |
|----------|-------|
| Kritisk  | 3 |
| Høj      | 12 |
| Medium   | 14 |
| Lav      | 7 |
| **Total** | **36** |

**Top 5 mest kritiske issues:**

1. `GET /api/admin/verifications` returnerer **500 Internal Server Error** — admin kan ikke gennemgå verificeringer (kritisk).
2. **Ingen UI til oprettelse af par-profiler** — par-medlemskab og par-only events er reelt utilgængelige (kritisk).
3. **Ghost-medlemmer i medlemsoversigten** — nye signups dukker op som tomme kort uden `display_name`/billede fordi `listVerifiedMembers` ikke filtrerer på `onboarded_at` (høj-kritisk).
4. **Ingen UI til ID+selfie-verificering** — `api.uploadVerification` findes men er aldrig wired ind; admin kan dermed heller ikke gennemgå noget (høj).
5. **`/admin/events` er kun tilgængelig via direkte URL** — der er ingen navigation-link fra `/admin` eller fra SiteShell admin-nav (høj).

---

## 1. Public besøgende (Landing → Vision → Privatliv → Waitlist signup → Bekræft email)

### Issue 1.1 — Waitlist-bekræftelsesmail bliver aldrig sendt i dev
- **Severity:** høj
- **Type:** dead-end
- **Sted:** `backend/src/email.ts:11-15` (no-op hvis `RESEND_API_KEY` mangler) + dev-env har ingen Resend-nøgle.
- **Beskrivelse:** Når man tilmelder sig waitlist lokalt, returnerer API `"Tjek din email"`, men ingen mail forlader systemet, og maildev (`http://localhost:39567`) modtager intet. Token findes i DB men kan ikke nås. Public-flowet er reelt ikke testbart end-to-end uden manuelt token-grab fra Postgres.
- **Fix:** Tilføj en dev-fallback email-service der sender via maildev (SMTP) eller logger linket til konsol, fx en `ConsoleEmailService` der bruges når `RESEND_API_KEY` er tom.

### Issue 1.2 — "Handelsbetingelser" findes ikke som dokument
- **Severity:** medium
- **Type:** missing-feature
- **Sted:** `frontend/src/pages/landing-page.tsx:175`, `frontend/src/components/partner/partner-interest-modal.tsx:262`
- **Beskrivelse:** Checkbox kræver accept af "handelsbetingelserne og persondatapolitikken", men kun privatlivspolitikken har en route. Der er ingen `/terms` eller `/vilkaar`. GDPR-mæssigt problem og brud på reglen om at vilkår skal være tilgængelige før accept.
- **Fix:** Opret `/terms` route + side, og link både i checkbox-tekst og i header.

### Issue 1.3 — Landing tilbyder waitlist mens header tilbyder signup (parallelle funnels)
- **Severity:** medium
- **Type:** inconsistent-redirect
- **Sted:** `frontend/src/pages/landing-page.tsx` + `frontend/src/components/layout/site-shell.tsx:155-159`
- **Beskrivelse:** Landing-page sender folk til waitlist-tilmelding. Header har samtidig "Bliv medlem" der går til /signup hvor de kan oprette en fuld konto. To inkompatible mentale modeller side om side. Nye besøgende kan ikke gennemskue: "skal jeg på listen, eller bare oprette mig?"
- **Fix:** Vælg ét — enten gem signup bag waitlist-bekræftelse, eller fjern waitlist-formular og brug signup som den primære CTA.

### Issue 1.4 — Vision-page mangler signup-CTA
- **Severity:** lav
- **Type:** dead-end
- **Sted:** `frontend/src/pages/vision-page.tsx:204-208`
- **Beskrivelse:** Vision-sidens CTA siger "Til ventelisten" men ikke "Bliv medlem", selvom signup-flowet eksisterer. Inkonsistens med header.
- **Fix:** Tilføj sekundær Button "Bliv medlem nu" til /signup.

### Issue 1.5 — Wellness-markører i copy på landing & vision
- **Severity:** medium (brand-niveau, bryder beslutning 9)
- **Type:** broken-flow (brand-flow)
- **Sted:** `frontend/src/pages/landing-page.tsx:91` ("Et trygt sted for nysgerrige voksne") + `vision-page.tsx:67` ("Trygt rum"-vibe).
- **Beskrivelse:** Beslutning 9 låser: "'Trygt' siges én gang i privatlivspolitikken og vises gennem features". Landing leder med "trygt sted"; vision gentager principperne ("klare rammer for samtykke", "trygge overgange"). Disse er wellness-markører som er udfaset.
- **Fix:** Erstat "trygt sted" med voksen, direkte framing (fx "Voksne mennesker. Reelle møder."). Lad tryghed kun vises gennem konkrete features.

### Issue 1.6 — Waitlist-bekræftelses-success går videre til "Til forsiden" — ingen CTA til at oprette konto
- **Severity:** lav
- **Type:** dead-end
- **Sted:** `frontend/src/pages/waitlist-confirm-page.tsx:106-113`
- **Beskrivelse:** Når email er bekræftet siger appen "Din tilmelding er bekræftet" og giver kun knapper "Til forsiden" og "Læs persondatapolitik". Hvorfor ikke "Opret medlemskab nu"?
- **Fix:** Tilføj primær CTA til /signup i success-state.

### Issue 1.7 — Tilbage-knap på waitlist-confirm fører til landing — ikke logisk for nye besøgende
- **Severity:** lav
- **Type:** inconsistent-redirect
- **Sted:** Samme som 1.6
- **Beskrivelse:** Brugeren har lige bekræftet sin tilmelding. At sende dem til landing-page (med waitlist-formular der nu er irrelevant) er fjollet.

---

## 2. Partner-interesse (Vision modal → submit → confirm)

### Issue 2.1 — Partner-modalen mangler succes-CTA
- **Severity:** lav
- **Type:** dead-end
- **Sted:** `frontend/src/components/partner/partner-interest-modal.tsx:301-316`
- **Beskrivelse:** Efter submit vises kun "Luk"-knap. Ingen henvisning til hvor de kan læse mere om partnermodellen eller se næste skridt.
- **Fix:** Tilføj henvisning eller forventet svartid.

### Issue 2.2 — Partner-confirm-side håndterer fejl-paths som waitlist, men der er ingen fortsættelse efter bekræftelse
- **Severity:** lav
- **Type:** dead-end
- **Sted:** `frontend/src/pages/partner-confirm-page.tsx`
- **Beskrivelse:** Samme symptom som 1.6 — efter bekræftelse er der ingen tydelig næste-step CTA.

### Issue 2.3 — Partner-mails (samme dev-problem som 1.1)
- **Severity:** høj (i dev)
- **Type:** dead-end
- Inherits fra issue 1.1.

---

## 3. Ny medlemsoprettelse (`/signup` → onboarding → verification → profil)

### Issue 3.1 — Allerede-logget-ind brugere kan tilgå `/signup` og `/login`
- **Severity:** medium
- **Type:** missing-state
- **Sted:** `frontend/src/pages/signup-page.tsx:16-32`, `login-page.tsx:16-25`
- **Beskrivelse:** Logget-ind bruger der navigerer til /signup ser stadig signup-formularen. Ved submit får man USER_ALREADY_EXISTS — forvirrende.
- **Fix:** Useffect der tjekker `useSession()` og redirecter til /profile hvis authenticated.

### Issue 3.2 — `/onboarding` URL kan genbesøges af færdig-onboarded bruger uden redirect
- **Severity:** medium
- **Type:** missing-state
- **Sted:** `frontend/src/pages/onboarding-page.tsx:71-91`
- **Beskrivelse:** Hvis bruger har `onboarded_at !== null` og går til /onboarding, starter wizard'en forfra på trin 1 (role) med deres eksisterende værdier. Ingen "du er allerede onboarded — gå til profil"-redirect.
- **Fix:** Når `profile.onboarded_at` er sat, redirect direkte til /profile.

### Issue 3.3 — Manglende validering: `display_name` påkrævet på trin 3 men gemmes ikke ved "tilbage"
- **Severity:** lav
- **Type:** missing-state
- **Sted:** `frontend/src/pages/onboarding-page.tsx:111-114`
- **Beskrivelse:** Ved "Tilbage" gemmes intet — brugeren kan navigere frem og tilbage men forrige trin's data er allerede gemt. Hvis de tager tilbage fra "details" til "face", ændrer face_visibility og går frem igen, er deres details stadig gemt. OK i sig selv, men trin 3 validerer kun ved forward-klik. Mindre confusing-state.

### Issue 3.4 — Manglende UX-feedback når foto upload fejler grundet størrelse/mime
- **Severity:** medium
- **Type:** missing-state
- **Sted:** `onboarding-page.tsx:134-140`, `profile-page.tsx:104-118`
- **Beskrivelse:** Backend returnerer `FILE_TOO_LARGE` (413) eller `UNSUPPORTED_MIME_TYPE` (422), men frontend viser generisk "Kunne ikke uploade billedet." Brugeren ved ikke om de skal komprimere eller skifte format.
- **Fix:** Map error codes til specifikke beskeder.

### Issue 3.5 — `/onboarding/verification` siden viser "samtykke" men der er ingen UI til faktisk verificering
- **Severity:** høj
- **Type:** missing-feature
- **Sted:** `frontend/src/pages/verification-page.tsx`
- **Beskrivelse:** Beskeden lyder "Når MitID-integrationen er klar..." men endpointet `POST /api/me/verification` (med id_document + selfie) er live i backend. Hvis admin skal kunne approve nogen, skal nogen kunne submit. Lige nu er der INGEN måde at uploade ID på.
- **Fix:** Enten skjul/disable backend-endpointet eller tilføj en alternativ ID+selfie-flow til verification-page med tydelig "midlertidig manuel verificering"-framing.

### Issue 3.6 — Verification-page redirecter ikke videre efter accept
- **Severity:** lav
- **Type:** dead-end
- **Sted:** `frontend/src/pages/verification-page.tsx:38-53`
- **Beskrivelse:** Når brugeren klikker "Bekræft samtykke" reloades profilet og success-alert vises, men der er ingen automatisk videre-navigation. Brugeren skal manuelt klikke på en af 3 buttons. Acceptabelt, men en auto-redirect efter 2 sek til /profile ville være mere flydende.

### Issue 3.7 — "Trin 4 af 4" pages knap siger "Næste: verificering" — men siden hedder /onboarding/verification og brugeren får et samtykke-skærm, ikke "verificering"
- **Severity:** lav
- **Type:** inconsistent
- **Sted:** `onboarding-page.tsx:355`
- **Beskrivelse:** Brugere forventer at uploade ID når de klikker "Næste: verificering". I stedet får de et samtykke-checkbox til fremtidig verificering. Forventnings-mismatch.

---

## 4. Bruger logger ind (`/login` → landing)

### Issue 4.1 — Login redirecter altid til `/profile`, ikke til seneste page eller admin
- **Severity:** medium
- **Type:** inconsistent-redirect
- **Sted:** `frontend/src/pages/login-page.tsx:45`
- **Beskrivelse:** En admin der logger ind ender på /profile, ikke /admin. En bruger der prøvede at se /events før login ender også på /profile. Der er ingen `?next=/path` håndtering eller role-based redirect.
- **Fix:** Hvis `role === "admin"` redirect til /admin. Ellers behold /profile, men understøt `?next=` param.

### Issue 4.2 — Login-side kalder sig selv "Kun for administratorer"
- **Severity:** medium
- **Type:** inconsistent
- **Sted:** `frontend/src/pages/login-page.tsx:62`
- **Beskrivelse:** Page-kicker siger "Kun for administratorer" — men det er forkert nu hvor almindelige brugere også logger ind her. Det er reminiscens fra Fase 1 hvor kun admins kunne logge ind.
- **Fix:** Skift kicker til "Adgang for medlemmer" eller fjern den.

### Issue 4.3 — Login-side har "Læs persondatapolitik" men ikke link til "opret medlemskab"
- **Severity:** lav
- **Type:** missing-feature
- **Sted:** `frontend/src/pages/login-page.tsx:171-173`
- **Beskrivelse:** Bruger der lander på /login men ikke har konto har ingen tydelig vej til /signup.
- **Fix:** Tilføj "Ingen konto? Bliv medlem"-link i bunden af login-card.

### Issue 4.4 — Login-page ikke beskyttet mod allerede-logget-ind bruger
- Identical to Issue 3.1.

---

## 5. Verificeret medlem browser (`/members` → klik profil → interesse/blok/rapport)

### Issue 5.1 — **Ghost-medlemmer i `/members`-listen** [KRITISK]
- **Severity:** kritisk
- **Type:** broken-flow
- **Sted:** `backend/src/membership.ts:221-235` (`listVerifiedMembers`)
- **Beskrivelse:** Da nye brugere auto-verificeres som "temporary" ved oprettelse (`backend/src/auth.ts:62-76`), dukker brugere op i `/members` så snart de har registreret email+password, FØR de har gennemført onboarding. 13 ud af 14 medlemmer i den nuværende DB er ghost-profiler uden display_name, alder, bio eller billeder. Det er øjeblikkeligt et tillidsbrud for nye medlemmer der ser tomme kort med "Anonymt alias / Stemningsbillede mangler".
- **Fix:** Tilføj `AND u.onboarded_at IS NOT NULL` til `listVerifiedMembers` SQL'en.

### Issue 5.2 — `getPublicProfile` blokerer ikke ghost-profiler
- **Severity:** høj
- **Type:** broken-flow
- **Sted:** `backend/src/membership.ts:237-250`
- **Beskrivelse:** Selv hvis 5.1 fikses, kan man stadig hente `GET /api/members/:id` for en ghost-bruger. Burde returnere NOT_FOUND hvis `onboarded_at` er null.

### Issue 5.3 — Frontend viser "Skriver endnu ikke noget." for ghosts som om de var skægge introverte
- **Severity:** medium (afhænger af 5.1)
- **Sted:** `frontend/src/pages/member-detail-page.tsx:186-189`
- **Beskrivelse:** Når en ghost har `bio = null`, viser frontend "Skriver endnu ikke noget." Det er en charmerende tom-state for ægte brugere uden bio — men for en ghost uden display_name virker det forkert. Afhjælpes via 5.1.

### Issue 5.4 — Liste viser "Ingen verificerede medlemmer endnu" når listen er tom, men kun hvis viewer's verificering ikke krydses
- **Severity:** lav
- **Sted:** `frontend/src/pages/members-page.tsx:63-71`
- **Beskrivelse:** OK, men teksten "Kig forbi igen om kort tid" er hyggelig — ikke et reelt issue.

### Issue 5.5 — Bloker-flow har ingen unblock UI
- **Severity:** medium
- **Type:** missing-feature
- **Sted:** `frontend/src/pages/member-detail-page.tsx:80-86`
- **Beskrivelse:** Bloker fungerer (POST /api/me/blocks), men der er ingen UI til at se sine blokerede eller at unblock. Bruger skal manuelt curl. Hvis du blokker en ven ved en fejl er du fanget.
- **Fix:** Tilføj en blocks-liste-sektion på /profile eller en separat /me/blocks side.

### Issue 5.6 — Rapportér-flow bruger window.prompt (utilstrækkelig som UI)
- **Severity:** medium
- **Type:** broken-flow
- **Sted:** `frontend/src/pages/member-detail-page.tsx:88-98`
- **Beskrivelse:** Rapportér bruger native `window.prompt()` til at indtaste grund. Ingen kategorier (chikane / spam / falsk profil / andet), ingen mulighed for at vedhæfte besked-id eller event-post-id (selvom backend understøtter det). Det er en betoning af noget kritisk (moderation) der får 30 sek af UI-investering.
- **Fix:** Skift til en dialog med kategorier og fritekst.

### Issue 5.7 — Foretrukken handling-knap "Til beskeder" når der ikke er en samtale endnu
- **Severity:** medium
- **Type:** broken-flow
- **Sted:** `frontend/src/pages/member-detail-page.tsx:229-232`
- **Beskrivelse:** På medlemsprofil-siden findes knappen "Til beskeder" der bare navigerer til /messages — men hvis brugeren ikke har en gensidig interesse-match eller fælles event endnu, viser /messages bare en tom liste. Knappen lover at "føre til beskeder" men kan ikke åbne en chat med præcis den person.
- **Fix:** Gør knappen contextual — hvis der findes en samtale med personen, link direkte til /messages/:id. Ellers skjul knappen eller vis "Beskeder åbner ved gensidig interesse".

### Issue 5.8 — Ingen visning af indkomne interessesignaler nogen steder
- **Severity:** høj
- **Type:** missing-feature
- **Sted:** Ingen frontend bruger `api.listInterests().incoming`
- **Beskrivelse:** `GET /api/me/interests` returnerer en `incoming`-array (folk der har vist interesse for mig), men ingen UI viser den. Bruger får derved aldrig at vide at nogen har vist interesse for dem — kun når det bliver et match (og chat åbner automatisk). Det betyder Louise/gatekeeper-personaen aldrig kan "tage initiativ" baseret på indkomne signaler, og hele "gradueret tilladelse"-modellen (beslutning 8) er halvt implementeret.
- **Fix:** Tilføj badge i header eller en sektion på /profile der viser indkomne signaler. Lad brugeren reciprocate fra dér.

### Issue 5.9 — Withdraw interest viser bekræftelses-besked men ingen permanent-tilstand i UI
- **Severity:** lav
- **Sted:** `frontend/src/pages/member-detail-page.tsx:72-78`
- **Beskrivelse:** Når interesse trækkes tilbage skifter knappen tilbage til "Vis interesse", men beskeden "Interesse trukket tilbage." forsvinder ikke. Ren state-cleanup nit.

### Issue 5.10 — Ingen mekanisme til "private album grant" trods endpoint
- **Severity:** høj
- **Type:** missing-feature
- **Sted:** `frontend/src/lib/api.ts:190-198` — `grantPrivateAlbum`/`revokePrivateAlbum` aldrig kaldt fra UI
- **Beskrivelse:** Beslutning 4 (lag-baseret nøgenhed) afhænger af privat-album-grants. Backend understøtter det fuldt ud, men der er INGEN UI til at give/fjerne adgang. Den eneste lag-4-mekanisme (privat-delt) er ude af rækkevidde for brugerne.
- **Fix:** Tilføj sektion på member-detail (når relation = "match") med "Giv adgang til mit private album" og en oversigt på /profile over hvem du har givet adgang.

---

## 6. Match-flow

### Issue 6.1 — Auto-åbnet samtale fanges ikke i samtaleliste før reload
- **Severity:** lav
- **Type:** missing-state
- **Sted:** `member-detail-page.tsx:50-70`
- **Beskrivelse:** Efter gensidig interesse besked "chat åbnet" — men brugeren skal selv navigere til /messages og listen viser den så. Ingen direct-link til den nyåbne samtale.
- **Fix:** Når `conversation_opened === true`, redirect til /messages/:newId.

### Issue 6.2 — Ingen email-notifikation ved gensidig interesse
- **Severity:** medium
- **Type:** missing-feature
- **Beskrivelse:** Build-log nævner det. Bruger får ikke besked om match medmindre de logger ind og navigerer.

---

## 7. Event-flow

### Issue 7.1 — Event-thread polling mangler (kun samtale-thread poller)
- **Severity:** lav
- **Type:** missing-feature
- **Sted:** `frontend/src/components/event-thread.tsx`
- **Beskrivelse:** Bruger ser ikke nye event-kommentarer i realtid før reload eller refresh. Konversation-page poller 8s; event-thread gør ikke.

### Issue 7.2 — Event "ends_at" valideres ikke mod "starts_at"
- **Severity:** medium
- **Type:** broken-flow (admin)
- **Sted:** `backend/src/event-routes.ts:237-291`
- **Beskrivelse:** Admin kan oprette event med ends_at før starts_at uden valideringsfejl.
- **Fix:** Tilføj check `ends_at > starts_at` i createEvent og updateEvent.

### Issue 7.3 — My-events viser ikke past/upcoming separation
- **Severity:** medium
- **Type:** missing-feature
- **Sted:** `frontend/src/pages/my-events-page.tsx`
- **Beskrivelse:** Liste sorteres `ORDER BY starts_at DESC` (events.ts:342) men frontend distingverer ikke afholdte fra kommende. Brugerens næste event drukner under historik.
- **Fix:** Split i to sektioner: "Kommende" og "Tidligere".

### Issue 7.4 — Spots_left hardcoded til 0 i `/api/me/events`
- **Severity:** medium
- **Type:** broken-flow
- **Sted:** `backend/src/event-routes.ts:227` — `eventToPublicJson(r.event, true, 0)`
- **Beskrivelse:** "Mine tilmeldinger" viser altid 0 spots_taken og dermed `capacity` ledige pladser. Forvirrende — brugeren tror eventet er tomt selvom det er fyldt.
- **Fix:** Kald `countConfirmed(event.id)` i loop'et.

### Issue 7.5 — Adresse stadig vises på `/api/me/events` selv hvis status er pending eller cancelled
- **Severity:** medium
- **Type:** broken-flow
- **Sted:** `backend/src/event-routes.ts:227`
- **Beskrivelse:** `eventToPublicJson(r.event, **true**, 0)` — `is_registered` hardcodes til true, hvilket betyder location_address altid eksponeres for alle der har en registration-row, inklusiv `cancelled` (DEL'd) registrations. SQL'en filtrer på `('pending','confirmed','attended')` så cancelled udelukkes — men en bruger der annullerer og senere skifter mening kan stadig se adressen ved at tjekke `/me/events` mellem cancel og re-register.
- **Fix:** Filtrér address-felt baseret på status (kun confirmed/attended).

### Issue 7.6 — Event-thread tilgår alle deltagere men er ikke et chat-system
- **Severity:** lav (per design)
- **Type:** missing-feature
- **Beskrivelse:** Beslutning 8 siger "Samme event åbner chat for alle deltagere". Event-tråden er en fælles diskussion, men der er ingen knap til "skriv DM til denne deltager fra eventet" — selvom `api.startConversation(userId, eventSlug)` findes og understøttes af backend.
- **Fix:** Tilføj "DM"-knap per event-post-forfatter eller via en deltagerliste i event-detail-siden.

### Issue 7.7 — Events ud over "upcoming" kan ikke vises i en arkiv-vue
- **Severity:** lav
- **Type:** missing-feature
- **Sted:** `events.ts:156`
- **Beskrivelse:** Bruger der vil se "hvad var sidste måneds events?" har ingen mulighed.

### Issue 7.8 — "spots_left" på cancelled/draft events
- **Severity:** lav
- **Beskrivelse:** Public `listEvents` filtrer på `status = 'published'` så cancelled/draft skjules. OK.

### Issue 7.9 — Manglende UI-feedback ved kapacitets-fyldt event
- **Severity:** lav
- **Sted:** `event-detail-page.tsx:236-238`
- **Beskrivelse:** Hvis `spots_left === 0` viser knappen "Eventet er fyldt" — men kortet i listen siger stadig "0 af 24 pladser tilbage". OK men kunne være tydeligere markeret med en badge.

---

## 8. Mine tilmeldinger

(Dækket af 7.3, 7.4, 7.5 — alle vedrørende /me/events.)

---

## 9. Par-profil oprettelse [KRITISK]

### Issue 9.1 — **Ingen UI til at oprette par-profil** [KRITISK]
- **Severity:** kritisk
- **Type:** missing-feature
- **Sted:** `frontend/src/lib/api.ts:159-186` — `createCouple`/`updateCouple` aldrig brugt
- **Beskrivelse:** Backend understøtter par-oprettelse fuldt ud. Frontend gør IKKE. Konsekvenser:
  - **Par-only events** kan ingen tilmelde sig
  - **Couple-medlemskaber** kan ingen aktivere
  - **Mixed events** kan par ikke melde sig til
  - "Den der inviterer + Den der bestemmer tempoet"-beslutningen er kun halv-implementeret
  - Beslutning 8 "Singles → par kræver paret har 'open_to_singles' = true" kan ikke testes
- **Fix:** Tilføj par-sektion til /profile (eller dedikeret /profile/couple page) med:
  - Inviter partner via email (validér at den anden er verificeret + bekræfter linket)
  - Display name + bio + region for par
  - Toggles for `open_to_singles` og `accepts_mixed_events`
  - Mulighed for at opløse parforhold

### Issue 9.2 — `/me` returnerer `couple` men profile-page ignorerer det
- **Severity:** medium (afhænger af 9.1)
- **Sted:** `frontend/src/pages/profile-page.tsx`
- **Beskrivelse:** `data.couple` er altid `null` for samtlige brugere fordi der ikke er en UI til at oprette det.

### Issue 9.3 — Par-opbygning kræver "partner_email" som skal eksistere som verified user
- **Severity:** medium
- **Type:** broken-flow
- **Sted:** `backend/src/membership-routes.ts:378-415`
- **Beskrivelse:** Backend kræver partner-email matcher en eksisterende verified bruger. Ingen invite/email-confirm flow for partneren. Hvis partner ikke har oprettet konto: 404.
- **Fix:** Implementer invite-flow (send email til ikke-registrerede, link til signup, derefter binding).

---

## 10. Medlemskab/betaling

### Issue 10.1 — "Stripe ikke aktiveret"-disclaimer kan virke uprofessionel
- **Severity:** lav (acceptabelt for mock)
- **Type:** broken-flow
- **Beskrivelse:** UI'et siger åbent at det er mock. OK for nu, men flag.

### Issue 10.2 — Cancellér ved periodens udløb mangler "fortryd"-vindue
- **Severity:** lav
- **Sted:** `frontend/src/pages/membership-page.tsx:81-89`
- **Beskrivelse:** Bruger der cancellerer ved fejl kan godt "Genoptag" igen via knap. OK. Men der er ingen bekræftelses-trin før selve cancel-handlingen (kun et `window.confirm`).

### Issue 10.3 — Plans-listen filtreres mod audience baseret på couple-existence
- **Severity:** medium
- **Type:** missing-state
- **Sted:** `backend/src/subscription-routes.ts:34-44`
- **Beskrivelse:** Hvis bruger ikke har par, vises kun single-plans. Da der ingen UI er til couple-oprettelse (Issue 9.1) er couple-plans ureachable. Selvom dette løses afhænger flowet af 9.1.

### Issue 10.4 — `intro_price` viser "X kr. første måned" men trial-counter og intro-counter blandes ikke synligt
- **Severity:** lav
- **Type:** missing-state
- **Sted:** `frontend/src/pages/membership-page.tsx:18-26`
- **Beskrivelse:** Hvis en plan både har trial og intro (ingen plan har det nu, men teoretisk muligt), viser `planSummary` kun trial. OK i praksis.

### Issue 10.5 — Faktura-tekst vist som `<code>` med konteksten "Faktura-tekst på dit kontoudtog"
- **Severity:** lav
- **Sted:** `membership-page.tsx:156-159`
- **Beskrivelse:** Synligheden af "GLOEDDK"-tekst er fin, men det fremgår ikke at brugeren ikke kan ændre den.

### Issue 10.6 — Ingen historisk faktura-liste / kvitteringer
- **Severity:** medium
- **Type:** missing-feature
- **Beskrivelse:** Bruger der vil have kvittering har ingen vej. Backend gemmer `subscription_event`-audit log men ingen frontend.

### Issue 10.7 — Cancel/Resume sætter `cancel_at_period_end` men trial-perioder håndteres ikke specielt
- **Severity:** lav
- Beskrivelse: hvis bruger er i trial og cancellerer, hvad sker der? Backend mangler eksplicit trial-cancel.

---

## 11. Profil-redigering

### Issue 11.1 — **Ingen "Slet konto"-knap trods endpoint** [HØJ]
- **Severity:** høj
- **Type:** missing-feature
- **Sted:** `frontend/src/pages/profile-page.tsx:342-371` (Kontoadministration)
- **Beskrivelse:** `api.deleteMe(hard?)` findes i klienten og backend understøtter både soft- og hard-delete. Profile-page har "Pause"-knap men IKKE "Slet konto". GDPR-mæssigt problem (ret til at blive glemt).
- **Fix:** Tilføj rød "Slet konto"-knap med modal-bekræftelse + valg af soft vs hard.

### Issue 11.2 — Pause-knap mangler forklaring af konsekvenser
- **Severity:** lav
- **Type:** missing-state
- **Sted:** `profile-page.tsx:348-350`
- **Beskrivelse:** "Sæt profil på pause" forklarer ikke hvad det betyder (skjult fra /members, kan stadig logge ind, etc.).

### Issue 11.3 — `display_name` kan sættes til tom streng — men onboarding kræver den
- **Severity:** lav
- **Sted:** `profile-page.tsx:88` — `display_name: displayName.trim() || null`
- **Beskrivelse:** Brugeren kan slette sit alias på profile-siden så de ender med display_name=null igen og dukker op som "Anonymt alias" i /members.

### Issue 11.4 — Foto-position styres ikke fra UI
- **Severity:** lav
- **Sted:** `profile-page.tsx:111`
- **Beskrivelse:** Position sættes til `data?.photos.length ?? 0` automatisk. Der er ingen drag-and-drop reorder.

### Issue 11.5 — Foto-visibility kan ikke skiftes efter upload
- **Severity:** medium
- **Type:** missing-feature
- **Beskrivelse:** Upload-knapperne er pr. visibility-niveau, men hvis bruger lægger et "match"-foto og senere vil flytte til "verified", er der ingen edit. De skal slette og uploade igen.

### Issue 11.6 — Profile-page mangler couple-section (jf 9.2)
- Dækket af Issue 9.2.

### Issue 11.7 — Profile-page mangler block-list (jf 5.5)
- Dækket af Issue 5.5.

---

## 12. Admin-flow

### Issue 12.1 — **`GET /api/admin/verifications` returnerer 500** [KRITISK]
- **Severity:** kritisk
- **Type:** broken-flow
- **Sted:** `backend/src/membership.ts:548-557`
- **Beskrivelse:** SQL'en `SELECT ${VERIFICATION_FIELDS}, u.email AS email FROM verification_submission v JOIN "user" u ON u.id = v.user_id WHERE v.status = 'pending'` har ambigous `id`-kolonne fordi `VERIFICATION_FIELDS` ikke prefixer med `v.`. Postgres-fejl `column reference "id" is ambiguous` (kode 42702) bekræftet i container-logs.
- **Fix:** Prefix alle felter i `VERIFICATION_FIELDS` med `v.` ELLER opdater queryen til `SELECT v.id, v.user_id, v.id_document_path, v.selfie_path, v.status, v.submitted_at, ...`. Samme issue gælder formentlig også de andre funktioner der bruger `VERIFICATION_FIELDS` med JOIN.

### Issue 12.2 — **Ingen frontend til admin/verifications** [HØJ]
- **Severity:** høj
- **Type:** missing-feature
- **Sted:** Ingen page i `frontend/src/pages/`
- **Beskrivelse:** Selv hvis 12.1 fikses, er der ingen UI til at gennemgå pending verifications, approve eller reject. `api.listPendingVerifications`, `approveVerification`, `rejectVerification` findes men er ikke wired ind nogen steder. Sammenholdt med 3.5 (ingen submit-UI) er hele verificerings-loopet brudt.
- **Fix:** Opret `/admin/verifications` page med liste, billed-preview (kalder `/api/admin/verifications/:id/files/:kind`), approve/reject-knapper.

### Issue 12.3 — Ingen admin-UI til reports
- **Severity:** høj
- **Type:** missing-feature
- **Sted:** `backend/src/messaging-routes.ts:382-402`
- **Beskrivelse:** `GET /api/admin/reports` + `POST /api/admin/reports/:id/resolve` findes, men ingen frontend. Når brugere rapporterer hinanden (Issue 5.6), forsvinder rapporten ud i tomrummet.
- **Fix:** Opret `/admin/reports` page med listevisning + resolve-actions.

### Issue 12.4 — `/admin/events` har ingen navigations-vej
- **Severity:** høj
- **Type:** dead-end
- **Sted:** `frontend/src/components/layout/site-shell.tsx`
- **Beskrivelse:** SiteShell admin-link peger kun på `/admin` (leads). Fra /admin er der ingen knap til /admin/events. /admin/events linker tilbage til /admin, men den modsatte retning er glemt.
- **Fix:** Tilføj sub-nav i admin-page med links til "Leads", "Events", "Verifications", "Reports".

### Issue 12.5 — Frontend admin-routes (/admin, /admin/events) er ikke beskyttet i Apps routing
- **Severity:** medium
- **Type:** missing-state
- **Sted:** `frontend/src/App.tsx:86-91`
- **Beskrivelse:** Enhver logget-ind bruger kan navigere til /admin og /admin/events. Backend returnerer 403 så data lækker ikke, men UI'et viser fejl-state i stedet for at redirecte. Mindre alvorligt men inkonsistent.
- **Fix:** Hvis `session.profile.role !== "admin"`, redirect til /profile.

### Issue 12.6 — Admin event-form mangler validering for "endt før start"
- Dækket af 7.2.

### Issue 12.7 — Admin event-form: ingen redigering af eksisterende events
- **Severity:** medium
- **Type:** missing-feature
- **Sted:** `admin-events-page.tsx`
- **Beskrivelse:** Listen viser "Publicer"/"Slet" men ingen "Redigér". Backend understøtter `PATCH /api/admin/events/:id` men der er ikke UI til det.

### Issue 12.8 — Admin event-form: ingen visning af tilmeldinger
- **Severity:** medium
- **Type:** missing-feature
- **Beskrivelse:** Backend har `GET /api/admin/events/:id/registrations`. Ingen UI.

### Issue 12.9 — Admin-page bruger den ældre uden-motion design
- **Severity:** lav
- **Type:** inconsistent
- **Sted:** `frontend/src/pages/admin-page.tsx`
- **Beskrivelse:** Mens resten af platformen er gennemarbejdet med motion/glass-design, er admin-leads-page mere "plain" — `<select>` i stedet for shadcn `Select`, ingen variants. OK, men inkonsistent.

---

## 13. Logout

### Issue 13.1 — Logout går altid til landing — også hvis bruger var midt i kritisk flow
- **Severity:** lav
- **Type:** inconsistent
- **Sted:** `frontend/src/components/layout/site-shell.tsx:56-60`, `profile-page.tsx:138-142`
- **Beskrivelse:** Logout fra header → /landing. Logout fra profile → /landing. OK. Men ingen "Du er logget ud"-bekræftelse vises før omdirigering.

### Issue 13.2 — Better Auth-cookies fjernes korrekt — men `useSession` cache kunne stadig holde stale data midlertidigt
- **Severity:** lav
- **Sted:** `frontend/src/lib/use-session.ts`
- **Beskrivelse:** `clearSession()` opdaterer hele cachen, så sandsynligvis fint. Risiko: hvis flere komponenter har subscribet og listeneren ikke kører før render.

---

## 14. Andre fund

### Issue 14.1 — `not-found-page.tsx` har tegnsætsfejl
- **Severity:** lav
- **Sted:** `frontend/src/pages/not-found-page.tsx:11`
- **Beskrivelse:** "miljo" mangler ø.

### Issue 14.2 — Navigation via `window.history.pushState` + manuel `popstate` virker mellem komponenter, men nogle pages læser pathname direkte
- **Severity:** medium
- **Type:** broken-flow
- **Sted:** `member-detail-page.tsx:23`, `event-detail-page.tsx:23`, `conversation-page.tsx:21`
- **Beskrivelse:** Disse pages tager id'et fra `window.location.pathname.split("/").pop()` på render. Ved cross-navigation mellem to member-detail-pages (fx /members/A → /members/B) opdaterer `useEffect([memberId])` ikke automatisk fordi `memberId` udregnes uden for `useState`/`useMemo`. Risiko for stale data ved page-to-page navigation.
- **Fix:** Brug `useState` der lyttes via `popstate`, eller `useMemo` med dependency på en stable observer.

### Issue 14.3 — Header-pill "Du er midlertidigt verificeret" bliver først synlig efter session-load
- **Severity:** lav
- **Type:** missing-state
- **Sted:** `site-shell.tsx:258-272`
- **Beskrivelse:** Pillen vises kun når `isAuthenticated && isTemporaryVerified && !hasAcceptedFutureVerification`. Først ses den ikke (status = loading), så popper den ind. Layout-shift.

### Issue 14.4 — Vision FAQ siger "Alle brugere verificeres med MitID" men det er løgn lige nu
- **Severity:** medium
- **Type:** broken-flow (truthiness)
- **Sted:** `frontend/src/pages/vision-page.tsx:13-15`
- **Beskrivelse:** Public copy lover MitID-verificering. Reelt set er alle p.t. "temporary" verified. Hvis en kritisk journalist læser vision-siden og opretter en konto, opdager de straks at "MitID-verificeret adgang" er en marketing-claim.
- **Fix:** Sløvere wording ("Vi verificerer alle medlemmer manuelt mens MitID er under integration"), eller tag MitID-løftet ud indtil det er på plads.

### Issue 14.5 — Logo (`Glød`) i header navigerer til landing, også for logget-ind brugere
- **Severity:** lav
- **Type:** inconsistent-redirect
- **Sted:** `site-shell.tsx:87-97`
- **Beskrivelse:** Logget-ind bruger klikker logo → lander på offentlig landing-page (med waitlist-formular). Forvirrende. Standard-mønster ville være at logged-in users lander på dashboard.
- **Fix:** For authenticated brugere, lad logo gå til /profile eller /events.

### Issue 14.6 — Sletning af konto sletter ikke partner-kobling automatisk
- **Severity:** medium
- **Type:** broken-flow
- **Sted:** `backend/src/membership.ts:hardDelete/softDelete`
- **Beskrivelse:** Når bruger sletter sin konto, hænger par-koblingen ved (couple-row peger på en deleted user). Partner i parret står med en halvt-forsvundet relation. Ikke umiddelbart blokerende men datakvalitets-problem.

### Issue 14.7 — Email-format fra Better Auth ikke valideret før POST til /api/auth/sign-up
- **Severity:** lav
- **Sted:** `signup-page.tsx:28-30`
- **Beskrivelse:** Kun `email.includes("@")` som validering. Better Auth har sin egen validering, så ikke kritisk.

---

## Anbefalet prioritet

**Skal fixes før beta-test med Carina/Bjørn:**
1. Issue 5.1 (ghost-medlemmer i listen) — kosmetisk men ødelæggende første-indtryk
2. Issue 9.1 (par-profil UI) — kerne-feature er reelt mangelfuld
3. Issue 12.1 (admin/verifications 500) + 12.2 (UI) — admin kan ikke arbejde
4. Issue 11.1 (Slet konto) — GDPR
5. Issue 1.1 (dev-email) — blokerer test af waitlist-flow
6. Issue 5.8 (indkomne interesser ikke synlige) — gradueret tilladelses-model halv-implementeret
7. Issue 5.10 (private album-grants UI) — beslutning 4 ikke gennemført

**Bør fixes inden offentlig launch:**
- Issue 5.5/5.6 (block/report UX)
- Issue 7.4 (spots_left hardcoded 0)
- Issue 12.3 (admin reports UI)
- Issue 14.4 (MitID-løfte vs reality)
- Issue 1.5 (wellness-markører — bryder beslutning 9)
- Issue 1.2 (handelsbetingelser eksisterer ikke)
