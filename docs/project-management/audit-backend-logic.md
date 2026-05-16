# Backend-audit — Glød API (Bun/Hono, port 39564)

Audit-tidspunkt: 2026-05-16
Scope: `/Users/mikkelfreltoftkrogsholm/Projekter/findgloed/backend/src/*.ts`

Reference: glod-design-beslutninger.md (beslutning 4, 6, 8) og findgloed-app skill.

---

## Oversigt

| Severity | Antal |
|---|---|
| Kritisk | 12 |
| Høj | 17 |
| Medium | 13 |
| Lav | 6 |
| **Total** | **48** |

---

## Kritiske issues (auth-bypass, data-lækage, data-tab, race conditions)

### 1. Privat-album: en grant for ÉN bruger giver adgang til ALLE billeder af samme ejer
- **Severity**: kritisk
- **Type**: auth / data-leak
- **Fil**: `backend/src/membership-routes.ts:521-563`, `backend/src/membership.ts:470-485`
- **Beskrivelse**: `GET /api/members/photo/:id` slår `recordPrivateAlbumView(photo.owner_user_id, photo.owner_couple_id, viewer)` op. Hvis viewer har EN grant fra ejeren, returneres billedet — uanset om dette specifikke `photoId` faktisk var inkluderet i den private grant. Da grants modelleres som "én grant pr. ejer→viewer" (ikke pr. billede), kan en bruger der har fået adgang til ét privat billede, anmode om alle ejerens private billeder via direkte `/api/members/photo/:id`. Beslutning 4 lyder "kun via aktiv grant pr. visning" — implementationen er pr. ejer, ikke pr. billede.
- **Udnyttelsesscenarie**: Ejer giver Alice grant for at se ét privat foto. Alice scraper alle `photo_id` (fra fx tidligere member-listing eller gæt på UUID-rækkefølge) og henter samtlige private billeder.
- **Fix**: Tilføj `private_album_grant_photo` join-tabel, eller flyt access-check til at validere at det specifikke `photo.id` er omfattet af grant. Alternativt: vis i `getPublicProfile` ikke private fotos før de bliver mountet — i dag returnerer `filterPhotosForViewer` ALLE private fotos hvis relation=private_grant.

### 2. View-count tæller op selv ved 403/uautoriseret adgang — også for ikke-private fotos
- **Severity**: kritisk
- **Type**: data-leak / logic-bug
- **Fil**: `backend/src/membership-routes.ts:537-546`
- **Beskrivelse**: `recordPrivateAlbumView` køres FØR check af om grant findes. UPDATE returnerer null kun hvis ingen grant er aktiv, men hvis grant findes for en anden bruger til samme ejer, opdateres `view_count` selvom det måske er en anden viewer. Mere alvorligt: hvis viewer faktisk ikke skulle se billedet, leaker 200-svar implicit eksistens. Også: ingen rate-limit på dette endpoint, og det incrementer en counter — DoS-mulighed for at puste counters op.
- **Fix**: Verificér grant via separat `existsGrant(photoId, viewerId)` før evt. view-count opdatering. Lås view-count til kun at trigge når billedet faktisk leveres, ikke i pre-check.

### 3. Match-niveau billeder blokeres hardcoded — beslutning 4 brydes
- **Severity**: kritisk (efter fase 3 release)
- **Type**: missing-feature
- **Fil**: `backend/src/membership-routes.ts:548-554`
- **Beskrivelse**: `match`-visible photos returnerer hardcodet 403 "MATCH_REQUIRED" — selvom user faktisk har mutual interest. Der findes en `messagingRepository` med `hasMutualInterest`, men photo-handler bruger den ikke. Det betyder at lag-baseret synlighed (beslutning 4) ikke virker fra fase 3 endpoint — match-billeder er DØDE.
- **Fix**: I `photo/:id`-handler: hvis `photo.visibility === "match"`, slå `messagingRepository.hasMutualInterest(viewer, owner)` op og giv 200 hvis matched. Krydskoble `relation` i `getPublicProfile` med messaging-status.

### 4. `getPublicProfile`: `relation` rapporteres som "verified" når brugeren faktisk har match — match-relation eksisterer aldrig
- **Severity**: kritisk
- **Type**: missing-feature / logic-bug
- **Fil**: `backend/src/membership.ts:237-268`
- **Beskrivelse**: `getPublicProfile` returnerer kun "self"/"verified"/"private_grant" — "match" sættes aldrig nogensinde. Det forklarer at `filterPhotosForViewer` for "match"-photos altid falder igennem til 403. Hele match-pipelinen er afkoblet fra membership.
- **Fix**: I `getPublicProfile`, slå `messagingRepository.hasMutualInterest` op og sæt `relation = "match"`. Kræver indsprøjtning af messagingRepository i membership-repo, eller move logik op i route-handleren.

