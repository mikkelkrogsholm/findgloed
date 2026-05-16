# Audit: Glød — Designbeslutninger vs. implementering

**Dato:** 2026-05-16
**Auditeret af:** Claude (automatiseret kode-audit)
**Reference:** `docs/project-management/glod-design-beslutninger.md`

Auditen krydstjekker hver af de 9 låste beslutninger samt konsensus-features
mod den faktiske kode i `backend/src/`, `backend/migrations/`,
`frontend/src/` og `frontend/index.html`. Severity-skala:
**kritisk** (beslutning brudt), **høj** (delvist implementeret),
**medium** (mangler edge case), **lav** (kosmetisk).

---

## Beslutning 1 — Tone-spektrum: Voksen sensualitet

Beslutningen kræver "hotelbar i halvmørke", voksent og direkte sprog
(lyst, begær, nærvær) — ikke wellness/yoga-retreat, ikke porno.

**Status:** Delvist implementeret. Event-copy (seed-demo) rammer tonen godt.
Landing + vision + signup + membership læner sig stadig kraftigt op ad
wellness/tryghedssprog.

### Gap 1.1 — Landing-hero bruger wellness/safe-container-sprog (kritisk)
- Beslutning: 1, 9
- Hvor: `frontend/src/pages/landing-page.tsx:90-124`
- Hvad mangler:
  - Kicker "Mød mennesker i virkeligheden først"
  - Hero-title: "Et trygt sted for nysgerrige voksne." — "trygt" som
    brand-mantra (forbudt i beslutning 9).
  - Pills: "MitID-verificeret adgang", "Event-first", "Klare rammer for
    samtykke og respekt". Ingen brug af det godkendte vokabular
    (lyst, begær, nærvær, intimitet, sanselighed).
- Foreslået fix: Skriv landing-hero om så den udstråler "hotelbar i
  halvmørke". Fx title "For voksne der vil mere end at swipe.";
  pills med "Voksne mennesker. Reelle aftener.", "Verificeret adgang"
  (uden mantra), "Ramme for nærvær og lyst".

### Gap 1.2 — Vision-page bruger "trygge rammer" som mantra (kritisk)
- Beslutning: 1, 9
- Hvor: `frontend/src/pages/vision-page.tsx:16,76,110,152`
- Hvad mangler:
  - FAQ-spørgsmål "Hvordan sikrer Glød tryghed?" — tryghed som hovedord.
  - Pills inkluderer "Diskretion, samtykke og respekt" — listy/wellness.
  - "trygge rammer" og "trygge overgange" gentaget.
- Foreslået fix: Lad "tryghed" fremgå af features (verificering,
  sexolog, code of conduct) men fjern det fra brand-niveau-overskrifter.
  Erstat med konkret invitation: "Vi forstår dynamikken mellem
  inviteren og tempo-sætter" (beslutning 2), "Voksne aftener faciliteret af sexologer".

### Gap 1.3 — Signup-side: "Glød trygt at være på" (høj)
- Beslutning: 1, 9
- Hvor: `frontend/src/pages/signup-page.tsx:75`
- Foreslået fix: Omformulér til "Verificering er manuel — det er en del af
  invitationen, ikke en barriere." eller lignende uden "trygt".

### Gap 1.4 — Membership-page: "filter der gør Glød trygt" (medium)
- Beslutning: 9
- Hvor: `frontend/src/pages/membership-page.tsx:115`
- Foreslået fix: "Medlemskab er det filter der holder Glød voksent."

### Gap 1.5 — Design-system bruger "tryghed" som kerne-mantra (høj)
- Beslutning: 9
- Hvor: `frontend/src/config/design-system.ts:72,85,101`
  - Kicker sample: "TRYGHED OG KLARHED FØRST"
  - Tone: "tryghed i fokus"
  - Princip: "fokus på tryghedssignaler"
- Foreslået fix: Skift sample-kicker til en godkendt brand-frase, fx
  "VOKSNE AFTENER, MED MENING" eller "INVITATIONEN HOLDER".
  Opdatér tone- og princip-tekst så "tryghed" ikke er brand-værdi.

