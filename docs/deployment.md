# Deployment Guide — Hetzner + Caddy

Caddy kører som reverse proxy i samme Docker Compose stack. Let's Encrypt TLS udstedes automatisk via en statisk Caddyfile.

---

## Infrastruktur & GDPR

| Parameter | Valg | Begrundelse |
|-----------|------|-------------|
| Udbyder | Hetzner Online GmbH | Tysk virksomhed, underlagt EU-ret |
| Datacenter | HEL1 — Helsinki, Finland | EU/EØS — data forlader ikke EU |
| Servertype | CPX22 — Regular Performance | 2 vCPU, 4 GB RAM, 80 GB SSD |
| OS | Ubuntu 24.04 LTS | LTS til august 2029 |
| Reverse proxy | Caddy v2 | Open source, ingen ekstern databehandling |
| TLS | Let's Encrypt (ACME) | Automatisk certifikatudstedelse |
| Database | PostgreSQL 16 (Docker) | Kører lokalt på serveren, ingen cloud-DB |
| Email | Resend | Databehandleraftale tilgængelig — husk DPA |

**GDPR-relevante noter:**
- Alle persondata (email-adresser fra waitlist) lagres udelukkende på Hetzner HEL1 i Finland
- Hetzner tilbyder Data Processing Agreement (DPA) — underskrives på [hetzner.com/legal/privacy](https://www.hetzner.com/legal/privacy)
- Resend er en databehandler — DPA er tilgængelig uden forhandling: [resend.com/legal/dpa](https://resend.com/legal/dpa) / [PDF](https://resend.com/static/documents/resend-dpa-signed.pdf)
- Ingen data sendes til tredjelande uden for EU/EØS

---

## Trin 1 — Opret server på Hetzner

1. [console.hetzner.cloud](https://console.hetzner.cloud) → **+ New Server**
2. Location: **Helsinki** (HEL1)
3. Image: **Ubuntu 24.04**
4. Type: **CPX22** — Regular Performance (2 vCPU, 4 GB RAM)
5. SSH key: indsæt din public key
6. Klik **Create & Buy Now**

Noter serverens IP-adresse.

---

## Trin 2 — Peg DNS på serveren

Hos din DNS-udbyder:

| Type | Navn | Værdi |
|------|------|-------|
| A | `findgloed.dk` | `<SERVER_IP>` |
| A | `www.findgloed.dk` | `<SERVER_IP>` |
| A | `api.findgloed.dk` | `<SERVER_IP>` |

Vent til DNS propagerer (tjek med `dig findgloed.dk`) inden deploy. Let's Encrypt fejler hvis DNS ikke peger rigtigt.

---

## Trin 3 — Klargør serveren

```sh
ssh root@<SERVER_IP>

# Installer Docker
curl -fsSL https://get.docker.com | sh

# Generer deploy-nøgle til GitHub
ssh-keygen -t ed25519 -C 'deploy@findgloed' -f ~/.ssh/id_ed25519 -N ''
cat ~/.ssh/id_ed25519.pub
# Tilføj output som Deploy Key på: github.com/mikkelkrogsholm/findgloed → Settings → Deploy keys

# Klon repo
git clone git@github.com:mikkelkrogsholm/findgloed.git /opt/findgloed
```

---

## Trin 4 — Opret `.env` fil

```sh
nano /opt/findgloed/.env
```

### Komplet `.env` til produktion

```env
# Domæner
DOMAIN=findgloed.dk
API_DOMAIN=api.findgloed.dk
ACME_EMAIL=admin@findgloed.dk

# URLs (bruges af API og frontend build)
APP_URL=https://findgloed.dk
API_URL=https://api.findgloed.dk
BETTER_AUTH_URL=https://api.findgloed.dk
CORS_ORIGINS=https://findgloed.dk

# Database
POSTGRES_DB=findgloed
POSTGRES_USER=findgloed
POSTGRES_PASSWORD=UDFYLD
DB_SSL_REJECT_UNAUTHORIZED=false

# Auth
BETTER_AUTH_SECRET=UDFYLD
JWT_SECRET=UDFYLD
ENCRYPTION_KEY=UDFYLD

# Admin
ADMIN_EMAILS=admin@findgloed.dk
SUPERADMIN_EMAIL=admin@findgloed.dk
SUPERADMIN_PASSWORD=UDFYLD

# Email (Resend)
RESEND_API_KEY=UDFYLD
RESEND_FROM_EMAIL=noreply@findgloed.dk
SUPPORT_EMAIL=support@findgloed.dk

# Waitlist
WAITLIST_CONFIRM_PATH=/waitlist/confirm
PARTNER_CONFIRM_PATH=/partner/confirm
WAITLIST_CONFIRM_TOKEN_TTL_HOURS=72
WAITLIST_RESEND_COOLDOWN_MINUTES=15

# Rate limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WAITLIST_MAX=5
RATE_LIMIT_WAITLIST_WINDOW_SECONDS=60
RATE_LIMIT_CONFIRM_MAX=10
RATE_LIMIT_CONFIRM_WINDOW_SECONDS=60

# Analytics (Umami)
UMAMI_APP_SECRET=UDFYLD

# Security
HSTS_MAX_AGE_SECONDS=31536000
```

Generer sikre secrets med:
```sh
openssl rand -base64 32 | tr -d '=+/' | head -c 32
```

---

## Trin 5 — Deploy

```sh
cd /opt/findgloed
docker compose -f docker-compose.prod.yml up -d --build
```

Services starter i rækkefølge: `db` → `redis` → `api` (migrationer køres automatisk) → `web`. Caddy henter TLS-certifikater fra Let's Encrypt automatisk ved opstart.

---

## Verifikation

```sh
# Tjek alle containers kører
docker compose -f docker-compose.prod.yml ps

# Tjek API health
curl https://api.findgloed.dk/api/health
# → {"ok":true}

# Tjek frontend
curl -I https://findgloed.dk
# → HTTP/2 200
```

---

## Opdater til ny version

```sh
cd /opt/findgloed
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Docker Compose genstarter kun de containers der er ændret.

---

## Fejlfinding

| Symptom | Løsning |
|---------|---------|
| Caddy giver 502 | DNS er ikke propageret endnu — tjek med `dig findgloed.dk` |
| TLS-fejl / certifikat mangler | Caddy prøver automatisk igen hvert minut — tjek logs med `docker compose logs caddy` |
| `api` starter ikke | Tjek logs: `docker compose -f docker-compose.prod.yml logs api` |
| Frontend kalder `localhost:4564` | `API_URL` var tom da imagen blev bygget — redeploy efter `.env` er sat |
| Migrationer fejler | Tjek alle `POSTGRES_*` vars er udfyldt korrekt |

### Se logs

```sh
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f caddy
```
