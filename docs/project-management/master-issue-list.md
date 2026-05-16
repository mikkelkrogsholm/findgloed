# Glød — Master Issue List

**Konsolideret:** 5. maj 2026 (auditer kørt 16. maj-dato i terminal pga. systemur)
**Kilder:** 5 parallelle audits:
- `audit-backend-logic.md` (48 issues)
- `audit-copy-tone.md` (44 issues)
- `audit-design-beslutninger.md` (~22 gaps)
- `audit-ui-visual.md` (57 issues)
- `audit-user-journeys.md` (36 issues)

**Total rå:** ~207 issues. **Efter dedup:** ~165 unikke. Mange issues blev fundet af flere agenter (særligt "trygt"-overforbrug, manglende par-UI, code of conduct).

---

## Sammenfatning pr. severity

| Severity | Antal (efter dedup) | Beskrivelse |
|----------|---------------------|-------------|
| 🔴 Kritisk | 24 | Data-lækage, auth-bypass, broken core features, GDPR-brud, beslutning-brud |
| 🟠 Høj | 52 | Missing features, dårlig UX, sikkerhedshærdning, brand-konsistens |
| 🟡 Medium | 61 | Mindre bugs, inkonsistenser, polishing |
| 🟢 Lav | 28 | Stavefejl, kosmetik, nice-to-have |

---

## Sektion A — 🔴 Kritisk: skal fixes før reelle brugere kommer ind

### A1. Privat-album-grant er pr. ejer, ikke pr. billede → data-lækage
- **Severity:** Kritisk · **Kilde:** backend-logic #1, design-beslutninger 4.2
- **Hvor:** `backend/src/membership-routes.ts:521-563`, `membership.ts:470-485`
- **Bug:** Hvis Alice får adgang til ét privat billede af Bob, kan hun hente ALLE Bobs private billeder via direkte `/api/members/photo/:id` med gættede UUID'er. Beslutning 4 siger eksplicit "opt-in pr. visning".
- **Fix:** Tilføj `private_album_grant_photo` join-tabel, eller flyt access-check til at validere det specifikke `photo.id`.

### A2. Match-relation eksisterer aldrig — hele lag-2-synlighed er død
- **Severity:** Kritisk · **Kilde:** backend-logic #3+#4
- **Hvor:** `backend/src/membership.ts:237-268`, `membership-routes.ts:548-554`
- **Bug:** `getPublicProfile` returnerer aldrig `relation = "match"` selvom messagingRepository.hasMutualInterest findes. Match-fotos returnerer hardcodet 403. Beslutning 4 (lag-baseret synlighed) er bygget men virker ikke for matches.
- **Fix:** Inject messagingRepository i membership, sæt relation="match" når hasMutualInterest=true, fjern hardcoded 403.

### A3. Par-profil-UI eksisterer slet ikke → blokerer beslutning 3, 4, 8
- **Severity:** Kritisk · **Kilde:** user-journeys #9.1+9.2, design-beslutninger 3.1+8.1+K4
- **Hvor:** Ingen frontend-side. `api.createCouple`/`updateCouple` i `frontend/src/lib/api.ts:159-186` kaldes aldrig.
- **Konsekvens:** Par-only events, couple-medlemskaber, mixed events utilgængelige. `open_to_singles` og `accepts_mixed_events` kan ikke togges. Hele beslutning 8 (singles→par-policy) kan ikke testes.
- **Fix:** Tilføj par-sektion til `/profile` med: inviter partner via email + bekræft, display_name + bio + region, `open_to_singles` + `accepts_mixed_events` toggles, opløs-knap.

### A4. Couple-creation kræver ikke partner-accept → Alice kan tvinge Bob ind i et par
- **Severity:** Kritisk · **Kilde:** backend-logic #11
- **Hvor:** `backend/src/membership-routes.ts:378-415`
- **Bug:** Når Alice opretter par med Bobs email, sættes Bob automatisk som `partner_user_id` uden samtykke. Bobs ACL ændres — han mister single-only events, kommer i mixed-pool osv.
- **Fix:** Indfør `couple_invitation`-flow: primary opretter pending invitation, partner skal accepte før couple_profile aktiveres.

### A5. Code of conduct findes ikke som læsbar side → bryder konsensus-feature
- **Severity:** Kritisk · **Kilde:** design-beslutninger 7.1+K1
- **Hvor:** Ingen route. Eneste reference er `backend/src/seed-demo.ts:143` i en event-beskrivelse.
- **Konsekvens:** Debat-konsensus: "Code of conduct læsbar FØR tilmelding" — ikke opfyldt.
- **Fix:** Opret `/code-of-conduct`-rute (eller tre tabs: sanseligt-socialt / sensuelt / eksplicit), link fra signup-checkbox, event-detail, footer.

### A6. `GET /api/admin/verifications` returnerer 500 → admin kan ikke arbejde
- **Severity:** Kritisk · **Kilde:** user-journeys #12.1
- **Hvor:** `backend/src/membership.ts:548-557`
- **Bug:** SQL'en har ambigous `id`-kolonne (Postgres 42702) fordi `VERIFICATION_FIELDS` ikke prefixer med `v.` i JOIN-context.
- **Fix:** Prefix alle felter i `VERIFICATION_FIELDS` med `v.` eller skriv eksplicit SELECT.