---

## Beslutning 2 — Inviterende mand + bestemmende kvinde

**Status:** Godt implementeret i datamodel og onboarding. Mangler synlig
marketing/forklaring til ikke-medlemmer.

### OK
- `backend/migrations/005_membership.sql:11-12`: `initiator_role`-kolonne
  med 'inviting' / 'deciding' / 'balanced'.
- `frontend/src/pages/onboarding-page.tsx:18-39,203-228`: Spørger om
  rollen som første onboarding-trin med ligeværdig tone.
- `frontend/src/pages/profile-page.tsx:222-237`: Rollen kan ændres.
- `frontend/src/pages/member-detail-page.tsx:172-175`: Vises som badge på
  profilen ("Den der inviterer" / "Den der bestemmer tempoet").

### Gap 2.1 — Marketing/vision nævner ikke rollen som konkurrencefordel (høj)
- Beslutning: 2
- Hvor: `frontend/src/pages/vision-page.tsx`, `landing-page.tsx`
- Hvad mangler: Beslutningen siger eksplicit "Marketing siger højt at vi
  forstår dynamikken — det er en konkurrencefordel". Hverken landing
  eller vision nævner inviterer/bestemmer-dynamikken.
- Foreslået fix: Tilføj en eksplicit sektion på vision-siden (og evt.
  landing) der adresserer "den der inviterer" og "den der bestemmer
  tempoet" som ligeværdige roller.

### Gap 2.2 — "Balanced"-rolle vises ikke som badge (lav)
- Beslutning: 2
- Hvor: `frontend/src/pages/member-detail-page.tsx:172-175`
- Hvad mangler: Kun 'inviting' og 'deciding' viser badge; 'balanced'
  vises ikke. Det er fint hvis hensigten er at undgå rolle-tvang, men
  hvis enkeltpersoner aktivt vælger 'balanced' bør det fremgå.

---

## Beslutning 3 — Events: 3 kategorier med opt-in mixed

**Status:** Fuldt implementeret backend og frontend.

### OK
- `backend/migrations/006_events.sql:11-12`: `category` CHECK
  ('single_only','couple_only','mixed').
- `backend/migrations/005_membership.sql:38`: `accepts_mixed_events` på
  couple_profile, default false.
- `backend/src/event-routes.ts:135-140,186-194`: Listing og register
  filtrerer korrekt: par kan ikke se single_only; singles kan ikke
  registrere couple_only; par uden `accepts_mixed_events` filtreres fra
  mixed.
- `frontend/src/lib/event-display.ts:3-7`: UI-labels "Kun singles",
  "Kun par", "Singles og par".
- `frontend/src/pages/events-page.tsx:90-100,158`: Filter + tydelig
  badge på hver event-card.
- `frontend/src/pages/event-detail-page.tsx:111`: Badge i detalje-view.

### Gap 3.1 — Par-profil-UI mangler editor for `accepts_mixed_events` (kritisk)
- Beslutning: 3
- Hvor: Datamodellen findes (`couple_profile.accepts_mixed_events`) men
  der er ingen frontend-side til at oprette eller redigere par-profil.
  `frontend/src/lib/api.ts:159-186` har `createCouple`/`updateCouple` men
  ingen UI bruger dem.
- Hvad mangler: Side eller dialog hvor par kan oprette par-profil og
  toggle `accepts_mixed_events` (samt `open_to_singles` — se beslutning 8).
- Foreslået fix: Tilføj par-profil-sektion til profile-page.tsx eller
  en separat `/profile/couple`-rute med toggles + bio + display name.

---

## Beslutning 4 — Profilbilleder: lag-baseret med opt-in nøgenhed

**Status:** Backend honorerer fuldt; frontend mangler grant-management UI.

### OK
- `backend/migrations/005_membership.sql:55-57`: `kind` ('face','body','ambient','private'),
  `visibility` ('verified','match','private').
