# Build log — Glød platform-bygget

Mikkel: brug denne til at se hvor jeg er og hvad der mangler når du kommer tilbage. Jeg opdaterer den løbende.

**Branch:** `feature/platform-fase-1-4`
**Startet:** 3. maj 2026

---

## Scope

Bygge alle 4 faser autonomt i én session:

1. **Fase 1 — Identitet**: bruger-signup ud over admin, MitID-placeholder (manuel admin-godkendelse), lag-baseret profil, par-profil, sletning/pause
2. **Fase 2 — Events**: 3 kategorier (single/par/mixed) × 3 niveauer (sanseligt/sensuelt/eksplicit) + erfaring-tag, tilmelding, lokation efter tilmelding, vært-visning
3. **Fase 3 — Full messaging**: Frederiks gradueret model + per-event tråde + modererede grupper + block/report
4. **Fase 4 — Betaling**: Stripe-mock med tydelige TODOs hvor rigtige nøgler skal sættes

## Antagelser jeg tager pragmatisk

- **MitID = placeholder**: ID-upload + selfie, manuelt godkendt af admin via `/admin`. Når DSA har Criipto/MitID Erhverv-aftale, udskiftes flowet.
- **Stripe = mock**: env vars med dummy-værdier, tydelig TODO i koden.
- **Filer = lokal disk** i `backend/uploads/` bag auth-middleware. Senere migrerer vi til S3-kompatibel storage.
- **Demo-data**: 3-4 demo events + 2-3 demo profiler så du kan klikke rundt.

## Cyklus pr. fase

1. Test-kontrakt (hvad skal virke, hvilke tests bekræfter det)
2. Datamodel (migration)
3. Backend endpoints
4. Frontend sider + komponenter
5. Vitest tests + kør (skal være grønne)
6. Visuel test via web-app-tester subagent (screenshots, console, network)
7. Bug-fixes
8. Commit på feature-branch
9. Status-update i denne log
10. Næste fase

## Status

### Fase 1 — Identitet ✅ KLAR

- Migration 005 lagt ned: udvidede `user`-tabel + nye tabeller (`couple_profile`, `profile_photo`, `private_album_grant`, `verification_submission`)
- Backend: `MembershipRepository`, fil-upload-store (`backend/uploads/`), `/api/me`, `/api/members`, `/api/couples`, `/api/admin/verifications`
- Auth: fjernet admin-only signup-blokade — nu kan medlemmer oprette konto
- Frontend: signup, onboarding (4 trin), verificering, profil, medlems-browse, medlemsdetalje + PWA-update-prompt
- Tests: 45/45 grønne. Nye tests for signup, onboarding, members.
- Visuel verificering: alle sider testet på 375px og 1280px, glassmorphism intakt, ingen console errors

**Bugs fundet og fixet:**
- Backend CORS manglede PATCH+DELETE — fikset i `app.ts:60`
- Hono pattern `/api/me*` matchede ikke `/api/me` præcis — fikset med separate exact + wildcard middleware

**Kendt åbent issue (ikke-blokerende):**
- Trin 4 → /onboarding/verification: URL ændres men siden re-rendrer ikke konsekvent. Skal måske udskiftes med proper route-state. Fix udskudt til fase 2.