### A7. Ghost-medlemmer i `/members` → 13 af 14 medlemmer er tomme kort
- **Severity:** Kritisk · **Kilde:** user-journeys #5.1+5.2
- **Hvor:** `backend/src/membership.ts:221-235` (`listVerifiedMembers`)
- **Bug:** Auth-hook (auth.ts:62-76) auto-verifierer alle nye signups til "temporary" — men de dukker op i `/members` FØR onboarding er gennemført. Tomme alias, ingen billeder, ingen bio. Ødelæggende første-indtryk.
- **Fix:** Tilføj `AND u.onboarded_at IS NOT NULL` til `listVerifiedMembers`. Også på `getPublicProfile`.

### A8. Ingen admin-UI til verifications eller reports → admin-flowet halv-bygget
- **Severity:** Kritisk · **Kilde:** user-journeys #12.2+12.3
- **Hvor:** Ingen pages i `frontend/src/pages/`. Endpoints findes (`/api/admin/verifications`, `/api/admin/reports`).
- **Konsekvens:** Når brugere rapporterer hinanden (issue #C12) forsvinder rapporten ud i tomrummet. Verifikations-loopet er brudt fra begge ender.
- **Fix:** Opret `/admin/verifications` (liste + billed-preview + approve/reject) og `/admin/reports` (liste + resolve-actions).

### A9. Ingen "Slet konto"-knap → GDPR-brud
- **Severity:** Kritisk · **Kilde:** user-journeys #11.1, design-beslutninger K2
- **Hvor:** `frontend/src/pages/profile-page.tsx:342-371`. `api.deleteMe(hard?)` findes men kaldes aldrig.
- **Fix:** Rød "Slet konto"-knap med to-trins bekræftelse + valg af soft (pause + skjul) vs hard delete.

### A10. `hardDelete` har ingen anonymisering → GDPR-brud + ødelagt historik
- **Severity:** Kritisk · **Kilde:** backend-logic #12
- **Hvor:** `backend/src/membership.ts:217-219`, `membership-routes.ts:218-228`
- **Bug:** `DELETE FROM "user"` cascade-sletter alle beskeder, fotos, registrations — også beskeder hvor ANDRE brugere er recipients. De mister chat-historik. GDPR kræver anonymisering, ikke raw-delete.
- **Fix:** Implementér: opdatér beskeder til "[Slettet bruger]"-display_name, anonymisér profile, ryd photos via uploadStore.delete(), markér couple_profile dissolved. Transaktion + FK-tjek.

### A11. Ingen body-limit på API → DoS med multi-GB JSON
- **Severity:** Kritisk · **Kilde:** backend-logic #9
- **Hvor:** Alle `c.req.json()`-calls. Hono + Bun har ingen default-limit.
- **Fix:** Tilføj `bodyLimit({ maxSize: 64 * 1024 })` (`hono/body-limit`) på alle non-multipart routes. 32MB på multipart.

### A12. Race condition: signal+match-check+ensureConversation er ikke atomisk
- **Severity:** Kritisk · **Kilde:** backend-logic #6
- **Hvor:** `backend/src/messaging-routes.ts:80-91`
- **Bug:** Hvis A og B sender interest samtidig kan begge se "mutual"; conversation kan ende med inkonsistent origin (mutual_interest vs shared_event).
- **Fix:** Saml signal + check + conversation-creation i én DB-transaktion med FOR UPDATE / SERIALIZABLE.

### A13. View-count tæller op selv ved 403 → counter-forgiftning + side-channel
- **Severity:** Kritisk · **Kilde:** backend-logic #2
- **Hvor:** `backend/src/membership-routes.ts:537-546`
- **Bug:** `recordPrivateAlbumView` kører FØR grant-check. Counter inflates fra uautoriserede requests, og 200-svar leaker eksistens.
- **Fix:** Verificér grant med `existsGrant(photoId, viewerId)` før view-count opdatering.

### A14. Cookie/session-config ikke eksplicit → CSRF + MITM-risiko
- **Severity:** Kritisk · **Kilde:** backend-logic #17
- **Hvor:** `backend/src/auth.ts:30-80`
- **Bug:** Better Auth initialiseres uden eksplicit `advanced.cookies`. Defaults bør verificeres (`secure`, `httpOnly`, `sameSite`, `domain`). I production over HTTPS er CSRF-risiko reel hvis `sameSite` ikke er låst.
- **Fix:** Sæt eksplicit cookie-config i `betterAuth({...})`. Skriv test der verificerer headers.

### A15. Vision lover MitID-verificering — det er pt. løgn
- **Severity:** Kritisk · **Kilde:** user-journeys #14.4, copy-tone implicit
- **Hvor:** `frontend/src/pages/vision-page.tsx:13-15` + `frontend/index.html` SEO meta
- **Bug:** Public copy lover MitID-verificering. Reelt er alle "temporary" verified. Hvis en journalist eller GDPR-myndighed læser dette og opretter konto, er det dokumenteret falsk marketing.
- **Fix:** Sløvere: "Vi verificerer alle medlemmer manuelt mens MitID er under integration."

### A16. Landing/vision/signup ligger i wellness-zonen → bryder beslutning 1
- **Severity:** Kritisk · **Kilde:** design-beslutninger 1.1+1.2+1.3, copy-tone #4+#5+#6+#7+#8+#9, ui-visual #3
- **Hvor:** `frontend/src/pages/landing-page.tsx:91-124`, `vision-page.tsx:16,76,110,152`, `signup-page.tsx:75`, `membership-page.tsx:115`, `partner-interest-modal.tsx:32`, `design-system.ts:72,85,101`
- **Bug:** "Trygt sted", "trygge rammer", "trygge overgange", "Glød trygt" gentages 8+ steder. Beslutning 9 siger eksplicit: "'Trygt' siges én gang i privatlivspolitikken og vises gennem features."
- **Fix:** Søg-erstat alle "trygt"/"tryghed"/"trygge rammer" undtagen privacy-page. Behold tryghed som det features signalerer (verificering, sexolog, code of conduct). Ny landing-H1 fx: "For voksne der vil mere end at swipe."

### A17. Ghost-protection mangler: deleted brugere kan stadig kalde API'et
- **Severity:** Kritisk · **Kilde:** backend-logic #5+#25
- **Hvor:** `backend/src/membership-routes.ts:482-519`
- **Bug:** Soft-deleted bruger med gyldig session-cookie kan stadig kalde alle endpoints; getProfile filtrerer dem væk men der er ingen global "is-active-user"-middleware.
- **Fix:** Tilføj global middleware: hvis `getProfile(session.user.id)` returnerer null, invalidér session og returnér 401.

### A18. Stripe-mock har ingen webhook-endpoint forberedt → kan ikke gå live sikkert
- **Severity:** Kritisk · **Kilde:** backend-logic #7+#42
- **Hvor:** Ingen `/api/webhooks/stripe`-route. `startSubscription` opretter direkte uden Stripe-validation.
- **Konsekvens:** Når rigtig Stripe aktiveres er flowet sårbart for "betaling fejler men subscription er aktiv" og kan ikke håndtere betalingshændelser. Ingen idempotency-key, ingen signature-verification.
- **Fix:** Tilføj webhook-stub `/api/webhooks/stripe` med 501. Tilføj `stripe_event_id` unique constraint. Markér `startSubscription` med advarsel.

### A19. Kontakt-email er `support@` → bryder konsensus om navngiven ansvarlig
- **Severity:** Kritisk · **Kilde:** design-beslutninger K3
- **Hvor:** `frontend/src/pages/privacy-page.tsx:87-101`, `frontend/index.html:47` (JSON-LD)
- **Bug:** Debatten kræver "Navngiven ansvarlig person — ikke 'support@'". Ikke opfyldt.
- **Fix:** Skift til `mikkel@findgloed.dk` (eller `carina@`) og tilføj navngiven dataansvarlig-sektion i privacy.

### A20. Klikbare kort har ingen tastatur-rolle/fokus-ring → A11y-brud
- **Severity:** Kritisk · **Kilde:** ui-visual #1
- **Hvor:** `events-page.tsx:151`, `members-page.tsx:96`, `messages-page.tsx:80`, `my-events-page.tsx:77`
- **Bug:** Hele `<Card>` har `onClick` + `cursor-pointer`, men ingen `role="button"`, `tabIndex={0}`, `onKeyDown` eller fokus-ring. Tastaturbrugere og screen readers kan ikke aktivere dem.
- **Fix:** Wrap indhold i `<a href>` (stretched-link mønster) — løser også højreklik/middle-click.

### A21. Verification-page lover ID-upload men intet UI findes
- **Severity:** Kritisk · **Kilde:** user-journeys #3.5
- **Hvor:** `frontend/src/pages/verification-page.tsx`
- **Bug:** Onboarding sidste skridt hedder "Næste: verificering". `POST /api/me/verification` (ID + selfie) findes i backend men ingen UI bruger det. Bruger får i stedet et samtykke-skærm — forventningsbrud.
- **Fix:** Enten skjul backend-endpointet (kommenter ud), eller tilføj en alternativ ID+selfie-flow med tydelig "midlertidig manuel verificering"-framing.

### A22. Skeleton-komponent eksisterer men bruges aldrig → layout-shift overalt
- **Severity:** Kritisk · **Kilde:** ui-visual #5
- **Hvor:** 12 indlogget-sider bruger `<p>Indlæser…</p>` plaintekst. `Skeleton`-komponent eksisterer kun i `design-page.tsx`.
- **Konsekvens:** Voldsom layout-shift når data lander; bryder Nordic Noir-ro.
- **Fix:** Lav skeleton-grids til members/events/messages der efterligner kort-strukturen.

### A23. Submit-verification + temporary-verification logic-conflict → bypassbar
- **Severity:** Kritisk · **Kilde:** backend-logic #8
- **Hvor:** `backend/src/membership.ts:505-538`
- **Bug:** En temporary-verificeret bruger der senere indsender ID + bliver afvist, BEVARER `verified` status fra temporary (afvisning sætter kun rejected hvis status='pending'). De forbliver på platformen efter afvisning.
- **Fix:** Ved afvisning nedgrader user til `rejected` uanset gammel temporary-status (med kommentar).

### A24. Listen viser email til alle medlemmer + timing-attack risiko ved par-creation
- **Severity:** Kritisk · **Kilde:** backend-logic #10
- **Hvor:** `backend/src/membership-routes.ts:396-401`, `membership.ts:221-235`
- **Bug:** `createCouple` itererer alle verified medlemmer via `listVerifiedMembers` (returnerer email for hver) og laver Node-side email-match. Timing-attack: angriber kan teste om specifik email er verificeret.
- **Fix:** Lav direkte `findVerifiedByEmail(email)` repo-metode. Drop email fra `listVerifiedMembers`-output. Returnér ensartede svar.

---

## Sektion B — 🟠 Høj: brand/UX skal fixes inden offentlig launch

### B1. Indkomne interesse-signaler vises ikke nogen steder
- **Severity:** Høj · **Kilde:** user-journeys #5.8
- `api.listInterests().incoming` bruges aldrig. Louise/gatekeeper-personaen kan ikke tage initiativ — hele gradueret tilladelse er halv-implementeret.
- **Fix:** Badge i header + sektion på `/profile` der viser incoming + reciprocate-knap.

### B2. Privat-album-grant UI mangler
- **Severity:** Høj · **Kilde:** user-journeys #5.10, design-beslutninger 4.1+4.2
- `grantPrivateAlbum`/`revokePrivateAlbum` findes men kaldes ingen steder. Beslutning 4 (lag-baseret nøgenhed) afhænger af det.
- **Fix:** Section på member-detail (når relation=match) med "Giv adgang til mit private album" + oversigt på `/profile` over hvem du har givet adgang.

### B3. Unblock-UI mangler
- **Severity:** Høj · **Kilde:** user-journeys #5.5
- Bloker virker, ingen UI til at se eller fjerne blokeringer. Hvis du blokker forkert er du fanget.
- **Fix:** Blocks-liste på `/profile` eller separat `/me/blocks`-side.

### B4. Rapport-flow bruger native `window.prompt`
- **Severity:** Høj · **Kilde:** user-journeys #5.6, ui-visual #6
- Native prompt bryder branding, kan ikke styles, dårlig mobile-UX, ingen kategorier (chikane/spam/falsk profil), kan ikke linke til besked/post.
- **Fix:** Dialog-modal med kategorier + fritekst + støtte for at angive besked-id.

### B5. Onboarding step 4 → verification navigation re-rendrer ikke konsekvent
- **Severity:** Høj · **Kilde:** build-log + user-journeys
- URL ændres men siden viser stadig trin 4-indhold indtil reload.
- **Fix:** Refactor til router-state baseret på `useSession` eller useState der reagerer på popstate.

### B6. Login redirecter altid til `/profile` — admin lander ikke på `/admin`
- **Severity:** Høj · **Kilde:** user-journeys #4.1
- `next=`-param mangler. Admin skal manuelt navigere.
- **Fix:** Hvis `role==='admin'` redirect til `/admin`. Ellers `/profile`. Tilføj `?next=`-support.

### B7. Login kicker siger "Kun for administratorer"
- **Severity:** Høj · **Kilde:** ui-visual #12, user-journeys #4.2, design-beslutninger O1
- Stale tekst fra fase 1. Forvirrer ikke-admin brugere.
- **Fix:** Skift kicker til "Log ind" + neutral intro.

### B8. `/admin/events` har ingen navigations-vej fra `/admin`
- **Severity:** Høj · **Kilde:** user-journeys #12.4
- Kun direkte URL fungerer. Admin-page (leads) har ingen knap til events.
- **Fix:** Sub-nav i admin: Leads · Events · Verifications · Reports.

### B9. Admin event-form: ingen redigering af eksisterende events
- **Severity:** Høj · **Kilde:** user-journeys #12.7
- Listen viser "Publicer"/"Slet" men ikke "Redigér". `PATCH /api/admin/events/:id` findes.
- **Fix:** Tilføj edit-form (genbrug create-formen med initial values).

### B10. Admin: ingen deltagerliste-UI
- **Severity:** Høj · **Kilde:** user-journeys #12.8
- `GET /api/admin/events/:id/registrations` findes uden frontend.

### B11. "Slet konto"-knap fra konsensus-features mangler — dækker A9
- Se A9.

### B12. Beslutning 2 (inviterer/bestemmer) nævnes ikke i marketing
- **Severity:** Høj · **Kilde:** design-beslutninger 2.1
- Datamodel + onboarding klart, men landing/vision skal sige højt at vi forstår dynamikken — det er konkurrencefordelen.
- **Fix:** Eksplicit sektion på vision (og evt. landing) der adresserer "den der inviterer" og "den der bestemmer tempoet" som ligeværdige.

### B13. Rate-limit dækker kun waitlist/confirm — login/messaging/upload åbne for brute-force
- **Severity:** Høj · **Kilde:** backend-logic #15+#16
- **Fix:** Scopes: `login_attempt`, `message_send`, `interest_signal`, `upload`. Plus konfigurer better-auth's egen rate-limit.

### B14. CORS-validation: skal afvise wildcard + localhost-origins i production
- **Severity:** Høj · **Kilde:** backend-logic #14
- **Fix:** Validation i `readConfig` der kaster fejl hvis prod-config har `*` eller `localhost`.

### B15. Pagination mangler på flere endpoints → DoS-risiko
- **Severity:** Høj · **Kilde:** backend-logic #18
- `/api/members` LIMIT 200 hardcoded, `/api/conversations` ingen LIMIT, `/api/me/events` ingen LIMIT, etc.
- **Fix:** Standard limit/offset (default 20-50, hard cap 100) bundet til request-param.

### B16. N+1 query pattern på `/api/members`, `/api/conversations`, `/api/events`
- **Severity:** Høj · **Kilde:** backend-logic #19
- 200 members = 200 ekstra photo-queries. Etc.
- **Fix:** Join-queries.

### B17. Event-post admin-moderation mangler
- **Severity:** Høj · **Kilde:** backend-logic #22
- `hideEventPost` repo-metode findes men ingen admin-route eksponerer den.
- **Fix:** `DELETE /api/admin/event-posts/:id`.

### B18. Block-bypass i incoming-interest og shared_event-conversation
- **Severity:** Høj · **Kilde:** backend-logic #23+#24
- Blokerede brugere kan stadig sende interest; shared_event-conversation tjekker ikke blocks.
- **Fix:** Filtrér `listIncomingInterest` mod blocks. Tilføj `isBlocked` check i shared_event-grenen.

### B19. Pausede brugere kan stadig sende interest/beskeder/blokere
- **Severity:** Høj · **Kilde:** backend-logic #26
- `messagingRoutes` tjekker verification men ikke `paused_at`.
- **Fix:** Tilføj `paused_at IS NULL` til `verifiedMemberOnly`-middleware.

### B20. Email-format valideres for slap (`a@b.c` accepteres uden længde-cap)
- **Severity:** Høj · **Kilde:** backend-logic #27

### B21. Mime-validering på upload bruger klient-leveret `file.type` → kan forfalskes
- **Severity:** Høj · **Kilde:** backend-logic #31
- **Fix:** Magic-bytes detection (fx `file-type` lib).

### B22. Confirmation token-hash uden HMAC-secret
- **Severity:** Høj · **Kilde:** backend-logic #29

### B23. Tom alt-tekst på `<img>` der bærer information
- **Severity:** Høj · **Kilde:** ui-visual #9
- Screen reader-brugere får ingen info om medlemsfotos.
- **Fix:** `alt={photo.kind === "face" ? display_name : "Stemningsbillede"}`.

### B24. Hardcodede `bg-black/40`-overlays → bryder token-systemet
- **Severity:** Høj · **Kilde:** ui-visual #10

### B25. 6 sider mangler kicker (PageHeader-mønster ikke konsistent)
- **Severity:** Høj · **Kilde:** ui-visual #11
- **Fix:** Definer `PageHeader`-komponent med kicker + title + intro. Brug overalt.

### B26. Footer mangler på alle sider
- **Severity:** Høj · **Kilde:** ui-visual #13
- Ingen vedvarende link til privacy, kontakt-email, vilkår, copyright fra members/events/messages.
- **Fix:** Minimal footer i SiteShell med © · privatliv · kontakt · code-of-conduct.

### B27. 7 knapper i flad række på profile bryder hierarki
- **Severity:** Høj · **Kilde:** ui-visual #14
- **Fix:** Gruppér i "Status" + "Genveje" + "Konto"-områder.

### B28. Pris-input i admin er "Pris (øre)" → forvirrende
- **Severity:** Høj · **Kilde:** ui-visual #15
- **Fix:** Lav til kr.-input med 2 decimaler, konvertér til cents on submit.

### B29. Onboarding rolle/face-kort har ingen fokus-ring
- **Severity:** Høj · **Kilde:** ui-visual #16

### B30. Conversation-page polling 8s — ingen optimistic UI
- **Severity:** Høj · **Kilde:** ui-visual #18
- Egen besked springer ind 0-8s efter modtagelse.
- **Fix:** Append egen besked straks. SSE/WebSocket på sigt.

### B31. Conversation `100dvh - 12rem` bryder iOS Safari pga. URL-bar
- **Severity:** Høj · **Kilde:** ui-visual #19
- **Fix:** Lås composer i bunden med `position:sticky` + `safe-area-inset-bottom`.

### B32. Partner-pill (DKSA) skjules for medlemmer → mister legitimerings-anker
- **Severity:** Høj · **Kilde:** ui-visual #21
- Beslutning 1 siger DKSA er ankeret. Skjult for indloggede.
- **Fix:** Behold synlig — i footer.

### B33. Photo-grid uden lightbox/zoom
- **Severity:** Høj · **Kilde:** ui-visual #22
- **Fix:** Klik = Dialog-modal med stort billede + swipe.

### B34. "Vis interesse"/"Interesse sendt — fjern" på samme knap er forvirrende
- **Severity:** Høj · **Kilde:** ui-visual #23
- **Fix:** Status som badge + separat "Træk tilbage"-link.

### B35. Photo-upload-kategorier mangler hjælpe-eksempler
- **Severity:** Høj · **Kilde:** ui-visual #24

### B36. Engelsk i dansk flow ("early access", "invites", "updates", "Mixed events OK")
- **Severity:** Høj · **Kilde:** copy-tone #11+#12+#32

### B37. "Stripe ikke aktiveret"-disclaimer eksponerer env-var-navne til bruger
- **Severity:** Høj · **Kilde:** copy-tone #26, ui-visual implicit
- `STRIPE_SECRET_KEY` synligt i UI.
- **Fix:** Skjul helt. Hvis det skal vises: "Betaling er endnu ikke aktiveret — denne version registrerer kun din intention."

### B38. Tekniske statusser eksponeret som badges ("active", "confirmed", "trialing", "past_due")
- **Severity:** Høj · **Kilde:** copy-tone #23+#24+#25, ui-visual implicit
- **Fix:** `LABEL`-mapping for alle status-værdier (genbrug eksisterende `LEVEL_LABEL`-mønster). "Aktiv", "Tilmeldt", "Prøveperiode", "Mislykket betaling", "Kladde", "Publiceret".

### B39. Inkonsistent eventterminologi: "events" / "begivenheder" / "aktiviteter"
- **Severity:** Høj · **Kilde:** copy-tone #20+#21+#22
- **Fix:** Vælg ét. Forslag: "events" (eller "aftener" for voksen sensualitet) — opdatér også JSON-LD og Open Graph.

### B40. Spots_left hardcoded til 0 i `/api/me/events`
- **Severity:** Høj · **Kilde:** user-journeys #7.4
- Brugeren ser altid 0/X pladser på sine egne tilmeldinger.
- **Fix:** Kald `countConfirmed(event.id)` i loop.

### B41. Adresse vises stadig efter cancel/re-register
- **Severity:** Høj · **Kilde:** user-journeys #7.5
- `is_registered` hardcodes til `true` i `/me/events` selv for cancelled.
- **Fix:** Filtrér adresse-felt baseret på status (kun confirmed/attended).

### B42. Event-thread: ingen "skriv direkte" til deltager
- **Severity:** Høj · **Kilde:** design-beslutninger 8.2
- Backend understøtter `startConversation(userId, eventSlug)` for shared_event. Ingen UI.
- **Fix:** "Skriv direkte"-knap per event-post-forfatter.

### B43. CSP `default-src 'none'` kan blokere image-direkte-access via browser
- **Severity:** Høj · **Kilde:** backend-logic #13
- **Fix:** Differentiér CSP for HTML vs API-responses.

### B44. Email-leak: signup afslører om email findes
- **Severity:** Høj · **Kilde:** backend-logic #30

### B45. Photo-visibility kan ikke skiftes efter upload
- **Severity:** Høj · **Kilde:** user-journeys #11.5
- Skal slettes + uploades igen for at flytte mellem verified/match/private.

### B46. "Handelsbetingelser" findes ikke som dokument
- **Severity:** Høj · **Kilde:** user-journeys #1.2
- Checkbox kræver accept men kun privatliv har route.
- **Fix:** `/terms`-route + side.

### B47. Logo i header navigerer til landing også for logget-ind brugere
- **Severity:** Høj · **Kilde:** user-journeys #14.5
- **Fix:** For authenticated: logo → `/profile` eller `/events`.

### B48. Lag-baseret synlighed UI — match-relation viser ikke face-photos selv ved match
- **Severity:** Høj · **Kilde:** design-beslutninger 4.1+4.2+4.3
- (Dækker delvist A2.) View-count incrementeres ved billed-fetch i stedet for eksplicit "vis privat album"-klik.
- **Fix:** Skjul private fotos bag eksplicit knap; lav separat `/api/members/:id/private-album/view` route der counter en gang pr. session.

### B49. Vision-page mangler signup-CTA — sender kun til waitlist
- **Severity:** Høj · **Kilde:** user-journeys #1.4 + #1.3
- Parallelle funnels (waitlist + signup) uden klar prioritering.
- **Fix:** Vælg ét primært. Tilføj "Bliv medlem nu" CTA på vision.

### B50. Headings: landing springer `<h1>` over → SEO + screen reader skadet
- **Severity:** Høj · **Kilde:** ui-visual #4

### B51. Native confirm/prompt på destruktive flows
- **Severity:** Høj · **Kilde:** ui-visual #6
- Dækker mere end blot rapport (B4). Også cancel-subscription, slet-event.
- **Fix:** Dialog-komponent overalt.

### B52. Klikbare kort animerer `scale` direkte → bypasser `prefers-reduced-motion`
- **Severity:** Høj · **Kilde:** ui-visual #7

---

## Sektion C — 🟡 Medium: skal fixes inden 1.0

### C1-C61. (61 medium-issues — kondenseret her)

**Auth & state:**
- C1. Allerede-logget-ind bruger kan tilgå `/signup`/`/login` (user-journeys #3.1+#4.4)
- C2. `/onboarding` redirecter ikke færdig-onboarded brugere (user-journeys #3.2)
- C3. Frontend admin-routes ikke beskyttet (backend returnerer 403 men UI viser fejl) (user-journeys #12.5)
- C4. Member-detail/event-detail/conversation læser pathname direkte → stale data ved cross-nav (user-journeys #14.2)

**Profile & data:**
- C5. `display_name` kan slettes på profile-side (user-journeys #11.3)
- C6. Profile-page mangler couple-section (dækket af A3)
- C7. Profile photo-position styres ikke fra UI — ingen drag-and-drop reorder (user-journeys #11.4, ui-visual #45)
- C8. Pause-knap mangler forklaring af konsekvenser (user-journeys #11.2)
- C9. Sletning af konto sletter ikke partner-kobling automatisk (user-journeys #14.6)
- C10. Birth-year eksponeres til ikke-self viewers (kun age burde returneres) (backend-logic #40)

**Messaging:**
- C11. Auto-åbnet samtale fanges ikke i samtaleliste før reload (user-journeys #6.1)
- C12. Ingen email-notifikation ved gensidig interesse eller ny besked (user-journeys #6.2, build-log)
- C13. Withdraw interest viser bekræftelses-besked men ingen permanent cleanup (user-journeys #5.9)
- C14. Foretrukken knap "Til beskeder" navigerer til tom liste hvis ingen samtale findes (user-journeys #5.7)

**Events:**
- C15. Event-thread polling mangler (kun samtale poller) (user-journeys #7.1)
- C16. Event `ends_at` valideres ikke mod `starts_at` (user-journeys #7.2, ui-visual #15)
- C17. My-events viser ikke past/upcoming separation (user-journeys #7.3)
- C18. Events ud over "upcoming" kan ikke vises i en arkiv-vue (user-journeys #7.7)

**Verification & onboarding:**
- C19. UX-feedback ved upload-fejl er generisk ("Kunne ikke uploade") — skelner ikke størrelse/mime (user-journeys #3.4)
- C20. Verification-page redirecter ikke videre efter accept (user-journeys #3.6)
- C21. "Trin 4 af 4 — Næste: verificering" mismatch — bruger forventer ID-upload men får samtykke (user-journeys #3.7)
- C22. Verification-page UI gentager ens-stylede paneler (ui-visual #32)
- C23. Onboarding step-indikator er tekst-kicker, ikke visuel progress (ui-visual #33)

**Subscriptions:**
- C24. Plans-listen afhænger af couple-existence — couple-plans ureachable indtil A3 (user-journeys #10.3)
- C25. Cancel/Resume kan tilgås på allerede afsluttet subscription (backend-logic #35)
- C26. `getActiveSubscription` filter ekskluderer `pending` → kan ende med to active (backend-logic #36)
- C27. Trial-perioder håndteres ikke specielt ved cancel (user-journeys #10.7)
- C28. Cancel mangler bekræftelses-vindue / fortryd (user-journeys #10.2)
- C29. Ingen historisk faktura-liste / kvitteringer (user-journeys #10.6)

**Admin UX:**
- C30. Admin event-form viser ikke deltager-tæller / kapacitets-status (følger B10)
- C31. Admin lead-page søger client-side — skalerer ikke (ui-visual #46)
- C32. Admin-page bruger ældre uden-motion design (user-journeys #12.9)

**Tone & branding:**
- C33. Eventterminologi-konflikt (B39) — dækket
- C34. "Trygge overgange"/"trygge rammer" massivt (A16) — dækket
- C35. Vision-pill "Diskretion, samtykke og respekt" er mantra-listy (design-beslutninger 9.2, copy-tone #16)
- C36. "Skab fællesskab... ikke et kødmarked" for hårdt på brand (copy-tone #17)
- C37. "Mod swipe-kultur" / "med mere dybde" er Tinder-konkurrent-sprog (copy-tone #15)
- C38. Onboarding "adressere respektfuldt" er management-sprog (copy-tone #19)
- C39. Seed-event copy: "indre rejse"-vibe ("redskaber", "tilstedeværelse") (copy-tone #13)
- C40. Seed-event facilitator "Sexolog & terapeut" (copy-tone #2)
- C41. Seed-event "sex-positive rum" trækker mod swinger (copy-tone #3)
- C42. Bio-placeholder "som ikke som en annonce" er belærende (copy-tone #36)
- C43. Profile-side billed-synligheds-forklaring for teknisk (copy-tone #34)

**Tom-states:**
- C44. "0 medlemmer" / "0 events" / "0 tilmeldinger" mangler tilbage-CTA (ui-visual #27+#28+#29)
- C45. Auto-confirm-pages mangler kicker/branding (ui-visual #30)
- C46. NotFoundPage minimal, "miljo"-typo (ui-visual #31, copy-tone #37)

**A11y & polish:**
- C47. Form fejlbeskeder vises som bunden-Alert, ikke pr. felt (ui-visual #34)
- C48. Login mangler `autoComplete="email"`/`current-password` (ui-visual #35)
- C49. Disabled state på Button kun via `opacity-60` → kontrast under 4.5:1 (ui-visual #36)
- C50. `glow-cta` brugt på destruktive knapper (ui-visual #37)
- C51. Profile photo-grid på mobil 167x160 overlay-konflikt (ui-visual #38)
- C52. Membership-features liste mangler hierarki (ui-visual #39)
- C53. EyeOff-toggle fokus-ring tegnes ud i input (ui-visual #40)
- C54. Tekst-størrelser inkonsistente `0.65rem` vs `0.66rem` vs `text-xs` (ui-visual #42)
- C55. Form-felter mangler visuel "required"-markering (ui-visual #43)
- C56. Eksplicit-niveau-mærkning farve-kodes ikke (ui-visual #44)
- C57. Drag-and-drop upload mangler (ui-visual #45)
- C58. Send-knap i conversation 40x40 → under WCAG 44x44 (ui-visual #47)

**Sikkerhed & validation:**
- C59. Storage path-extension fra klient (uploads.ts #32) — fanges via path-check men weird filer
- C60. Subscription accepterer "false" som "pause" (backend-logic #38)
- C61. SQL update accepterer ukendte kolonnenavne (backend-logic #20)

**Andre:**
- C62. Couple-update: `open_to_singles` falsifiseres ved enhver ikke-true værdi (backend-logic #39)
- C63. Verification: `submitVerification` accepterer user_id som parameter — bør komme fra session (backend-logic #37)
- C64. `getPublicProfile` ignorerer `paused_at` for self-lookup (backend-logic #33)
- C65. CORS-preflight returnerer cached 403 for ikke-tilladte origins (backend-logic #28)
- C66. Event_registration.notes leakes til admin uden filter (backend-logic #34)

---

## Sektion D — 🟢 Lav: nice-to-have / polish

- D1. Stagger-animation gentages på alle indlogget sider (ui-visual #48)
- D2. PWA-update-prompt mount ikke verificeret (ui-visual #49)
- D3. "Næste: verificering" knap-tekst er for konkret (ui-visual #50)
- D4. Badges "Den der inviterer/bestemmer" wraps grimt på 375px (ui-visual #51)
- D5. Indlæser…-tekst inkonsistent ("Henter…" / "Henter events…") (ui-visual #53)
- D6. Vision-side differentierer sig ikke fra landing (ui-visual #54)
- D7. `font-display` vs `noxus-title` blandet (ui-visual #56)
- D8. Event-detail meta-grid kunne bruge kicker/tekst-mønster (ui-visual #57)
- D9. Bindestreg → tankestreg (3 steder) (copy-tone #39+#40)
- D10. "Anonymt alias" / "Anonym" inkonsistens (copy-tone #31)
- D11. "miljo" stavefejl i not-found-page (copy-tone #37)
- D12. "en åben sind" grammatik (copy-tone #38)
- D13. "Skriver endnu ikke noget" grammatik (copy-tone #44)
- D14. Ellipsis `...` vs `…` overalt (copy-tone #27+#28+#29+#30)
- D15. Onboarding placeholder komma-konvention (copy-tone #42)
- D16. Admin-slug-eksempel "aabent-nakkeparti-aften" (copy-tone #43)
- D17. "balanced"-rolle vises ikke som badge på profil (design-beslutninger 2.2)
- D18. Dresscode pr. event vs pr. niveau (design-beslutninger 7.2)
- D19. Members listing dobbelt-filter front/back (design-beslutninger 4.4+6.1)
- D20. Hardcoded corsOrigins default (backend-logic #43)
- D21. `safeName` 16-char hash kan kollidere (backend-logic #44)
- D22. Message-content max 4000 chars uden unicode-check (backend-logic #46)
- D23. Health-endpoint mangler DB/Redis status (backend-logic #47)
- D24. Strukturerede logs mangler (backend-logic #48)
- D25. Partner-modal/waitlist-confirm/partner-confirm mangler succes-CTA (user-journeys #2.1+#2.2)
- D26. Waitlist-confirm "Til forsiden"-knap er ikke logisk for nye besøgende (user-journeys #1.6+#1.7)
- D27. Waitlist-bekræftelsesmail no-op i dev (RESEND_API_KEY tom) (user-journeys #1.1+#2.3)
- D28. Header-pill "Du er midlertidigt verificeret" layout-shift ved load (user-journeys #14.3)

---

## Sektion E — Tematiske grupper (forslag til arbejds-pakker)

Når flere issues hænger sammen, er det smartere at fixe dem som én indsats.

### Pakke 1: "Make verification real" (kritisk)
- A6 (admin verifications 500)
- A7 (ghost members)
- A8 (admin verifications + reports UI)
- A21 (verification page)
- A23 (rejection logic)

### Pakke 2: "Couple as first-class citizen" (kritisk)
- A3 (par-profil UI)
- A4 (couple-accept flow)
- C24 (couple-plans)
- C6 (couple-section på profile)

### Pakke 3: "Lag 2 (match) skal virke"
- A2 (match-relation)
- B48 (UI til private album)
- B2 (private-album grant management)
- B1 (incoming interest UI)

### Pakke 4: "Brand-rens" (matcher beslutning 1+9)
- A16 (trygt-mantra overalt)
- A15 (MitID over-claim)
- B12 (beslutning 2 i marketing)
- C33-C43 (alle tone-issues)

### Pakke 5: "GDPR + dataansvar"
- A9 (slet konto-knap)
- A10 (anonymisering ved hard-delete)
- A19 (navngiven kontakt)
- A17 (deleted-user-session)
- C9 (partner-kobling ved sletning)

### Pakke 6: "Code of conduct + terms" (konsensus-features)
- A5 (code of conduct side)
- B46 (handelsbetingelser side)
- A19 (navngiven dataansvarlig)

### Pakke 7: "Auth & rate-limiting"
- A14 (cookie/session-config)
- A18 (Stripe webhook stub)
- B13 (rate-limit på messaging/login/upload)
- B14 (CORS production-validation)
- B20-B22 (validation + HMAC + magic-bytes)

### Pakke 8: "Skeleton + a11y"
- A20 (klikbare kort tastatur)
- A22 (skeleton states)
- B23 (alt-tekst)
- B25 (PageHeader-komponent)
- B26 (footer)
- B29 (onboarding kort fokus)
- B30 (optimistic UI conversation)
- C47-C58 (a11y polish)

### Pakke 9: "Admin UX"
- A6, A8 (verifications + reports — dækket af Pakke 1)
- B8 (admin sub-nav)
- B9 (admin event-edit)
- B10 (deltagerliste-UI)
- B17 (admin event-post moderation)
- C30-C32

### Pakke 10: "Stripe live-readiness"
- A18 (webhook-stub)
- B37 (skjul env-var-noter)
- C25-C29 (cancel/resume/pending/trial polish)

### Pakke 11: "DB- og query-optimering"
- A11 (body limits)
- A12 (race conditions)
- A13 (view-count rækkefølge)
- A24 (findByEmail i stedet for liste)
- B15 (pagination)
- B16 (N+1 queries)

---

## Næste skridt

Forslag i prioritetsorden:

1. **Pakke 1 (verification)** — admin kan ikke arbejde uden, og ghost-medlemmer ødelægger første-indtryk
2. **Pakke 4 (brand-rens)** — hurtige tekstrettelser med massiv effekt
3. **Pakke 2 (par)** — låser op for tre beslutninger og hele couple-flow
4. **Pakke 5 (GDPR)** — juridisk eksponering
5. **Pakke 6 (code of conduct + terms)** — konsensus-features
6. **Pakke 3 (lag 2)** — beslutning 4 fuldfærdig
7. **Pakke 8 (skeleton + a11y)** — synlig polish
8. **Pakke 7 (auth)** — sikkerhedshærdning før prod
9. **Pakke 9 (admin UX)**
10. **Pakke 11 (DB-optimering)**
11. **Pakke 10 (Stripe)**

---

*For fuld detalje om hver issue, se de respektive audit-rapporter:*
*`audit-backend-logic.md`, `audit-copy-tone.md`, `audit-design-beslutninger.md`, `audit-ui-visual.md`, `audit-user-journeys.md`*
