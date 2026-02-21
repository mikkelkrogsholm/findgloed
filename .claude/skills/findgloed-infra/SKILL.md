---
name: findgloed-infra
description: Forklarer Findgloeds komplette infrastruktur og deployment-setup. Brug denne skill når der arbejdes med deployment, server-adgang, Docker Compose, domæner, analytics eller GDPR-relaterede spørgsmål.
---

# Findgloed Infrastruktur

## Server

| Parameter | Værdi |
|-----------|-------|
| Udbyder | Hetzner Online GmbH |
| Datacenter | HEL1 — Helsinki, Finland (EU/EØS) |
| Servertype | CPX22 — Regular Performance |
| Specs | 2 vCPU AMD, 4 GB RAM, 80 GB SSD |
| OS | Ubuntu 24.04 LTS |
| IP | 89.167.84.70 |
| SSH-adgang | `ssh root@89.167.84.70` |

## Domæner

| Domæne | Service | Port |
|--------|---------|------|
| `findgloed.dk` | React/Nginx frontend | 80 (intern) |
| `api.findgloed.dk` | Bun/Hono API | 4564 (intern) |
| `umami.findgloed.dk` | Umami analytics | 3000 (intern) |

## Docker Compose Stack

Produktionsfilen: `docker-compose.prod.yml`
Repo på server: `/opt/findgloed`

```
traefik          → Reverse proxy, Let's Encrypt TLS, port 80+443 eksponeret
db               → PostgreSQL 16-alpine, volume: postgres_data
redis            → Redis 7-alpine
api              → Bun/Hono backend, port 4564
web              → React/Vite bygget til Nginx, port 80
umami            → Umami analytics, port 3000, database: umami (separat i postgres)
```

### Startup-rækkefølge
`db` + `redis` → `api` (kører migrationer via entrypoint.sh) → `web` + `umami`

### Traefik
- Kører som service i samme compose-stack
- `exposedbydefault=false` — kun services med `traefik.enable=true` label routes
- Let's Encrypt via HTTP challenge, certifikater i volume `traefik_letsencrypt`
- HTTP → HTTPS redirect aktiveret
- HSTS håndteres af Traefik (ikke applikationen — `ENABLE_HSTS=false` i API)

## Repository

```
git@github.com:mikkelkrogsholm/findgloed.git
Klonet til: /opt/findgloed
```

Monorepo-struktur:
```
backend/          Bun/Hono API
  src/index.ts    Entry point
  src/migrate.ts  Migrationer
  entrypoint.sh   Kører migrationer + exec bun (SIGTERM-safe)
  Dockerfile
frontend/         React/Vite SPA
  index.html      Eneste HTML entry point (single-page app)
  Dockerfile.prod
  nginx.conf
postgres/
  init.sql        Opretter umami-database ved første start
docker-compose.prod.yml
docs/
  deployment.md   Komplet deployment-guide
  GDPR.md         GDPR-dokumentation
```

## Frontend Arkitektur

- **Single HTML entry point**: `index.html` er eneste HTML-fil
- Al routing håndteres af React i `App.tsx` via `window.location.pathname`
- Nginx `try_files $uri /index.html` sender alle routes til React
- Vite build-time env vars: `VITE_API_URL`, `VITE_UMAMI_WEBSITE_ID`
- Disse skal sættes som build args i docker-compose og Dockerfile

## Analytics

Umami er self-hosted på `umami.findgloed.dk`.
Script i `index.html`:
```html
<script async src="https://umami.findgloed.dk/script.js" data-website-id="%VITE_UMAMI_WEBSITE_ID%"></script>
```
`VITE_UMAMI_WEBSITE_ID` sættes i `.env` på serveren efter Umami-setup.
Default login: `admin` / `umami` — skal skiftes ved første login.

## Deploy & Opdater

### Første deploy
```sh
ssh root@89.167.84.70
cd /opt/findgloed
docker compose -f docker-compose.prod.yml up -d --build
```

### Opdater til ny version
```sh
ssh root@89.167.84.70
cd /opt/findgloed
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

### Se logs
```sh
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f traefik
```

### Tjek status
```sh
docker compose -f docker-compose.prod.yml ps
curl https://api.findgloed.dk/api/health
```

## GDPR

- Alle persondata lagres på Hetzner HEL1 (Finland, EU) — forlader ikke EU
- Umami: cookiefri, ingen tredjepart, self-hosted
- Resend: databehandler i USA — DPA med SCC: [resend.com/legal/dpa](https://resend.com/legal/dpa)
- Hetzner: DPA tilgængelig på [hetzner.com/legal/privacy](https://www.hetzner.com/legal/privacy)
- Fuld dokumentation: `docs/GDPR.md`
