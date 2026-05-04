# Findgloed / Glød

Voksent rum til lyst og nærvær — i samarbejde med Dansk Sexologisk Akademi.

## Stack

- **Frontend**: React + Vite + Tailwind + Better Auth client + Motion + PWA (vite-plugin-pwa)
- **Backend**: Bun + Hono + PostgreSQL + Redis + Better Auth
- **Lokal udvikling**: alt kører i Docker Compose (Apple Silicon M3 / arm64)

## Lokalt kørsel

Alt kører i Docker. Brug scripts under `scripts/`:

```bash
./scripts/up.sh           # bygger images, starter stakken, kører migrationer + seed
./scripts/down.sh         # stopper stakken (volumes bevares)
./scripts/restart.sh      # down + up (data bevares)
./scripts/reset.sh        # hårdt reset — sletter database og uploads (kræver bekræftelse)
./scripts/logs.sh         # følger logs (eller specifik service: ./scripts/logs.sh api)
./scripts/status.sh       # viser containere + health-tjek
./scripts/seed.sh         # kører demo-seed mod kørende stack
./scripts/migrate.sh      # kører pending migrationer mod kørende stack
```

### Optioner til `up.sh`

```bash
./scripts/up.sh --rebuild   # tving rebuild af images (efter Dockerfile-ændring)
./scripts/up.sh --no-seed   # spring demo-seed over
```

### Når du ændrer en migration eller ændrer datamodellen

```bash
./scripts/reset.sh        # sletter DB
./scripts/up.sh --rebuild # frisk start med nye migrationer
```

## Porte (GLOD-profile)

| Service  | Port  | URL                              |
|----------|-------|----------------------------------|
| Web      | 4563  | http://localhost:4563            |
| API      | 4564  | http://localhost:4564/api/health |
| Postgres | 4565  | (psql)                           |
| Redis    | 4566  | (redis-cli)                      |
| Maildev  | 4567  | http://localhost:4567            |
| Adminer  | 4568  | http://localhost:4568            |

## Login (lokalt — fra `.env`)

- E-mail: `mikkelkrogsholm@gmail.com`
- Password: `skaevinge2026!`

Superadmin oprettes automatisk ved første start. Seed-scriptet sætter
verification_status til `verified` så du kan teste alle medlems-features
med det samme.

## Hvad der findes på platformen

- **Landing + waitlist** — pre-launch (eksisterende fra fase 0)
- **Identitet** — signup, onboarding (4 trin), lag-baseret profil, par-profil, manuel ID-verificering
- **Events** — 3 kategorier × 3 niveauer + erfaring-tags + tilmelding
- **Messaging** — Frederiks gradueret model + per-event tråde + block/report
- **Medlemskab** — Stripe-mock med 4 planer (single/par × standard/14-dages prøve)

Se `docs/project-management/glod-design-beslutninger.md` for de 9 låste
designvalg der styrer hele platformen.

Se `docs/project-management/build-log.md` for den fulde fase 1-4-status.

## Notes

- API kører migrationer ved container-start (`entrypoint.sh`).
- Hvis `.env` indeholder `$`, escape som `$$` for at undgå Docker Compose
  interpolation-warnings.
- Brugeruploadede billeder gemmes i `api_uploads`-volumen og bevares på
  tværs af container-genstarter. Slettes kun af `./scripts/reset.sh`.
- Stripe-integrationen er mock i denne version. Når
  `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` sættes i `.env` og koden
  i `backend/src/subscriptions.ts` opdateres, overtager rigtig Stripe.