- `backend/migrations/005_membership.sql:78-105`: `private_album_grant`
  med `view_count` og `last_viewed_at`.
- `backend/src/membership-routes.ts:95-118`: `filterPhotosForViewer`
  håndterer lag-modellen korrekt (private kun ved grant, match kun ved
  match/grant, face skjules på verified hvis face_visibility=after_interest).
- `backend/src/membership-routes.ts:537-554`: Photo-routen blokerer
  match uden grant og inkrementerer view_count for private (linje 509).
- `backend/src/membership-routes.ts:256-258`: Backend gennemtvinger at
  `kind=private` kun kan have `visibility=private`.
- `frontend/src/pages/profile-page.tsx:307-338`: Tre upload-knapper
  (Stemningsbillede=ambient/verified, Ansigt=face/match,
  Privat album=private/private).

### Gap 4.1 — Ingen UI til at administrere private album grants (høj)
- Beslutning: 4
- Hvor: API'et findes (`grantPrivateAlbum`/`revokePrivateAlbum` i
  `frontend/src/lib/api.ts:190-198`), men ingen side bruger det.
- Hvad mangler: Liste i profile-page der viser hvem du har givet adgang
  til, hvor mange visninger de har lavet, og en revoke-knap.
- Foreslået fix: Card i profile-page der lister
  `api.listPrivateAlbumGrants()` (skal også eksponeres i api.ts) med
  recipient, granted_at, view_count, last_viewed_at og revoke-knap.

### Gap 4.2 — Ingen UI til at "vis privat album"-handlingen for modtageren (høj)
- Beslutning 4 kræver "modtageren aktivt klikker 'vis privat album' hver
  gang". I dag indrekker `member-detail-page.tsx:122-131` private fotos
  med det samme uden eksplicit klik per visning (selvom backend
  inkrementerer view_count ved hvert photo-fetch).
- Hvor: `frontend/src/pages/member-detail-page.tsx:122-131,152-160`
- Foreslået fix: Skjul private fotos bag en "Vis privat album"-knap der
  kræver klik per session (eller per fotograferet visning) før billederne
  vises. Vis en advarsel om at ejeren ser hver visning.

### Gap 4.3 — Backend tæller view_count for *photo-fetch*, ikke for "klik vis album" (medium)
- Beslutning: 4
- Hvor: `backend/src/membership-routes.ts:538-543`
- Hvad mangler: view_count bliver inkrementeret hver gang `<img>` lades —
  hvilket sker automatisk fra alle thumbnails i `member-detail-page.tsx`.
  Dette inflaterer view_count og forfalsker "ejer kan se aktiviteten".
- Foreslået fix: Lav en eksplicit `/api/members/:id/private-album/view`
  POST-rute der inkrementerer view_count én gang pr. session/klik;
  fjern increment fra photo-byte-routen.

### Gap 4.4 — `members`-listen viser alle photos uden filter (medium)
- Hvor: `backend/src/membership-routes.ts:472-475`
- Hvad mangler: I `/api/members` returneres `visiblePhotos` filtreret
  via `filterPhotosForViewer(...,"verified")` — det er korrekt. Men
  frontend bruger `member.photos.find(p => p.kind === "face" && member.can_see_face)`,
  dvs. dobbelt-tjek. Hvis backend filtrerede face væk, ville face-photo
  alligevel ikke være i listen. Fungerer, men kompleksiteten øger
  risikoen for fremtidige fejl.

---

## Beslutning 5 — Begynder-spor: filter, ikke identitet

**Status:** Filter-delen fuldt implementeret. FAQ/intro-guide kun
delvist.

### OK
- `backend/migrations/006_events.sql:15-16`: `beginner_friendly` +
  `experience_required`.
- `frontend/src/pages/events-page.tsx:118-132,160-161`: Filter "Også
  for første gang"/"Kræver erfaring" + badges på event-cards.
- `frontend/src/pages/event-detail-page.tsx:113-114`: Badges i detail-view.
- Ingen separat /begynder eller /erfarne-rute.