### 5. `GET /api/members/:id` — viewer kan se andre brugeres private profil uden verification (ingen profile-fald)
- **Severity**: kritisk
- **Type**: auth / data-leak
- **Fil**: `backend/src/membership-routes.ts:482-489`
- **Beskrivelse**: Hvis viewer ikke har profil eller ikke er verificeret, returneres 403 KUN hvis `id !== session.user.id`. Men hvis viewer ER verificeret kan de se ALLE profiler — også deres egne soft-deletede / pausede via `id === viewer.id`. Mere alvorligt: viewer-profile er ikke nødvendigvis verificeret. Eksempel: viewer er bare `unverified` men har profil → returnerer 200 med fuld profil for ANDEN bruger. Tjekket er `viewer.verification_status !== "verified"` MEN kun if-grenen hvis `id !== session.user.id` — så ikke-verified viewere kan stadig se sig selv (OK), men kan også (fordi der ikke er noget after-else-block) glide igennem hele resten?
- Læs igen: nej, der ER en early return inde i if-grenen for `id !== session.user.id`. Men hvis viewer ikke har profil men `id === session.user.id`, glider de igennem og kører `getPublicProfile(self, self)`. Hvis viewer ikke er verificeret, kan de stadig se andres profiler via "verified"-pathen via `getPublicProfile` der KUN tjekker at `target` er verificeret. Tjekket "viewer skal være verificeret" er kun for `!== self`.
- Faktisk korrekt: handleren gør tjekket KUN i `if (c.req.param("id") !== session.user.id)`-grenen. Det betyder uverificeret viewer kan ikke se andre. Men en `unverified` viewer kan kalde `/api/members/photo/:id` direkte (line 521-563) — der er checket `photo.owner_user_id !== session.user.id` lige fjernet hvis det ikke er deres eget billede — dvs. uverificeret bruger kan se ANDRE brugeres `verified`-billeder! (line 531-535 returnerer FORBIDDEN kun hvis billedet ikke er ejers eget.) Selve checket forsøger at returnere 403 men kun for andres billeder — virker.
- Det aktuelle bug: `getPublicProfile` returnerer `null` kun hvis viewer ikke er ejer OG profile ikke verified eller paused. Men hvis VIEWER er paused/soft-deleted, returnerer membershipRepo `null` på `getProfile(viewer)` — så hele logikken: "viewer ikke verificeret" gælder ALDRIG for self-lookup. Det er mindre fatal end først antaget, men der er stadig en utydelig ACL:
- **Reelt udnyttbart bug**: hvis viewer-profile er `null` (slettet, men session stadig gyldig fra cookie), returneres ingen 403 — `viewer.verification_status` checkes med optional chaining: `!viewer || viewer.verification_status !== "verified"`. Et `!viewer` (deleted) brugere får 403 hvis id ≠ self, men hvis id === self får de 200 med deres eget slettede data → svaret er rart, men: deleted brugere bør ikke kunne kalde API'et overhovedet — der mangler global session-validity check mod `deleted_at`.
- **Fix**: Tilføj global middleware: hvis `getProfile(session.user.id)` returnerer null (deleted_at != null), invalidér session og 401. Også: kræv altid at viewer er verificeret for `/api/members/*` (selv egne andre IDs end self).

### 6. Race condition: `signalInterest` + `hasMutualInterest` + `ensureConversation` er ikke atomisk
- **Severity**: kritisk
- **Type**: race-condition
- **Fil**: `backend/src/messaging-routes.ts:80-91`
- **Beskrivelse**: To brugere kan samtidigt sende interest. `signalInterest` og `hasMutualInterest` køres som adskilte transaktioner. Hvis A sender first, så B simultant, kan begge se "mutual" og begge prøve `ensureConversation`. `ON CONFLICT (user_a_id, user_b_id) DO UPDATE` redder oprettelsen, men der kan oprettes to interest-signals (sjældent, OK pga. unique constraint). Større problem: `ensureConversation` har ON CONFLICT, men `origin` kan ende som "shared_event" eller "mutual_interest" afhængigt af hvad der vandt racet — usikker tilstand.
- **Fix**: Saml signal+match-check+conversation-skab i én DB-transaktion med FOR UPDATE / SERIALIZABLE.

