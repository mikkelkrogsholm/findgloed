---
name: findgloed-app
description: Forklarer Findgloeds app-arkitektur — routes, sider, komponenter, API-endpoints, database-schema, auth og services. Brug denne skill ved al frontend- og backend-udvikling på projektet.
---

# Findgloed App-arkitektur

## Tech Stack

**Frontend:** React 18 + TypeScript, Vite, Tailwind CSS + CSS custom properties, Motion (Framer Motion), Better Auth Client, shadcn/ui, Vitest

**Backend:** Bun runtime, Hono framework, TypeScript, PostgreSQL, Redis, Better Auth, Resend

---

## Frontend

### Routing

Al routing er custom SPA i `App.tsx` — ingen React Router. Navigation via `window.history.pushState` + `popstate` events.

| Route | Side | Fil |
|-------|------|-----|
| `/` | Landing page — waitlist signup | `pages/landing-page.tsx` |
| `/vision` | Vision + partner interesse modal | `pages/vision-page.tsx` |
| `/privacy` | Persondatapolitik | `pages/privacy-page.tsx` |
| `/waitlist/confirm` | Email-bekræftelse (token) | `pages/waitlist-confirm-page.tsx` |
| `/partner/confirm` | Partner-bekræftelse (token) | `pages/partner-confirm-page.tsx` |
| `/login` | Admin login | `pages/login-page.tsx` |
| `/admin` | Admin dashboard — leads + CSV export | `pages/admin-page.tsx` |
| `/design` | Design system (feature-flagget) | `pages/design-page.tsx` |
| `*` | 404 | `pages/not-found-page.tsx` |

**Enkelt HTML entry point:** `index.html` — nginx `try_files` sender alle routes til React.

### Sider

- **LandingPage** — waitlist-formular med samtykke-checkboxe (vilkår + marketing opt-in)
- **VisionPage** — brandvision + `PartnerInterestModal` (navn, organisation, rolle, region, interesser)
- **AdminPage** — leads-tabel med søgning, filtrering (status/marketing), sortering, CSV-export. Kræver admin-session.
- **LoginPage** — email/password via Better Auth client, password toggle
- **WaitlistConfirmPage** — token-validering via GET `/api/waitlist/confirm?token=`
- **PartnerConfirmPage** — token-validering via GET `/api/partner-interest/confirm?token=`

### Komponentstruktur

```
src/
  App.tsx                          Routing + motion + theme setup
  main.tsx                         React entry point
  pages/                           En fil per route (se tabel ovenfor)
  components/
    layout/
      site-shell.tsx               Hoved-layout: sticky header, nav, grain-baggrund, theme-orbs
    partner/
      partner-interest-modal.tsx   Partner-formular i modal
    ui/                            shadcn/ui komponenter (19 stk.)
  config/
    app-config.ts                  Routes, feature flags (VITE_ENABLE_DESIGN_PAGE, VITE_THEME_PRESET)
    design-system.ts               Token-grupper, typografi, tema-deskriptorer
  lib/
    auth-client.ts                 Better Auth client (bruger VITE_API_URL)
    motion.ts                      Motion-presets, variants, easing, reduced-motion
  styles/
    tokens.css                     CSS custom properties (farver, glass surfaces, fonte)
    primitives.css                 Base element-styles
  styles.css                       Hoved-stylesheet
```

### Design System

**Tilgang:** Token-baseret — ingen hardcodede farver i komponenter.

**Tokens (CSS custom properties):**
- `--color-accent`, `--color-link`
- `--color-bg-base/mid/end`
- `--color-text-primary/secondary/tertiary`
- `--glass-header/shell/card/pill-surface` (frosted glass med blur)
- `--font-display` (serif), `--font-body` (sans), `--font-kicker`

**Temaer:** `data-theme="legacy"` eller `data-theme="anthro-v1"` på `<html>`

**Motion:** `data-motion="default"` eller `data-motion="reduced"` — respekterer `prefers-reduced-motion`

**Utility-klasser:** `glass-pill`, `glass-shell`, `hover-glow`, `glow-cta`, `ambient-breathe`, `background-grain`

### Auth (Frontend)

```ts
// src/lib/auth-client.ts
authClient.signIn.email({ email, password })
```
- Session via cookies (`credentials: "include"` på admin-requests)
- Login redirecter til `/admin` via `history.pushState`
- Ingen token-storage — alt er cookie-baseret

### Build-time Env Vars

Sættes som Docker build args (`VITE_*` bages ind i JS-bundlen):

| Var | Formål |
|-----|--------|
| `VITE_API_URL` | API-base URL (default: `http://localhost:4564`) |
| `VITE_UMAMI_WEBSITE_ID` | Umami analytics website ID |
| `VITE_ENABLE_DESIGN_PAGE` | Feature flag for design-siden |
| `VITE_THEME_PRESET` | `legacy` eller `anthro-v1` |