### Gap 5.1 — Ingen tilgængelig intro-guide eller FAQ "overalt" (medium)
- Beslutning: 5
- Hvor: Eneste FAQ er på `frontend/src/pages/vision-page.tsx:9-30`
  (ikke-medlems-side). Intet intro-guide-element vises på events,
  medlem-side, eller efter login.
- Foreslået fix: Tilføj kompakt "Sådan fungerer Glød (3 trin)"-tooltip
  eller bunden-bar på `/events` og `/members`, eller en
  vedvarende "?"-knap i SiteShell der åbner en dialog med FAQ. Vigtigt
  at den er tilgængelig overalt, ikke som en sektion man "tilhører".

---

## Beslutning 6 — Ansigt blandt verificerede: default kun-efter-interesse

**Status:** Fuldt implementeret.

### OK
- `backend/migrations/005_membership.sql:13-14`: `face_visibility` med
  default 'after_interest'.
- `backend/src/membership-routes.ts:111-114`: Backend filtrerer
  face-photos væk på verified-lag når owner har after_interest.
- `frontend/src/pages/onboarding-page.tsx:41-52`: Default-valg er
  after_interest, og kopien er tydelig om hvad valget betyder.
- `frontend/src/pages/profile-page.tsx:239-253`: Kan ændres senere.
- `frontend/src/pages/members-page.tsx:88-115`: Viser "Ansigt vises
  efter interesse"-badge.
- `frontend/src/pages/member-detail-page.tsx:177-178`: Tydelig badge i
  detail-view.

### Gap 6.1 — Tilbagefald: face-photos på members-listen tjekker både frontend og backend (lav)
- Beslutning: 6
- Hvor: Se Gap 4.4 — dobbelt filtering. Cosmetic.

---

## Beslutning 7 — Eksplicitets-mærkning: tre niveauer

**Status:** Niveau-mærkning fuldt implementeret. Code of conduct og
dresscode pr. niveau kun delvist.

### OK
- `backend/migrations/006_events.sql:13-14`: `level` med 3 niveauer.
- `frontend/src/lib/event-display.ts:9-13,15-19`: Labels og
  beskrivelser pr. niveau.
- `frontend/src/pages/events-page.tsx:106-117,159`: Filter + badge.
- `frontend/src/pages/event-detail-page.tsx:127-134`: Niveau-info-boks
  med beskrivelse vises tydeligt.
- `backend/migrations/006_events.sql:27`: `dresscode`-kolonne (pr.
  event, ikke pr. niveau).

### Gap 7.1 — Code of conduct findes ikke som læsbar side (kritisk)
- Beslutning: 7 + konsensus-features
- Hvor: Eneste reference til "code of conduct" er
  `backend/src/seed-demo.ts:143` i en event-beskrivelse. Der findes
  ingen rute, side eller komponent for CoC.
- Hvad mangler:
  - `/code-of-conduct` (eller per-niveau: `/code-of-conduct/sensual-social`,
    `/sensual`, `/explicit`).
  - Læsbar **før** signup/tilmelding.
  - Linkes fra signup-checkbox, fra event-detail, fra footer.
- Foreslået fix: Tilføj `CodeOfConductPage` med tre tabs (én pr. niveau),
  registrér ny rute i `frontend/src/config/app-config.ts` og
  `frontend/src/App.tsx`, link fra signup-page + event-detail-page +
  SiteShell-footer.

### Gap 7.2 — Dresscode er pr. event, ikke "koblet pr. niveau" (medium)
- Beslutning: 7
- Hvor: `backend/migrations/006_events.sql:27`
- Hvad mangler: Beslutningen siger "Code of conduct og dresscode kobles
  pr. niveau". I dag er dresscode et tekstfelt pr. event som admin
  skriver manuelt. Risikoen er at dresscode bliver inkonsistent på
  tværs af events med samme niveau.
