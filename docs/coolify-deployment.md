# Coolify Deployment Guide

Denne guide beskriver hvordan Findgloed deployes til produktion via Coolify med Docker Compose.

---

## Arkitektur

```
Browser
  │
  ├─ findgloed.dk ──────► Traefik ──► web (nginx:80)
  │                                        │
  │                              /api proxies internt til
  │                                        │
  └─ api.findgloed.dk ──► Traefik ──► api (bun:4564)
```

`web`-servicens nginx proxyer `/api/*` internt til `api`-containeren på `http://api:4564`. `api.findgloed.dk` bruges til direkte adgang — primært Stripe webhooks og Idura/MitID auth callbacks.

---

## Forudsætninger

- Coolify installeret og tilgængeligt på din server
- `findgloed.dk` og `api.findgloed.dk` peger på serverens IP (A-record)
- Git-repo tilgængeligt (GitHub, GitLab eller Gitea)
- Adgang til Resend, Stripe og Idura credentials

---

## Trin 1 — Opret ny application

1. Log ind i Coolify dashboard
2. Vælg dit projekt (eller opret nyt)
3. Klik **+ New Resource** → **Docker Compose**
4. Vælg dit Git repository og branch (`main`)
5. Sæt **Docker Compose Location** til: `docker-compose.prod.yml`
6. Klik **Save**

---

## Trin 2 — Konfigurer domæner

Coolify's Traefik proxy håndterer routing og TLS automatisk.

### `web`-service → `findgloed.dk`

1. Under **Services**, find `web`-servicen
2. Tilføj domæne: `findgloed.dk`
3. Sæt **HTTPS** til aktiveret — Traefik udsteder automatisk Let's Encrypt certifikat
4. Port-feltet: `80`

### `api`-service → `api.findgloed.dk`

1. Under **Services**, find `api`-servicen
2. Tilføj domæne: `api.findgloed.dk`
3. Sæt **HTTPS** til aktiveret
4. Port-feltet: `4564`

> `web`-servicen bruger `expose: ["80"]` ikke `ports`, så Traefik er den eneste der rammer containerne udefra.

---

## Trin 3 — Sæt environment variables

Under **Environment Variables** i Coolify, tilføj alle nedenstående variabler. Klik **Bulk Edit** for at indsætte dem samlet.

### Runtime

```
APP_ENV=production
APP_NAME=findgloed
```

### URLs

```
APP_URL=https://findgloed.dk
API_URL=https://api.findgloed.dk
CORS_ORIGINS=https://findgloed.dk
BETTER_AUTH_URL=https://api.findgloed.dk
IDURA_REDIRECT_URI=https://api.findgloed.dk/auth/callback
```

### Database

```
POSTGRES_DB=findgloed
POSTGRES_USER=findgloed
POSTGRES_PASSWORD=<stærkt-random-password>
DATABASE_URL=postgresql://findgloed:<password>@db:5432/findgloed
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
```

### Auth (Better Auth)

```
BETTER_AUTH_SECRET=<min-32-tegn-url-safe-secret>
JWT_SECRET=<langt-random-secret>
ENCRYPTION_KEY=<min-32-tegn-secret>
ADMIN_EMAILS=admin@findgloed.dk
SUPERADMIN_EMAIL=admin@findgloed.dk
SUPERADMIN_PASSWORD=<stærkt-password>
```

### Auth (Idura / MitID)

```
IDURA_BASE_URL=https://idura.eu
IDURA_ISSUER_URL=<fra-idura-dashboard>
IDURA_CLIENT_ID=<fra-idura-dashboard>
IDURA_CLIENT_SECRET=<fra-idura-dashboard>
```

### Email (Resend)

```
RESEND_API_KEY=re_<din-api-nøgle>
RESEND_FROM_EMAIL=noreply@findgloed.dk
SUPPORT_EMAIL=support@findgloed.dk
```

### Betalinger (Stripe)

