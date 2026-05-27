# Test-kontrakt — Fase 1: Identitets-fundament

## Hvad skal virke

### Bruger-signup og auth (ud over admin)
- Ikke-admin email kan oprette konto via `/signup`
- Login-flow virker for ikke-admin (Better Auth)
- Session-cookie sættes korrekt

### Profil-felter (beslutning 2, 4, 6)
- Bruger har: `display_name`, `birth_year`, `region`, `bio`, `initiator_role`, `face_visibility`, `paused_at`
- `initiator_role` ∈ `inviting | deciding | balanced` (beslutning 2 — par-rolle)
- `face_visibility` ∈ `after_interest | all_verified` (beslutning 6 — default `after_interest`)

### Lag-baseret synlighed (beslutning 4)
- Lag 1 (verden): ingen profil-data overhovedet — `/api/users/:id` returnerer 401 uden session
- Lag 2 (verificerede medlemmer): pseudonym + alder + region + bio. Ansigt kun hvis `face_visibility = all_verified`
- Lag 3 (efter gensidig interesse): ansigt synligt uanset `face_visibility`
- Lag 4 (privat-delt): private fotos kun synlige hvis modtager har gyldig `private_album_grant`

### Par-profil (beslutning 3)
- To verificerede brugere kan oprette fælles par-profil
- Par har: `display_name`, `bio`, `open_to_singles`, `accepts_mixed_events`
- `open_to_singles` styrer om singles kan starte chat (beslutning 8)
- `accepts_mixed_events` styrer om par kan se mixed events (beslutning 3)

### Verificering (placeholder for MitID)
- Bruger kan uploade ID-billede + selfie via `/api/users/me/verification`
- Status starter som `pending`
- Admin kan godkende/afvise via `/api/admin/verifications`
- Kun verificerede brugere kan se andre profiler eller starte chat

### Pause / sletning
- Bruger kan pause profil → `paused_at` sættes, profil skjules fra `/members`
- Bruger kan slette konto + alle data (cascade)

## Tests der bekræfter

### Backend (manuel curl + senere bun test)
```
POST /api/users/me/verification → status pending
POST /api/admin/verifications/:id/approve → user.verification_status = verified
GET /api/users/:id (uden session) → 401
GET /api/users/:id (med ikke-verificeret session) → 403
GET /api/users/:id (med verificeret session, ingen interesse) → profil uden ansigt hvis face_visibility = after_interest
```

### Frontend (Vitest)
- `signup-page.test.tsx`: form viser email + password + samtykke, submit kalder Better Auth
- `onboarding-page.test.tsx`: 4 trin, kan navigere frem/tilbage, gemmer felter
- `profile-page.test.tsx`: viser egen profil, synligheds-toggle virker
- `members-page.test.tsx`: lister verificerede profiler, ansigt skjult by default
- `verification-page.test.tsx`: upload-felter, viser status

### Visuel verificering (web-app-tester)
- Mobile (375px) og desktop (1280px)
- Ingen console errors på nogen ny side
- Glassmorphism bevares fra design system
- Ingen swipe-mekanik nogensteds

## Ud af scope (kommer i fase 2-4)

- Events
- Beskeder (selvom datamodellen for `match`/interesse-signaler bygges nu — bruges af fase 3)
- Betaling
- Forum/grupper