- Foreslået fix: Tilføj default dresscode-tekst pr. niveau (i en
  konstant eller migrationsdrevet tabel), så admin kan vælge "Brug
  niveau-default" eller skrive sin egen.

---

## Beslutning 8 — Beskedmodel: gradueret tilladelse

**Status:** Fuldt implementeret backend. Ingen swipe/like/online-status/gamification.

### OK
- `backend/migrations/007_messaging.sql:9-24`: `interest_signal` med
  unik index over aktive signaler.
- `backend/src/messaging-routes.ts:70-78`: Singles → par kræver
  `open_to_singles=true`.
- `backend/src/messaging-routes.ts:82-91`: Conversation åbnes ved
  gensidigt interesse.
- `backend/src/messaging-routes.ts:155-176`: Same-event åbner chat
  (kræver at begge er `confirmed`/`attended`).
- `backend/src/membership-routes.ts:548-554`: Match-niveau photos
  blokeres uden mutual interest.
- `frontend/src/pages/member-detail-page.tsx:50-78`: Interesse-flow
  med "Vis interesse" → "Interesse sendt — fjern".
- `frontend/src/pages/messages-page.tsx:45-48`: UI-tekst:
  "Samtaler åbnes ved gensidig interesse eller når I begge deltager
  i samme event."
- Søgning bekræfter ingen swipe/like/online-status/gamification i
  frontend-/backend-source.

### Gap 8.1 — Ingen UI for par-profilens `open_to_singles`-toggle (kritisk)
- Beslutning: 8
- Hvor: API'et findes (`updateCouple` accepterer feltet i
  `backend/src/membership-routes.ts:433`), men ingen frontend-side
  redigerer par-profil. Singles → par-beskeder er derfor blokeret for
  alle par.
- Foreslået fix: Som Gap 3.1 — bygg par-profil-editor med toggle for
  `open_to_singles` og `accepts_mixed_events`.

### Gap 8.2 — `same-event-åbner-chat` har en hård UI-vej (medium)
- Beslutning: 8
- Hvor: `backend/src/messaging-routes.ts:152-184` — backend kræver
  `event_slug` for at åbne `shared_event`-conversation. Men ingen
  frontend-side har "send besked til deltager"-knap.
- Hvad mangler: I `event-detail-page.tsx` eller `event-thread.tsx`
  burde der være "Send privat besked"-knap ved hver poster når begge
  er tilmeldt.
- Foreslået fix: Lille knap "Skriv direkte" på hver deltager-post i
  event-thread, der kalder `POST /api/conversations` med `event_slug`.

### Gap 8.3 — Interest-signal mellem to par bruger user→user (medium)
- Beslutning: 8
- Hvor: `backend/src/messaging-routes.ts:54-94`
- Hvad mangler: Beslutningen siger "Par ↔ par åbner efter gensidigt
  interesse-signal", men interesse-signaler er per-user. Hvis Alice
  (i parret A) signalerer til Bob (i parret B), og Bob signalerer
  tilbage, åbner chatten mellem Alice ↔ Bob, ikke par ↔ par. Det er
  uklart om beslutningen kræver par-niveau-signaler.
- Foreslået fix: Afklar om par-til-par-flow skal aggregeres. Hvis ja:
  Tilføj `couple_id` på interest_signal eller en separat
  `couple_interest_signal`-tabel der åbner chat mellem par.

---

## Beslutning 9 — Sprog: drop wellness-markers fra brand

**Status:** Bandlysningsliste delvist overholdt. Ingen forekomster af
krydre/swinger/hardcore/kink/spice/heling/sårbar/indre rejse. Men "trygt
rum" og "tryghed" gentages som brand-mantra. "Tantra" og "Tantrisk"
findes kun i konkrete event-titler/beskrivelser (lovligt).

