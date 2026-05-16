# Glød Issue-Loop — Progress Tracker

**Startet:** 5. maj 2026
**Orkestrator:** Claude (auto mode + ScheduleWakeup safety net)
**Base branch:** `feature/platform-fase-1-4`

## Workflow pr. pakke

1. Opret epic-branch fra `feature/platform-fase-1-4`: `epic/pakke-N-<slug>`
2. Send subagent ud med konkret brief
3. Når agent er færdig: tjek tests, type-check, visuel verifikation hvor relevant
4. Hvis grønt: merge tilbage til `feature/platform-fase-1-4`
5. Opdatér denne fil
6. Næste pakke

## Status pr. pakke

| # | Pakke | Branch | Status | Agent-ID | Noter |
|---|-------|--------|--------|----------|-------|
| 1 | Make verification real | `epic/pakke-1-verification` | 🟢 MERGED | done | A6, A7, A8, A21, A23 — 45/45 tests grønne, merged til feature-branch |
| 2 | Couple as first-class | `epic/pakke-2-couple` | 🟢 MERGED | done | A3, A4, C6, C24 — invitation-flow + par-profil-UI + plans-grupperet, 54/54 tests |
| 3 | Lag 2 (match) skal virke | `epic/pakke-3-match-layer` | ⚪ TODO | — | A2, B1, B2, B48 |
| 4 | Brand-rens (beslutning 1+9) | `epic/pakke-4-brand-rens` | 🟢 MERGED | done | A15, A16, B12, C33-C43 — 15 filer, ~30 erstatninger, 45/45 tests grønne |
| 5 | GDPR + dataansvar | `epic/pakke-5-gdpr` | 🟢 DONE | done | A9, A10, A17, A19, C9 — slet-konto-dialog + anonymisering + ghost-protection + dataansvarlig, 55/55 tests grønne |
| 6 | Code of conduct + terms | `epic/pakke-6-coc-terms` | ⚪ TODO | — | A5, A19, B46 |
| 7 | Auth & rate-limiting | `epic/pakke-7-auth-hardening` | ⚪ TODO | — | A14, A18, B13, B14, B20-B22 |
| 8 | Skeleton + a11y | `epic/pakke-8-a11y-skeleton` | ⚪ TODO | — | A20, A22, B23-B31, C47-C58 |
| 9 | Admin UX | `epic/pakke-9-admin-ux` | ⚪ TODO | — | B8, B9, B10, B17, C30-C32 |
| 10 | Stripe live-readiness | `epic/pakke-10-stripe` | ⚪ TODO | — | A18, B37, C25-C29 |
| 11 | DB- & query-optimering | `epic/pakke-11-perf` | ⚪ TODO | — | A11, A12, A13, A24, B15, B16 |

Legend: ⚪ TODO · 🟡 PENDING (briefed) · 🟠 IN PROGRESS · 🟢 MERGED · 🔴 BLOCKED

## Beslutningsregler

- Hvis agent rapporterer fejl: send ny agent med præcis hvad der mangler
- Hvis tests fejler: send ny agent med "fix testene"
- Hvis blokeret af brugerinput-behov: dokumentér i Noter og spring til næste pakke
- Hvis kompleks merge-conflict: spring pakken over og notér til menneskelig review

## Hændelseslog

(senest øverst)

| Tid | Hændelse |
|-----|----------|
| 16. maj 2026 | Pakke 5 afsluttet 🟢 — A9 (Slet konto-sektion på `/profile` med to-trins Dialog: soft- vs. hard-delete, email-bekræftelse, GDPR-rettigheds-info + link til privacy), A10 (hardDelete er nu GDPR-konform: anonymiserer user-rækken til `[Slettet bruger]` med dummy-email, sletter profile_photo + verification_submission og deres fysiske filer, opløser couple_profile, annullerer subscriptions/interest_signal/invitations, invaliderer sessions; transaktionel — beskeder bevares så samtale-partnere stadig kan se historikken via ny `getProfileIncludingDeleted`-metode), A17 (globalt ghost-protection-middleware på `/api/*` checker `deleted_at` ved enhver auth'd request; soft-deleted brugere får 401 ACCOUNT_DELETED selv med gyldig session-cookie; `/api/auth/*` springes over så logout virker), A19 (navngiven dataansvarlig "Mikkel Freltoft Krogsholm" i privacy-page + JSON-LD `contactPoint`/`founder`; nye envs `DATA_CONTROLLER_NAME` + `DATA_CONTROLLER_EMAIL`; email-signaturer bruger nu dataansvarlig-info; alle `support@findgloed.dk` skiftet til `mikkel@findgloed.dk`), C9 (par-koblinger opløses automatisk i både soft- og hardDelete; pending invitations cancelleres). Backend smoke-test bekræftet: oprettelse → mutual interest → besked → hardDelete → "[Slettet bruger]" vises i samtale-partnerens chat, deleted user får 401, photos/sessions/IDs er væk fra DB. Frontend build + 55/55 tests grønne (ny test for delete-dialog). |
| 16. maj 2026 | Pakke 4 afsluttet 🟢 — A15 (MitID-over-claim fjernet i vision FAQ + index.html meta), A16 ("trygt"/"tryghed"/"trygge rammer" fjernet fra landing/vision/signup/membership/partner-modal/design-page/design-system; nu kun 0 referencer i kodebasen — beslutning 9 er låst), B12 (ny "To roller, ligeværdige"-sektion på vision-page + tagline på landing om "den der inviterer / bestemmer tempoet"), C33-C43 (seed-event copy renset for tantra/sex-positive/redskaber/terapeut, event-thread "kødmarked"-bisætning fjernet, onboarding "adressere respektfuldt" → ligeværdige roller, engelsk "invites/early access" oversat, landing-tankestreg). Frontend build + 45/45 tests grønne. |
| 16. maj 2026 | Pakke 1 afsluttet 🟢 — A6 (SQL ambiguous fix), A7 (ghost-medlemmer filter), A8 (admin-verifications + admin-reports UI), A21 (onboarding-knap-tekst), A23 (rejectVerification nedgraderer altid). Smoke-test bekræftet: `/api/admin/verifications` returnerer 200, ghost-bruger filtreres ud af `/api/members`. Build + 45/45 tests grønne. |
| (init) | Loop-progress oprettet. Starter Pakke 1. |