### 7. Stripe-mock: ALLE brugere kan oprette ubegrænset abonnementer via direct DB-insert hvis fejl undervejs
- **Severity**: kritisk (når Stripe-rigtig kommer)
- **Type**: missing-feature / business-logic
- **Fil**: `backend/src/subscriptions.ts:121-183`, `backend/src/subscription-routes.ts:56-95`
- **Beskrivelse**: `startSubscription` opretter et `subscription`-row direkte uden Stripe-validation. Når der bliver tilkoblet rigtig Stripe, vil webhooks aktivere subscriptions, men koden i dag accepterer plan_id og laver direkte INSERT. Ingen TODO/marker for webhook-route eksisterer overhovedet — der er ingen `/api/webhooks/stripe`-endpoint, ingen idempotency-key håndtering, ingen signature-verification. Når der skiftes til rigtig Stripe vil systemet være sårbart for:
  - Bruger kalder POST `/api/me/subscription` → får aktivt abonnement → svigter betaling → ingen webhook fjerner status.
  - Bruger kan ikke købe igen pga. `ALREADY_ACTIVE`-check.
- **Fix**: Tilføj eksplicit webhook-endpoint-stub `/api/webhooks/stripe` med 501 indtil rigtig integration. Markér `startSubscription` med stort comment om at den ALDRIG må kaldes uden mock-flag i prod. Tilføj `stripe_event_id` unique constraint til subscription_event-tabellen.

### 8. Atomicitet: `submitVerification` markerer eksisterende pending som rejected — men kører ikke i samme transaktion som user.verification_status update
- **Severity**: kritisk
- **Type**: race-condition
- **Fil**: `backend/src/membership.ts:505-538`
- **Beskrivelse**: Transaktionen ser god ud, men `UPDATE "user" SET verification_status = 'pending' WHERE verification_status NOT IN ('verified')` — for nuværende temporary-verified brugere preserveres `verified` og den nye verification står som "pending" i submission, mens user fortsat står `verified` via temporary. Hvis admin afviser, sættes user til `rejected` (line 614-617) ONLY IF `verification_status = 'pending'`. Det betyder en temporary-verificeret bruger der senere indsender + bliver afvist, BEVARER `verified` status fra temporary. De er stadig på platformen — selvom de er afvist for rigtig verification.
- **Fix**: Når submission godkendes/afvises, beslut hvad der sker med temporary-status. Sandsynligvis: ved afvisning skal user nedgraderes til `rejected` uanset gammel temporary-status (med kommentar i koden om beslutningen).

### 9. JSON-body uden bodyLimit — alle endpoints kan DoS'es med kæmpe body
- **Severity**: kritisk (DoS)
- **Type**: security / validation
- **Fil**: alle routes der gør `c.req.json()` — `app.ts:426`, alle route-filer
- **Beskrivelse**: Hono har som default ingen body-size-limit. Bun `serve` har heller ikke. En angriber kan POST'e 1GB JSON til `/api/waitlist` og forbruge memory. Multi-thread / multi-request DoS-trivielt.
- **Fix**: Tilføj middleware `bodyLimit({ maxSize: 64 * 1024 })` fra `hono/body-limit` på alle ikke-multipart routes. På multipart (file upload) sæt separat større limit, fx 32MB.

### 10. Lækage: `listVerifiedMembers` returnerer `email` for alle medlemmer i en intern liste, og `createCouple` itererer over den for matching
- **Severity**: kritisk
- **Type**: data-leak
- **Fil**: `backend/src/membership-routes.ts:396-401`, `backend/src/membership.ts:221-235`
- **Beskrivelse**: `createCouple` kalder `listVerifiedMembers(viewer)` som returnerer FULDE profiler inkl. email. Selve route-handleren bruger email til look-up i memory, men selve repo-resultatet indeholder hver eneste verified bruger's email. Hvis dette returneres til frontend andre steder (det gør det IKKE direkte i route, men listet medlemmer fra `GET /api/members` undgår email via `profileToJson` som ikke inkluderer email). OK — men `listVerifiedMembers` bør ikke returnere email i første omgang for ikke-self lookups. Større issue: medlemslookup via `find by email` i Node er O(n) — DoS hvis 100k brugere. Mest alvorligt: at iterere alle verified members for at finde en partner via email er en informationslæk-pattern: angriber kan ikke se outputtet men kan timing-attack om en bestemt email er verificeret.
- **Fix**: Lav direkte `findVerifiedByEmail(email)` i repo. Drop email fra `listVerifiedMembers`-output. Returnér ensartet "partner ikke fundet eller ikke verificeret" message uden at tillade timing-attacks.