### Bandlyste ord — søgeresultat
- ✓ "krydre" / "spice": 0 forekomster
- ✓ "heling": 0 forekomster
- ✓ "swinger": 0 forekomster
- ✓ "hardcore": 0 forekomster
- ✓ "kink": 0 forekomster
- ✓ "sårbar": 0 forekomster (i brand-tekster)
- ✓ "frække par": 0 forekomster
- ✓ "indre rejse": 0 forekomster
- ❌ "trygt"/"tryghed"/"trygge rammer" som brand-mantra — flere steder
  (se Gap 1.1–1.5).
- ✓ "tantra/tantrisk": kun i event-copy (`backend/src/seed-demo.ts:117`:
  "ikke en tantrisk weekend"; ikke som brand). OK pr. beslutning 9.

### Gap 9.1 — "Trygt rum" / "trygge rammer" som brand-mantra (kritisk)
- Beslutning: 9
- Hvor:
  - `frontend/src/pages/landing-page.tsx:92` "Et trygt sted for nysgerrige voksne."
  - `frontend/src/pages/signup-page.tsx:75` "gør Glød trygt at være på"
  - `frontend/src/pages/membership-page.tsx:115` "gør Glød trygt"
  - `frontend/src/pages/vision-page.tsx:16,76,110,152`
  - `frontend/src/components/partner/partner-interest-modal.tsx:32`
    "Styrke trygge rammer"
  - `frontend/src/pages/design-page.tsx:102,113`
  - `frontend/src/config/design-system.ts:72,85,101`
- Foreslået fix: Bortset fra privatlivspolitik må "trygt" højst optræde
  én gang i hele brand-laget. Erstat med funktionelle udsagn der peger
  på verificering, sexolog, code of conduct.