```
STRIPE_SECRET_KEY=sk_live_<din-nøgle>
STRIPE_WEBHOOK_SECRET=whsec_<din-webhook-secret>
```

Stripe webhook endpoint skal sættes til `https://api.findgloed.dk/api/stripe/webhook` i Stripe Dashboard.

### Waitlist / Consent

```
WAITLIST_CONFIRM_PATH=/waitlist/confirm
PARTNER_CONFIRM_PATH=/partner/confirm
WAITLIST_CONFIRM_TOKEN_TTL_HOURS=72
WAITLIST_RESEND_COOLDOWN_MINUTES=15
```

### Rate limiting

```
REDIS_URL=redis://redis:6379
RATE_LIMIT_ENABLED=true
RATE_LIMIT_FAIL_OPEN=false
RATE_LIMIT_WAITLIST_MAX=5
RATE_LIMIT_WAITLIST_WINDOW_SECONDS=60
RATE_LIMIT_CONFIRM_MAX=10
RATE_LIMIT_CONFIRM_WINDOW_SECONDS=60
```

### Sikkerhed

```
TRUST_PROXY=true
ENABLE_HSTS=true
HSTS_MAX_AGE_SECONDS=31536000
```

> **Vigtigt:** Brug kun URL-safe tegn (bogstaver, tal, `_`, `-`) i secrets for at undgå Docker Compose interpolationsproblemer.

---

## Trin 4 — Deploy

1. Klik **Deploy** i Coolify
2. Følg build-loggen — services starter i rækkefølge:
   - `db` og `redis` starter og kører healthcheck
   - `api` starter, kører migrationer og starter serveren
   - `web` starter nginx og er klar til trafik
3. Coolify markerer deployment som succesfuld når alle healthchecks er grønne

---

## Trin 5 — Verifikation

Kør disse tjek efter deployment:

```sh
# API health — direkte
curl https://api.findgloed.dk/api/health
# → {"ok":true}

# API health — via nginx proxy
curl https://findgloed.dk/api/health
# → {"ok":true}

# Frontend
curl -I https://findgloed.dk
# → HTTP/2 200
```

I Coolify dashboard kan du se container-status og healthcheck-resultater under **Containers**.

---

## Graceful shutdown

`api`-containeren bruger `exec` i `entrypoint.sh`, så SIGTERM propageres direkte til bun-processen. Ved redeploy eller `docker stop` afsluttes serveren rent — ingen brudte requests.

---

## Continuous deployment

Coolify kan konfigureres til at deploye automatisk ved push til `main`:

1. Under **Settings** → **Webhooks**, kopiér webhook-URL'en
2. Tilføj webhook i GitHub/GitLab under **Settings → Webhooks**
3. Vælg event: **Push**
4. Fremtidige pushes til `main` trigger automatisk redeploy

---

## Fejlfinding

| Symptom | Sandsynlig årsag | Løsning |
|---------|-----------------|---------|
| `api` starter aldrig | DB healthcheck fejler | Tjek `POSTGRES_PASSWORD` matcher på tværs af vars |
| 502 Bad Gateway | `api` ikke klar endnu | Vent — `start_period` er 15s; tjek logs |
| TLS virker ikke | DNS ikke propageret | Vent på DNS TTL; tjek A-record peger på server |
| Auth fejler | `BETTER_AUTH_URL` forkert | Skal være `https://api.findgloed.dk` |
| MitID callback fejler | `IDURA_REDIRECT_URI` forkert | Skal være `https://api.findgloed.dk/auth/callback` |
| Stripe webhook fejler | Webhook endpoint forkert | Sæt endpoint til `https://api.findgloed.dk/api/stripe/webhook` |
| Migrationer fejler ved start | `DATABASE_URL` forkert | Tjek user/password/host matcher db-service |
| `/api` returnerer 404 fra `findgloed.dk` | nginx proxy fejler | Tjek at `api`-containeren er healthy; se nginx-logs |