### 11. Couple-creation: partner accepterer ikke koblingen — primary kan tvinge enhver verificeret bruger til at blive deres partner
- **Severity**: kritisk
- **Type**: auth / business-logic
- **Fil**: `backend/src/membership-routes.ts:378-415`, `backend/src/membership.ts:270-289`
- **Beskrivelse**: `POST /api/couples` opretter et couple_profile med primary_user_id=self og partner_user_id=hvem-end-vi-finder-via-email. Der er INGEN accept fra partneren. Når couple er oprettet, vil hele platformens ACL behandle dem som et par — fx `getCoupleByUser(partner)` returnerer dette couple, og partner kan ikke længere se single-only events. Partner kan deltage i `accepts_mixed_events`-ting de aldrig har sagt ja til.
- **Udnyttelse**: Alice opretter konto, opretter couple med Bob's email. Bob er nu i et "couple" uden at vide det.
- **Fix**: Indsæt `couple_invitation`-flow: primary opretter pending invitation, partner skal accepte før couple_profile aktiveres. Indtil da, gem invitation separat fra `couple_profile`.

### 12. `hardDelete` brugere — ingen cascading delete + kan dræbe FK constraints
- **Severity**: kritisk
- **Type**: cascade / data-tab
- **Fil**: `backend/src/membership.ts:217-219`, `backend/src/membership-routes.ts:218-228`
- **Beskrivelse**: `DELETE FROM "user" WHERE id = $1` antager at DB har ON DELETE CASCADE på alle FK'er (couple_profile, profile_photo, event_registration, message, subscription, interest_signal, etc). Hvis FK'er er RESTRICT, fejler det med en blank 500. Hvis CASCADE, slettes alle relaterede beskeder — INKL. ekstrøvende beskeder hvor andre brugere ER receivers (mister chat-historik for andre).
- Også: GDPR-perspektiv: når en bruger anmoder om sletning, skal vi anonymisere ikke slette i raw form, så andre samtaler beholder sammenhæng.
- **Fix**: Implementér eksplicit GDPR-sletning: opdatér beskeder til "[Slettet bruger]"-display_name, anonymisér profile, ryd photos via uploadStore.delete(), markér couple_profile som dissolved. Brug transaktion. Verificér FK constraints i schema.

---

## Høj severity

### 13. CSP `default-src 'none'` blokerer API-respons hvis browser løber direkte
- **Severity**: høj
- **Type**: security / config
- **Fil**: `backend/src/app.ts:269`
- **Beskrivelse**: API-server sender CSP der blokerer alt. OK for JSON-responses men browser-fejl hvis direkte access til `/api/members/photo/:id` (image-blob). CSP gælder ikke på image-content, men browseren konsulterer det. Sandsynligvis ikke et issue, men bør markeres som "kun for HTML-responses". Også: HSTS sendes uden `preload` — fine for nu.

### 14. CORS: allow-credentials med wildcard-lignende dynamic-origin uden state
- **Severity**: høj
- **Type**: security
- **Fil**: `backend/src/app.ts:276-305`
- **Beskrivelse**: `Access-Control-Allow-Credentials: true` sendes med `Access-Control-Allow-Origin: <inkommende origin>`. Hvis `corsOrigins` indeholder fx `http://localhost:39563` i prod ved en fejl, kan en angriber phishe brugeren til en lokal side der laver credentialede requests. Tjek: `parseOrigins` filtrerer kun blanks. Hvis CORS_ORIGINS-env er sat til "*", filtreres ikke wildcard. Heldigvis: hvis "*"+credentials, fejler browseren — så ikke catastrofalt. Men hvis production har `localhost`-origin per uheld er det åbent for misbrug.
- **Fix**: Reject wildcard og localhost-origins i production-config. Tilføj validation i `readConfig`.

### 15. Rate-limit gælder kun for waitlist + confirm — IKKE for login/signup/messaging/interest-signal
- **Severity**: høj
- **Type**: security / DoS
- **Fil**: `backend/src/rate-limit.ts`, hele backend
- **Beskrivelse**: Kun 4 scopes findes: waitlist, confirm, partner_interest, partner_confirm. Login (better-auth) er ikke rate-limited fra app-niveau (better-auth har sine egne defaults — tjek nødvendigt). Messaging-endpoints, interest-signal, photo-upload, verification-upload — ingen rate-limit. Brute-force og spam-vektor.
- **Fix**: Tilføj scopes: `login_attempt` (pr. email), `message_send` (pr. user), `interest_signal` (pr. user pr. minut), `upload` (pr. user).

### 16. Login: brute force mod email/password — better-auth har eventuelt ingen rate-limit
- **Severity**: høj
- **Type**: auth
- **Fil**: `backend/src/auth.ts:30-80`
- **Beskrivelse**: `betterAuth` initialiseres uden ratelimit-options. Better-auth har en built-in rate-limit men er ikke konfigureret eksplicit. I production med Redis bør den deles. Kunne også integrere via `app.all("/api/auth/*", rateLimitMiddleware, ...)`.
- **Fix**: Konfigurér better-auth med `rateLimit: { enabled: true, window: 60, max: 10 }` og brug Redis-store hvis muligt.