### Gap 9.2 — Vision-pill "Diskretion, samtykke og respekt" er mantra-listy (lav)
- Beslutning: 9
- Hvor: `frontend/src/pages/vision-page.tsx:76`
- Foreslået fix: Behold "diskretion" og "samtykke" som features andre
  steder; brug mere konkret brand-sprog her (eks. "Aftener faciliteret
  af sexologer").

---

## Konsensus-features (sidste sektion i beslutningsdokumentet)

| Feature | Status | Hvor / hvad mangler |
|---|---|---|
| Lag-baseret synlighed (offentlig → match → privat) | OK | Backend `filterPhotosForViewer` (`backend/src/membership-routes.ts:95-118`). Ingen profil-data lækker offentligt — al member/photo-data ligger bag auth-middleware. |
| Par kan have fælles profil | Delvist (kritisk) | Tabel og API findes (`couple_profile`), men **ingen UI** til at oprette/redigere par-profil. Se Gap 3.1 og 8.1. |
| Pause-funktion uden at miste alt | OK | `user.paused_at` + `couple_profile.paused_at`. UI: `profile-page.tsx:347-349`. |
| Ingen ansigtsbilleder offentligt by default | OK | Se beslutning 6. |
| Eksplicitets-mærkning på events | OK | Se beslutning 7. |
| Adresse først efter tilmelding | OK | `backend/src/event-routes.ts:72` (`location_address: isRegistered ? ... : null`). |
| Code of conduct læsbar FØR tilmelding | **Ikke implementeret** (kritisk) | Se Gap 7.1. |
| Ét-klik blokér og rapportér | OK | `member-detail-page.tsx:80-98`. Knapperne er der; rapportér bruger dog `window.prompt` — primitivt men funktionelt. |
| Modererede temabaserede grupper | Ikke implementeret | Forventet pr. build-log (udsat). Ingen kode-spor af grupper. |
| Per-event tråd før og efter | OK | `backend/migrations/007_messaging.sql:62-75` + `frontend/src/components/event-thread.tsx`. |
| Diskret betaling — `invoice_descriptor='GLOEDDK'` | OK | `backend/migrations/008_subscriptions.sql:50` (default) og vises til brugeren i `frontend/src/pages/membership-page.tsx:156-159`. |
| Ét-klik sletning af alle data | Delvist (høj) | Backend findes (`backend/src/membership-routes.ts:218-228` understøtter `hard_delete`). **Ingen UI-knap** på profile-page. `privacy-page.tsx:87` henviser bare til mail. |
| Navngiven ansvarlig person (ikke "support@") | **Ikke implementeret** (høj) | `frontend/src/pages/privacy-page.tsx:87-101` og `frontend/index.html:47` bruger `support@findgloed.dk`. Decision kræver navngiven kontaktperson. |

### Konsensus-gap K1 — Code of conduct ikke tilgængelig (kritisk)
Se Gap 7.1 ovenfor.

### Konsensus-gap K2 — Ingen "Slet konto"-knap (høj)
- Hvor: `frontend/src/pages/profile-page.tsx:342-371` (Kontoadministration-card)
- Foreslået fix: Tilføj "Slet konto" og "Slet alle data permanent"-knap
  (skelne mellem soft og hard delete) med to-trins bekræftelse, kald
  `api.deleteMe(true)`.

### Konsensus-gap K3 — Ingen navngiven ansvarlig kontaktperson (høj)
- Hvor: `frontend/src/pages/privacy-page.tsx:87-101`,
  `frontend/index.html:47` (JSON-LD `"email": "support@findgloed.dk"`)
- Foreslået fix: Skift `support@findgloed.dk` til en navngiven adresse
  (fx `mikkel@findgloed.dk` eller `carina@findgloed.dk`) og tilføj
  navngiven dataansvarlig-sektion i privacy-page.

### Konsensus-gap K4 — Par-profil-UI mangler helt (kritisk)
Se Gap 3.1 og 8.1.

### Konsensus-gap K5 — Modererede temabaserede grupper er udsat (info)
Forventet pr. build-log; ingen handling nødvendig i denne audit.

---

## Andre observationer (ikke direkte i de 9)

### O1 — Login-page hilser "Kun for administratorer" (medium, kosmetisk)
- Hvor: `frontend/src/pages/login-page.tsx:62`
- Stale tekst fra fase 1; gælder ikke længere efter signup er åbnet for
  alle. Bør opdateres.

### O2 — `verification-page` tilbyder ikke faktisk ID-upload UI (info)
- Hvor: `frontend/src/pages/verification-page.tsx`
- Forventet — alle brugere er pt. `temporary` verificeret (migration 009).
  API `/api/me/verification` findes (membership-routes.ts:339-376) men
  bruges ikke fra UI. Skal aktiveres når MitID-flow kommer.

### O3 — Beslutning 7's per-niveau-defaults kunne implementeres som konstant (lav)
Se Gap 7.2.

---

## Sammenfatning

**Helt OK (5 beslutninger):**
- Beslutning 3 (events × kategorier) — på backend og browse-niveau.
- Beslutning 5 (begynder-filter) — filter-delen.
- Beslutning 6 (ansigt default after_interest).
- Beslutning 7 (eksplicitets-niveau) — selve mærkningen.
- Beslutning 8 (gradueret beskedmodel) — selve modellen, ingen gamification.

**Delvise gaps (3 beslutninger):**
- Beslutning 2 (inviterer/bestemmer) — datamodel OK, marketing mangler.
- Beslutning 4 (lag-baseret nøgenhed) — backend OK, grant-management UI
  og opt-in-per-visning mangler.
- Beslutning 5 — intro-guide "tilgængelig overalt" mangler.

**Brudt eller stort gap (3 beslutninger):**
- Beslutning 1 (tone) — landing/vision/signup ligger stadig i wellness-zonen.
- Beslutning 7 — code of conduct er ikke en læsbar side endnu (kritisk
  konsensus-feature).
- Beslutning 9 — "trygt"/"tryghed" bruges flere steder som brand-mantra.

**Kritiske implementeringshuller:**
1. Code of conduct skal være en læsbar side før tilmelding.
2. Par-profil-UI (create + edit `open_to_singles` og `accepts_mixed_events`)
   mangler helt — blokerer beslutning 3 og 8.
3. Brand-copy skal renses for "trygt"/"tryghed" som mantra.
4. "Slet alle data"-knap og navngiven kontaktperson mangler.
