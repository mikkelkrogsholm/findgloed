# Glød MVP Spec v1.1

Status: Build-ready (spec only, no implementation)
Dato: 2026-02-18
Basis: `development/PRD.md` + afklaringer fra produktansvarlig

## 1. Formål
Denne specifikation oversætter PRD til en eksekverbar MVP-plan med klare kontrakter og acceptance criteria.

MVP inkluderer kun:
- Fase 1: Landing + waitlist email-opsamling
- Fase 2: Event portal + MitID-verificeret billetsalg + QR check-in

MVP ekskluderer:
- Chat
- Community/vouching UI
- Interests/matching

## 2. Prioritering af leverancer
1. Leverance 1: Landing page + waitlist + Resend bekræftelse
2. Leverance 2: Login/MitID + profil/alias
3. Leverance 3: Eventliste + eventdetalje + Stripe checkout
4. Leverance 4: Ticket generation + QR + billetmail
5. Leverance 5: Admin/partner scan view + check-in logik

## 3. Domæne og routing
Domæner:
- `findgloed.dk`: Canonical app/API/transaktionsmails
- `findglød.dk`: 301 redirect til `findgloed.dk`

Routes v1:
- `/` landing/waitlist
- `/events` eventliste
- `/event/:slug` eventdetalje + køb
- `/login` MitID flow
- `/profile` mine billetter + alias
- `/admin/scan` scanner + gæsteliste
- `/api/health` health check

## 4. Roller og adgang
Roller:
- `user`: køb billet, se egne billetter, opdatere alias, slette profil
- `partner`: se og scanne billetter for egne events
- `admin`: fuld adgang

Adgangsregel:
- Partner-data scope er begrænset til events hvor partner er owner/host.

## 5. Datamodel (v1)
Bemærk: SQL nedenfor er specifikationsniveau (ikke endelig migration-fil).