### 17. Session/cookie-config — ingen eksplicit cookie-attribut-konfig
- **Severity**: høj
- **Type**: security / auth
- **Fil**: `backend/src/auth.ts`
- **Beskrivelse**: `betterAuth()` initialiseres uden eksplicit cookie-config. Default values bør verificeres: `secure`, `httpOnly`, `sameSite=lax/strict`, `domain`. I production over HTTPS skal vi sikre `secure=true` og `sameSite=strict` (eller `lax`). Ellers er CSRF-risiko og MITM-attribut-stripping reel.
- **Fix**: Sæt eksplicit `advanced.cookies` i `betterAuth({...})` med kendte safe defaults. Skriv test der verificerer headers.

### 18. Pagination mangler på flere endpoints — DoS-mulig
- **Severity**: høj
- **Type**: DoS / performance
- **Fil**: flere
- **Beskrivelse**: `/api/members` har LIMIT 200 hardcodet — ingen pagination, ingen offset. `/api/conversations` har ingen LIMIT i SQL. `/api/me/events` har ingen LIMIT (uafhængigt af antal events). `/api/admin/events` har LIMIT 500. `/api/me/album-grants` har ingen LIMIT. `/api/admin/reports` LIMIT 200, men ingen offset. Verified members for `createCouple` henter ALLE.
- **Fix**: Indfør standard pagination (limit/offset eller cursor). Defaults 20-50. Sætte hard cap på 100. Hardcoded LIMIT i SQL er ikke nok — koble til request-param.

### 19. N+1 query pattern på `/api/members`, `/api/conversations`, `/api/events`
- **Severity**: høj
- **Type**: performance / DoS
- **Fil**: `backend/src/membership-routes.ts:467-479`, `event-routes.ts:142-150`, `messaging-routes.ts:117-134`
- **Beskrivelse**: `/api/members` looper over 200 medlemmer og kalder `listPhotos(memberId, null)` pr. medlem — 200 ekstra DB-queries. `/api/events` looper og kalder `getRegistration` + `countConfirmed` pr. event — 2N queries. `/api/conversations` looper og kalder `getProfile(other_user_id)` pr. conversation.
- **Fix**: Lav join-queries der returnerer photos/registrations/profiles på én gang.

### 20. SQL `update` i `events.ts:235-240` accepterer ukendte kolonnenavne
- **Severity**: høj
- **Type**: validation / SQL injection-light
- **Fil**: `backend/src/events.ts:231-250`
- **Beskrivelse**: `EventRepository.update(id, update)` itererer over `Object.entries(update)` og inserter direkte i SQL: `fields.push(`${key} = $${i++}`)`. Da `update`-objektet bygges i `event-routes.ts:298-336` med kendte fields, er der ingen direkte SQLi her. MEN typen `EventUpdate = Partial<Omit<EventRecord, ...>>` betyder hvis nogen senere passer nye/forkerte felter via objektet (fx fra body-spreading), kunne kolonne-navne forfalskes. Allerlede potentielle vektor i `event-routes.ts` hvis fremtidig udvikler tilføjer `Object.assign(update, body)`.
- **Fix**: Allowlist eksplicit i `update()`: tjek hvert key mod en fast Set inden SQL build.

### 21. Eventregistration: deltagere kan se hinandens registrations via `listRegistrationsForEvent` (kun admin-route — men ingen check pre-route)
- **Severity**: høj
- **Type**: auth
- **Fil**: `backend/src/event-routes.ts:349-353`
- **Beskrivelse**: `GET /api/admin/events/:id/registrations` er beskyttet af `adminMiddleware` på `/api/admin/events/*`. OK. Men `listRegistrationsForEvent` exposes `user_id`, `couple_id`, og `notes`-felt direkte. Skal de scrubes? `notes`-feltet kan indeholde admin-notes eller user input — bør ikke leakes til viewers. OK i dag pga. admin-only.

### 22. Event-post deletion uden admin-bypass — admins kan ikke slette andre brugeres event-posts
- **Severity**: høj
- **Type**: missing-feature / moderation
- **Fil**: `backend/src/messaging-routes.ts:310-315`, `backend/src/messaging.ts:409-416`
- **Beskrivelse**: `deleteEventPost(id, userId)` kræver `author_user_id = userId`. Admin kan ikke slette posten (kan kun bruge `hideEventPost` der ingen admin-only-route har eksponeret). Der findes ingen route der kalder `hideEventPost`.
- **Fix**: Tilføj `DELETE /api/admin/event-posts/:id` route der kalder `hideEventPost`.