---

## Backend

### API Endpoints

**Base:** Hono framework i `src/app.ts`

**Public:**

| Method | Endpoint | Beskrivelse |
|--------|----------|-------------|
| `POST` | `/api/waitlist` | Tilmeld waitlist — `{ email, termsAccepted, marketingOptIn }` |
| `GET` | `/api/waitlist/confirm?token=` | Bekræft email-token |
| `POST` | `/api/partner-interest` | Partner-interesse — `{ email, name, organization, role, region, interests[], termsAccepted }` |
| `GET` | `/api/partner-interest/confirm?token=` | Bekræft partner-token |
| `GET` | `/api/health` | `{ ok: true, service: "findgloed-api" }` |
| `ALL` | `/api/auth/*` | Better Auth proxy (sign-in, sign-up, session osv.) |

**Beskyttede (kræver admin-session):**

| Method | Endpoint | Beskrivelse |
|--------|----------|-------------|
| `GET` | `/api/admin/leads` | Alle leads + metadata `{ total, confirmed, pending }` |

### Database Schema

**4 migrationer** i `backend/migrations/`:

**`leads`** (waitlist)
- `id`, `email` (UNIQUE), `source`, `status` (pending/confirmed)
- `confirmation_token_hash`, `confirmation_token_expires_at`
- `terms_accepted_at`, `privacy_accepted_at`
- `marketing_opt_in`, `marketing_opt_in_at`
- `confirmed_at`, `created_at`, `updated_at`

**`consent_events`** — audit trail for waitlist-samtykke
- `lead_id` (FK), `event_type`, `occurred_at`, `metadata_json`

**`partner_leads`** — samme struktur som `leads` + `name`, `organization`, `role`, `region`, `interests_json` (JSONB)

**`partner_consent_events`** — audit trail for partner-samtykke

**Better Auth tabeller:** `user`, `session`, `account`, `verification`
- `user.role` — custom felt: `"admin"` eller `"user"`

### Services

**`src/email.ts` — ResendEmailService**
- `sendWaitlistConfirm(email, confirmUrl)`
- `sendWaitlistWelcome(email)`
- `sendPartnerInterestConfirm(email, confirmUrl)`
- `sendPartnerInterestReceived(email)`

**`src/rate-limit.ts` — RedisRateLimiter**
- Scopes: `waitlist` (5/60s), `confirm` (10/60s), `partner_interest`, `partner_confirm`
- Fingerprint: SHA256(IP + user-agent).slice(0, 32)
- Redis keys: `rl:{scope}:{fingerprint}:{emailHash}:{windowBucket}`
- Fail-open mode hvis Redis utilgængelig (konfigurerbart)

**`src/db.ts` — PostgresLeadRepository**
- Implementerer `WaitlistRepository` + `PartnerInterestRepository`
- Transaktionelle operationer
- Resend-cooldown (15 min) og token-TTL (72t) håndteres her

**`src/auth.ts` — Better Auth**
- Email/password auth
- Custom `role`-felt på user
- `before` hook: kun emails i `adminEmails`-whitelist kan oprette konto
- `ensureSuperAdmin()` — bootstrap af første admin-bruger ved opstart

### Bootstrap-rækkefølge (`src/index.ts`)

1. Læs config
2. Opret PostgreSQL pool
3. Initialiser Redis rate limiter
4. Opret `PostgresLeadRepository`
5. Parse `ADMIN_EMAILS` + tilføj `SUPERADMIN_EMAIL` til whitelist
6. Opret Better Auth service (med adminEmails)
7. `ensureSuperAdmin()` hvis konfigureret
8. Opret Hono app
9. Start Bun server på `PORT` (4564 i prod)
10. SIGINT/SIGTERM → graceful shutdown

### Sikkerhedsheaders (alle responses)

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'none'; frame-ancestors 'none'
Strict-Transport-Security (hvis ENABLE_HSTS=true)
```

### Token-sikkerhed

- SHA256-hash af tilfældig token (base64url) gemmes i DB
- TTL: 72 timer (konfigurerbart)
- Resend-cooldown: 15 minutter
- Rate limiting per fingerprint + email

---

## Nøglefiler

```
frontend/src/App.tsx                    Routing
frontend/src/config/app-config.ts       Routes + feature flags
frontend/src/lib/auth-client.ts         Better Auth client
frontend/src/lib/motion.ts              Animation presets
frontend/src/styles/tokens.css          Design tokens

backend/src/index.ts                    Entry point + bootstrap
backend/src/app.ts                      Hono routes
backend/src/config.ts                   Env var parsing
backend/src/auth.ts                     Better Auth setup
backend/src/db.ts                       Database repository
backend/src/email.ts                    Resend email service
backend/src/rate-limit.ts              Redis rate limiter
backend/migrations/                     SQL migrationer (001-004)
```
