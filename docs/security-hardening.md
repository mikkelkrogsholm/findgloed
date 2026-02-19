# Security Hardening (MVP Baseline)

## Formål
Denne opskrift beskriver den sikkerhedsbaseline, der skal gælde i både app og reverse proxy for fase-1.

## App-level baseline
Backend svarer med følgende headers på API-svar:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'`

Yderligere:
- `Cache-Control: no-store` på `GET /api/waitlist/confirm`.
- `Strict-Transport-Security` sættes kun når `ENABLE_HSTS=true` og request vurderes som HTTPS.

## CORS governance
- `CORS_ORIGINS` er en komma-separeret allowlist.
- I produktion må appen ikke starte uden sat allowlist.
- Requests med `Origin` udenfor allowlist afvises.
- `OPTIONS` håndteres eksplicit med tilladte metoder/headers.

## Rate limiting
- Redis er eneste limiter-store i MVP.
- Endpoints:
  - `POST /api/waitlist`
  - `GET /api/waitlist/confirm`
- Fixed-window med `INCR + EXPIRE`.
- `TRUST_PROXY=true` kræves for at bruge forwarded IP-headere bag Traefik.

## Proxy (Traefik/Coolify) - anbefalet opsætning
Proxy skal være mindst lige så streng som appen:
1. Tving HTTPS redirect.
2. Sæt security headers centralt (samme baseline som app, evt. strammere CSP).
3. Aktiver HSTS i prod.
4. Forward korrekt client IP/proto (`X-Forwarded-For`, `X-Forwarded-Proto`).
5. Tillad kun de forventede hostnames/origins.

## Konfliktregel (app vs proxy)
- Proxy er "strammest".
- App fungerer som fallback baseline.
- Hvis policies divergerer, skal proxy-policy vinde i produktion.

## Driftscheckliste
1. `TRUST_PROXY=true` i prod.
2. `CORS_ORIGINS` sat til canonical domæner.
3. `ENABLE_HSTS=true` i prod.
4. `RATE_LIMIT_FAIL_OPEN=false` i prod.
5. Redis health monitoreret.