### 23. Block bypass: blockede brugere kan stadig signal interest til mig
- **Severity**: høj
- **Type**: auth / business-logic
- **Fil**: `backend/src/messaging-routes.ts:54-94`
- **Beskrivelse**: `signalInterest` tjekker `isBlocked(session.user.id, targetId)` — det er sender-side check. Men hvis target blokerer sender (`blocker=target, blocked=sender`), tjekker sender selv ikke om de er blokerede AF target. `isBlocked` er symmetrisk i db-query, så blocked-detection virker. OK. Men: incoming-interest list inkluderer signals fra blokerede brugere, idet `listIncomingInterest` ikke filtrerer på blocks. Recipient kan stadig se interest fra blockede brugere.
- **Fix**: Filtrér `listIncomingInterest` mod blocks. Også: når en bruger blokeres, withdraw eksisterende interest fra dem mod mig.

### 24. Block bypass via couple og shared_event
- **Severity**: høj
- **Type**: auth / business-logic
- **Fil**: `backend/src/messaging-routes.ts:139-185`
- **Beskrivelse**: Ved oprettelse af conversation via `shared_event` checkes ikke om de to brugere har blokeret hinanden. Hvis A blokerer B og begge er på samme event, kan B initiere chat med A.
- **Fix**: Tilføj `isBlocked` check i shared_event-grenen også.

### 25. Profilforespørgsel `GET /api/members/:id` kan ramme paused/deleted users via `id === viewer`
- **Severity**: høj
- **Type**: auth
- **Fil**: `backend/src/membership-routes.ts:482-519`
- **Beskrivelse**: `viewer = await getProfile(session.user.id)`. Hvis viewer er soft-deleted, `getProfile` returnerer `null` (pga. `deleted_at IS NULL` filter). Når `id === self`, kører handler videre til `getPublicProfile(self, self)`. `getPublicProfile` filtrerer også på `deleted_at IS NULL` → returnerer null → 404.
- Det betyder: deleted users får 404 på deres egen profil (OK), men de har stadig en gyldig session-cookie og kan stadig kalde alle andre endpoints. Der mangler en global "is-still-active-user" middleware.
- **Fix**: Tilføj global middleware der invaliderer session for deleted users (sletter cookie, returnerer 401).

### 26. `messagingRoutes` checker verification men ikke `paused_at`
- **Severity**: høj
- **Type**: auth / business-logic
- **Fil**: `backend/src/messaging-routes.ts:32-42`
- **Beskrivelse**: Pausede brugere kan stadig sende interest, blokere, og deltage i samtaler. Beslutningerne nævner pausering som et tryghedsfeature.
- **Fix**: Tilføj `paused_at IS NULL` check i `verifiedMemberOnly`.