```sql
-- Leads (fase 1)
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL DEFAULT 'landing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Brugere / identitet
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mitid_sub_hash TEXT UNIQUE NOT NULL,
  alias TEXT,
  role TEXT NOT NULL DEFAULT 'user', -- user|partner|admin
  is_verified_adult BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  price_dkk INT NOT NULL,
  location TEXT,
  image_url TEXT,
  owner_partner_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Billetter
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  event_id UUID NOT NULL REFERENCES events(id),
  status TEXT NOT NULL DEFAULT 'valid', -- valid|used|refunded|void
  qr_hash TEXT UNIQUE NOT NULL,
  stripe_session_id TEXT UNIQUE,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, event_id) -- 1 billet per bruger per event
);

-- Check-ins
CREATE TABLE ticket_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID UNIQUE NOT NULL REFERENCES tickets(id),
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_in_by_user_id UUID NOT NULL REFERENCES users(id),
  scanner_device_info TEXT
);

-- Samtykker
CREATE TABLE consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  terms_accepted_at TIMESTAMPTZ NOT NULL,
  privacy_accepted_at TIMESTAMPTZ NOT NULL,
  marketing_opt_in BOOLEAN NOT NULL DEFAULT false,
  marketing_opt_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 6. API-kontrakter (v1)

### 6.1 Leverance 1 API (landing)

`POST /api/waitlist`
- Formål: oprette lead og sende velkomstmail via Resend
- Request body:
```json
{
  "email": "user@example.com",
  "source": "landing"
}
```
- Validering:
  - `email` skal være gyldig email
  - lowercase + trim inden persist
- Responses:
  - `201 Created`
```json
{
  "ok": true,
  "message": "Du er nu på listen",
  "position": 423
}
```
  - `409 Conflict` (email findes)
```json
{
  "ok": false,
  "code": "EMAIL_EXISTS",
  "message": "Email er allerede på ventelisten"
}
```
  - `422 Unprocessable Entity` (ugyldig email)
  - `500 Internal Server Error` (uventet)
- Sideeffekt:
  - Resend email “Waitlist Welcome” sendes best-effort efter DB commit
- Idempotens:
  - gentaget submit med samme email må ikke oprette dublet

`GET /api/health`
- Response: `200 OK` + simpel status payload

### 6.2 MVP API (høj-niveau, senere leverancer)
- `GET /api/events`
- `GET /api/events/:slug`
- `POST /api/checkout/session`
- `POST /api/stripe/webhook`
- `GET /api/profile/tickets`
- `POST /api/admin/checkin/scan`

Detaljer for disse fastfryses i næste spec-iteration før implementering af leverance 2+.

## 7. UI-spec: Leverance 1 (Landing)
Side: `/`

Sektioner:
1. Hero med value proposition
2. Trust badge: “I samarbejde med Dansk Sexologisk Akademi”
3. Waitlist form (email + submit)
4. Success state i samme komponent
5. Footer med links til handelsbetingelser/persondatapolitik

Visuelle krav:
- Baggrund: `neutral-950`
- Accent: `orange-500`
- Tekst: `neutral-200`
- `glass-panel` til sticky header og formcontainer
- Dansk copy-only

Interaktion:
- Loading state på submit
- Inline valideringsfejl ved ugyldig email
- Ved succes: rolig confirmation tekst + position
- Ved duplicate: tydelig besked om allerede tilmeldt

## 8. Email-spec (Resend)

Template 1: Waitlist Welcome
- Trigger: succesfuld `POST /api/waitlist`
- Emne (dk): “Du er på listen hos Glød”
- Body (minimum):
  - bekræftelse af tilmelding
  - kort forventningsafstemning om næste step
  - support-kontakt

Template 2: Ticket Confirmation
- Ikke i leverance 1, men reserveret til leverance 4

Miljøvariabler (plan):
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `SUPPORT_EMAIL`

## 9. Acceptance criteria

### Leverance 1
1. Bruger kan indtaste gyldig email på `/` og få succesbesked.
2. Email gemmes i `leads` med unik constraint.
3. Dublet email returnerer kontrolleret fejlbesked.
4. Welcome-email afsendes via Resend ved succesfuld oprettelse.
5. UI følger mørk “Nordic Noir” baseline (neutral-950/orange-500/glass-panel).
6. `GET /api/health` svarer stabilt med `200`.

### Regression guardrails
1. Ingen CPR/navn fra MitID gemmes i v1 datamodel.
2. Ingen chat/community-features må være eksponeret i UI.

## 10. Fejlhåndtering og support
- MitID fejltekst (senere leverance): “Verificering fejlede – prøv igen” + supportlink.
- Refund policy tekst: “Kontakt os for refundering” (ingen self-service i v1).
- Alle brugerrettede fejltekster på dansk.

## 11. GDPR og retention
- Billet/finansielt relevant data opbevares 5 år.
- Inaktive brugere anonymiseres/slettes efter 2 år (manuelt job i v1).
- “Slet min profil” er must-have i MVP (soft delete + anonymisering).
- Dataeksport håndteres manuelt i v1.

### 11.1 GDPR minimumskrav (bindende for MVP)
1. Dataminimering:
- Gem kun nødvendige persondata til leverancen (ingen CPR, ingen fuldt navn fra MitID).
2. Formålsbegrænsning:
- Leads må kun bruges til launch-kommunikation, medmindre separat marketing-samtykke.
3. Samtykke:
- Terms/privacy samtykke logges med timestamp.
- Marketing er separat opt-in (ikke pre-checked).
4. Registreredes rettigheder:
- “Slet min profil” skal være operationel i MVP.
- Dataeksport håndteres via manuel support-proces med dokumenteret intern procedure.
5. Sikkerhed:
- Data i transit via TLS.
- Secrets (API keys) må kun ligge i miljøvariabler, aldrig i repo.
6. Databehandlerkontrol:
- Resend, Stripe og Idura dokumenteres som databehandlere i intern oversigt.
7. Audit-spor:
- Kritiske handlinger (profilsletning, check-in, rolleændring) logges med timestamp og actor-id.

## 12. Engineering-standarder (bindende)
### 12.1 Principper
1. KISS:
- Vælg simpleste løsning der opfylder kravet.
2. DRY:
- Ingen duplikeret domænelogik på tværs af routes/services.
3. YAGNI:
- Ingen implementation af fase 3-funktionalitet i MVP-kode.
4. SOLID:
- Især Single Responsibility i service-lag og tydelige interfaces ved integrationer (Stripe/Resend/Idura).
5. TDD:
- Test-first som standard (red -> green -> refactor).

### 12.2 Kodestandard og review-krav
1. TypeScript strict mode for app-kode.
2. Ensartet formattering/linting i CI (skal være grøn før merge).
3. Ingen hardcoded secrets eller credentials.
4. Fejlhåndtering skal returnere stabile fejl-koder og danske, brugerforståelige beskeder.
5. Tests minimum:
- Leverance 1: API-validering, duplicate email-flow, success-flow og Resend-kald (mock).
6. Testproces:
- Nye features og bugfixes starter med en fejlede test, der derefter gøres grøn.
- Tests skal kunne køres i Docker-miljøet.

### 12.3 Git-praksis
1. Atomare commits:
- Hvert commit dækker én afgrænset ændring med klart formål.
2. Commit-hygiejne:
- Ingen blanding af refactor + feature + format i samme commit.
3. PR-krav:
- Kort beskrivelse, testbevis, og risikovurdering.
4. Branch-navne:
- Brug `codex/` prefix.

## 13. Drift og monitorering
- Deploy via Coolify.
- Logs via Coolify er baseline.
- Uptime monitor pinger `/api/health`.

## 13.1 Lokal udviklingsplatform (bindende)
- Primær lokal platform er Apple Silicon M3.
- Lokal udvikling og kørsel foregår i Docker.
- Standard image-arkitektur: `linux/arm64`.
- Docker Compose bruges som baseline til lokal orchestration.

## 14. Åbne punkter før kode-start
Disse bør fastfryses, men blokerer ikke Leverance 1:
1. Endelig support-email-adresse.
2. Alias regler (tegnsæt/længde) til leverance 2.
3. Om partner kan oprette/redigere events i v1, eller kun scanne/se.

## 15. Go/No-Go kriterie for implementering
Klar til `go` når:
1. Denne spec er godkendt.
2. Leverance 1 copy (hero + mailtekst) er godkendt eller accepterer placeholder-copy.
3. Support-email er fastlagt.
4. GDPR minimumskrav i afsnit 11.1 er accepteret.
5. Engineering-standarder i afsnit 12 er accepteret.
6. Docker-only lokal udvikling og TDD-krav er accepteret.
