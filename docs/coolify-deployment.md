# Coolify Deployment Guide

Domæner og TLS er konfigureret direkte i `docker-compose.prod.yml` via Traefik-labels. Der er ingen manuel domain-konfiguration i Coolify UI.

---

## Trin 1 — Opret application

1. Coolify dashboard → **+ New Resource** → **Docker Compose**
2. Vælg repo og branch: `main`
3. **Docker Compose Location**: `docker-compose.prod.yml`
4. Klik **Save**

---

## Trin 2 — Sæt environment variables

Klik **Environment Variables** → **Bulk Edit** og indsæt:

### Production

```
APP_URL=$SERVICE_URL_WEB
API_URL=$SERVICE_URL_API
BETTER_AUTH_URL=$SERVICE_URL_API
CORS_ORIGINS=$SERVICE_URL_WEB
POSTGRES_DB=findgloed
POSTGRES_USER=findgloed
POSTGRES_PASSWORD=UDFYLD
DB_SSL_REJECT_UNAUTHORIZED=true
BETTER_AUTH_SECRET=UDFYLD
JWT_SECRET=UDFYLD
ENCRYPTION_KEY=UDFYLD
ADMIN_EMAILS=admin@findgloed.dk
SUPERADMIN_EMAIL=admin@findgloed.dk
SUPERADMIN_PASSWORD=UDFYLD
RESEND_API_KEY=UDFYLD
RESEND_FROM_EMAIL=noreply@findgloed.dk
SUPPORT_EMAIL=support@findgloed.dk
WAITLIST_CONFIRM_PATH=/waitlist/confirm
PARTNER_CONFIRM_PATH=/partner/confirm
WAITLIST_CONFIRM_TOKEN_TTL_HOURS=72
WAITLIST_RESEND_COOLDOWN_MINUTES=15
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WAITLIST_MAX=5
RATE_LIMIT_WAITLIST_WINDOW_SECONDS=60
RATE_LIMIT_CONFIRM_MAX=10
RATE_LIMIT_CONFIRM_WINDOW_SECONDS=60
HSTS_MAX_AGE_SECONDS=31536000
```

### Preview

```
APP_URL=$SERVICE_URL_WEB
API_URL=$SERVICE_URL_API
BETTER_AUTH_URL=$SERVICE_URL_API
CORS_ORIGINS=$SERVICE_URL_WEB
POSTGRES_DB=findgloed
POSTGRES_USER=findgloed
POSTGRES_PASSWORD=UDFYLD
DB_SSL_REJECT_UNAUTHORIZED=false
BETTER_AUTH_SECRET=UDFYLD
JWT_SECRET=UDFYLD
ENCRYPTION_KEY=UDFYLD
ADMIN_EMAILS=admin@findgloed.dk
SUPERADMIN_EMAIL=admin@findgloed.dk
SUPERADMIN_PASSWORD=UDFYLD
RESEND_API_KEY=UDFYLD
RESEND_FROM_EMAIL=noreply@findgloed.dk
SUPPORT_EMAIL=support@findgloed.dk
WAITLIST_CONFIRM_PATH=/waitlist/confirm
PARTNER_CONFIRM_PATH=/partner/confirm
WAITLIST_CONFIRM_TOKEN_TTL_HOURS=72
WAITLIST_RESEND_COOLDOWN_MINUTES=15
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WAITLIST_MAX=5
RATE_LIMIT_WAITLIST_WINDOW_SECONDS=60
RATE_LIMIT_CONFIRM_MAX=10
RATE_LIMIT_CONFIRM_WINDOW_SECONDS=60
HSTS_MAX_AGE_SECONDS=31536000
```

---

## Trin 3 — Deploy

Klik **Deploy**. Det er det.

Services starter i rækkefølge: `db` → `redis` → `api` (migrationer køres automatisk) → `web`.

---

## Verifikation

```sh
curl https://api.findgloed.dk/api/health
# → {"ok":true}

curl -I https://findgloed.dk
# → HTTP/2 200
```

---

## Fejlfinding

| Symptom | Løsning |
|---------|---------|
| Traefik giver 404/502 | Tjek at Coolify's proxy-network hedder `coolify` — se **Proxy Settings** i Coolify |
| TLS-fejl / certifikat mangler | Tjek at `letsencrypt` er dit certresolver-navn i **Proxy → Traefik** |
| `api` starter ikke | `POSTGRES_PASSWORD` er sandsynligvis forkert eller db healthcheck fejler |
| Frontend kalder `localhost:4564` | `API_URL` var tom da imagen blev bygget — redeploy efter env vars er sat |
| Migrationer fejler | `DATABASE_URL` bygges fra `POSTGRES_*` — tjek alle tre er udfyldt |