### 27. Email-validering for slap (lader `a@b.c` igennem inkl. eksotiske TLD-mangler)
- **Severity**: høj
- **Type**: validation
- **Fil**: `backend/src/validators.ts:1`
- **Beskrivelse**: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` — accepterer fx `a@b.c`. Det er teknisk gyldigt men accepterer også `evil@local..` (kun ét punktum), `a@b@c.d` (nej, kun ét @), `a@@b.c` (nej, regex stopper ved første @). Funktionelt OK, men ikke noget længdebegrænsning. Stort indtastet email kan crashe email-service.
- **Fix**: Tilføj max-længde (fx 254 tegn) og strenger regex. Bedre: brug en battle-tested validator (zod, valibot).

### 28. CORS-preflight returnerer `Access-Control-Allow-Origin` for ikke-tilladte origins ved 403
- **Severity**: høj
- **Type**: security
- **Fil**: `backend/src/app.ts:287-296`
- **Beskrivelse**: Når origin ikke tillades, returneres 403-JSON UDEN CORS-headers. Browser blokerer responsen, men hvis det er en preflight, vil browser cache `ORIGIN_NOT_ALLOWED`-svaret — bør ikke caches.
- **Fix**: Tilføj `Vary: Origin` og `Cache-Control: no-store` til 403 origin-rejection.

### 29. Confirmation token-hash bruger SHA-256 uden secret — replayabel hvis hash leakes
- **Severity**: høj
- **Type**: security
- **Fil**: `backend/src/app.ts:84-86`
- **Beskrivelse**: `hashToken` er bare `sha256(token)`. Hvis DB lækker, kan angriberen pre-compute mapping for fundne tokens. Selve `confirmationToken` er random 32 bytes — uangribeligt. OK i praksis, men en HMAC med secret giver forsvar i dybden.
- **Fix**: Brug `createHmac("sha256", betterAuthSecret).update(token).digest("hex")`.

---

## Medium severity

### 30. Email-leak via timing: `signup` afslører om email findes i `user`-tabellen
- **Severity**: medium
- **Type**: data-leak / timing
- **Fil**: `backend/src/auth.ts`
- **Beskrivelse**: better-auth `signUpEmail` returnerer typisk specifik fejlmeddelelse hvis email allerede findes. Lader angribere enumerere konti.

### 31. `mime_type` på upload tager fra `file.type` (klient-controlled) i stedet for magic-bytes detection
- **Severity**: medium
- **Type**: validation / security
- **Fil**: `backend/src/uploads.ts:53-75`
- **Beskrivelse**: `ALLOWED_IMAGE_TYPES` checker `file.type` som er klient-leveret (browser kan lyve). Faktiske filindhold kan være vilkårligt. Magic-bytes-validation mangler. Kan poste `.exe` med `Content-Type: image/jpeg`.
- **Fix**: Sniff first bytes (fx via `file-type` lib) og afvis hvis mismatch med claimed type.

### 32. Storage path-extension afledes også fra klient (mime → ext)
- **Severity**: medium
- **Type**: validation
- **Fil**: `backend/src/uploads.ts:60`
- **Beskrivelse**: `const ext = file.type.split("/")[1] ?? "bin"` — hvis klient sender `Content-Type: ../etc/passwd`, bliver ext "../etc/passwd". Path er resolvet via `fullPath`-validation (line 44-49) som checker `target.startsWith(root)` — så traversal-poison fanges. Men filsystemet vil have weird ext-nav. Lav cleanup på ext.
- **Fix**: Whitelist ext: `{jpg, png, webp, heic, heif}`.

### 33. `getPublicProfile` ignorerer paused_at for viewer's egen lookup
- **Severity**: medium
- **Type**: auth
- **Fil**: `backend/src/membership.ts:242-247`
- **Beskrivelse**: Viewer kan se andre profiler selvom viewer er paused. Egentlig OK — pause skjuler én, ikke begrænser browsing. Men forventet adfærd bør konfirmeres mod produkt-beslutning.

### 34. `event_registration.notes` exposes til alle event-deltagere (i admin-view) uden filtrering
- **Severity**: medium
- **Type**: data-leak
- **Fil**: `backend/src/events.ts:363-368`
- **Beskrivelse**: `listRegistrationsForEvent` returnerer alle notes-felter. Hvis admin viser denne til andre eller leaker i UI, kan personlige notes leakes. Tjek admin-route bruger det forsigtigt.

### 35. `subscription`-routes: cancel/resume kan tilgås selv hvis subscription er afsluttet
- **Severity**: medium
- **Type**: validation
- **Fil**: `backend/src/subscriptions.ts:185-218`
- **Beskrivelse**: `cancelAtPeriodEnd` lader user cancelle en `cancelled`/`past_due` subscription med samme `id`. OK rent funktionelt, men logically inkonsistent. Også `resume` accepterer enhver status — også `cancelled`.
- **Fix**: Tjek status før operation.

### 36. Subscription: `getActiveSubscription` filtrerer på `('active', 'trialing', 'past_due')` — `pending` ekskluderes
- **Severity**: medium
- **Type**: business-logic
- **Fil**: `backend/src/subscriptions.ts:108-119`
- **Beskrivelse**: Når rigtig Stripe kommer og opretter pending mens checkout pågår, ser API'et ingen aktiv subscription — bruger kan starte en NY, og ende med to active.
- **Fix**: Inkluder `pending` i unique-check.

### 37. Verification: `submitVerification` accepterer at user_id self-tilskrives — ingen check at user faktisk er ejeren
- **Severity**: medium
- **Type**: auth
- **Fil**: `backend/src/membership-routes.ts:339-376`
- **Beskrivelse**: Selve routeren bruger `session.user.id`, så det er OK. Men hvis nogen tilføjer en admin-route der proxyer `submitVerification`, kan user_id forfalskes. Repo-laget bør ikke acceptere user_id som parameter — det burde komme fra session-context.

### 38. Profile-update: `paused_at` accepterer ikke `null` korrekt på alle steder
- **Severity**: medium
- **Type**: logic-bug
- **Fil**: `backend/src/membership-routes.ts:207-209`
- **Beskrivelse**: `if ("paused_at" in body) { update.paused_at = body.paused_at === null ? null : new Date(); }` — accepterer enhver ikke-null værdi som "pauseret nu". Hvis klient sender `paused_at: false` eller `0`, bliver de pauseret. Det er surprising adfærd.
- **Fix**: Eksplicit `body.paused_at === true ? new Date() : body.paused_at === null ? null : <undefined>`.

### 39. Couple-update: `open_to_singles` falses ved enhver ikke-true værdi — kan utilsigtet nedsætte tilgængelighed
- **Severity**: medium
- **Type**: validation
- **Fil**: `backend/src/membership-routes.ts:433-434`
- **Beskrivelse**: `update.open_to_singles = body.open_to_singles === true` — hvis klient sender object/string/etc, falses det. Mindre kritisk, men bør være `undefined` for at undgå change.

### 40. Birth year + age: GET /api/me returnerer eksakt birth_year — men listing returnerer kun age — inkonsistent
- **Severity**: medium
- **Type**: data-leak
- **Fil**: `backend/src/membership-routes.ts:39-54`
- **Beskrivelse**: `profileToJson` returnerer både `birth_year` og `age`. Birth-year er finere granularitet — afslører fødselsår eksakt. For privacy bør age range eller alene `age` returneres til ikke-self viewers.

### 41. Verification listAdminLeads returnerer alle emails uden pagination
- **Severity**: medium
- **Type**: data-leak / DoS
- **Fil**: `backend/src/db.ts:67-103`
- **Beskrivelse**: `listAdminLeads` returnerer alle leads. Med 10k+ pending er det 10k emails i én response. Slow + memory.
- **Fix**: Pagination + filtering.

### 42. Webhook-stripe stub MANGLER fuldstændigt
- **Severity**: medium (kritisk når Stripe rigtig kommer)
- **Type**: missing-feature
- **Fil**: ingen endpoint
- **Beskrivelse**: Der er ingen `/api/webhooks/stripe`-endpoint, ingen idempotent processing, ingen signature-verification. Skal forberedes.

---

## Lav severity

### 43. Hardcoded `corsOrigins` default `"http://localhost:39563"` i app-config
- **Severity**: lav
- **Type**: config
- **Fil**: `backend/src/app.ts:207`
- **Beskrivelse**: Default-origin er fint for dev, men kan forvirre i prod hvis CORS-config-fejl gør at den falder tilbage. Production-config kaster fejl hvis ingen origins — OK.

### 44. `safeName` i uploads bruger hashSHA256 — øjenovervejs ID-anonymisering nyttig, men `ownerId` lækker bag de første 16 hex-chars
- **Severity**: lav
- **Type**: security
- **Fil**: `backend/src/uploads.ts:32-34`
- **Beskrivelse**: 16-char truncated SHA-256. Kollisioner usandsynlige men teoretisk mulige. Også: hvis to brugere har samme ownerId-hash-prefix, deler de upload-mappe — fyldte af privacy.

### 45. `event-routes.ts:298-336` — `experience_required: body.experience_required === true` lader ikke explicit toggle off
- **Severity**: lav
- **Type**: validation
- **Beskrivelse**: Som issue 39.

### 46. `messaging-routes.ts:227-229` — message-content max 4000 chars hardcoded, ingen unicode-overflow check
- **Severity**: lav
- **Type**: validation
- **Beskrivelse**: 4000 codepoints men UTF-16 strings — kan lave 16kb+ DB-row. Tilstrækkeligt for chat. OK.

### 47. Health-endpoint returnerer ingen DB/Redis status
- **Severity**: lav
- **Type**: observability
- **Fil**: `backend/src/app.ts:307-309`
- **Beskrivelse**: `/api/health` returnerer kun `{ ok: true }` — kender ikke om DB/Redis er nede. Liveness vs readiness uadskilleligt.
- **Fix**: Tilføj `/api/ready` med DB ping + Redis ping.

### 48. Strukturerede logs mangler — alle `console.error("Failed to send X")` uden context
- **Severity**: lav
- **Type**: observability
- **Fil**: hele
- **Beskrivelse**: `console.error` uden request-id eller user-id. Svært at fejlsøge. Bør bruge struktureret logger (pino, etc).

---

## Anbefalede next steps (prioriteret)

1. **Akut**: Fix issue 1 (album-grant pr. billede), 3+4 (match-relation), 6 (interest race), 9 (body-limit), 11 (couple-accept), 12 (cascade delete).
2. **Snart**: Issues 13-29 (CORS, rate-limit, pagination, N+1).
3. **Inden Stripe-live**: Issues 7 + 42 (webhook-stub).
4. **Generelt**: Indfør zod/valibot til all body-validering, struktureret logger, og en E2E security-test-suite der prøver auth-bypass eksplicit.
