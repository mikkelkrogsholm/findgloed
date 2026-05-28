# SEO-design for events

**Dato:** 27. maj 2026
**Status:** Live (PR forventet samme dag)
**Mål:** Hvert event har sin egen "verdens-bedste-SEO" landing page der ranker
på danske long-tail søgninger som "intim aften København", "events for par
Aarhus", "code-of-conduct event sexolog".

## Hvorfor SSR

Glød er en Vite SPA. Google's renderer kan køre JS, men:

- Indexing er **langsommere** (uger frem for timer)
- Social-sharing previews (Facebook, LinkedIn, Slack) **renderer ikke JS** →
  uden SSR har vi tom og:title/description når et event deles
- AI-søgemaskiner (ChatGPT search, Perplexity, Claude) **renderer ofte ikke JS**

Løsning: server-side render kun for `/events` og `/events/:slug`. Resten af
appen forbliver SPA.

## URL-struktur

| Path | Indhold | Server | Auth |
|------|---------|--------|------|
| `/events` | Listing-side, alle published events | Hono SSR | Public |
| `/events/:slug` | Event-detail, public-safe felter | Hono SSR | Public |
| `/me/events` | Brugerens tilmeldinger | React SPA | Auth required |
| `/admin/events` | Admin-CRUD | React SPA | Admin required |

Slugs er allerede menneske-læselige: `intim-aabning-koebenhavn`,
`aerlig-aften-for-par` osv.

## Public vs gated content

### Public (synligt i SSR HTML — Google ser det)

- Titel, beskrivelse, `not_for`-tekst
- Kategori (Singles/Par/Mixed) + niveau (sanseligt-socialt/sensuelt/eksplicit)
- Dato, varighed, region (København/Aarhus)
- **Facilitator-navn + credentials** ("Sexolog, Sexologisk Akademi") — kritisk
  for E-A-T (Expertise/Authority/Trust)
- Pris
- Dresscode + exit-strategi
- "Begynder-friendly" badge
- "Erfaring kræves" badge
- Link til Code of Conduct for niveauet
- "X pladser tilbage" eller "Udsolgt"
- Breadcrumb: Glød > Events > [Event-titel]

### Gated (kun synlig efter login)

- Tilmeldings-knap → erstattet med "Log ind for at tilmelde" CTA
- Eksakt adresse → "Adresse oplyses 24 timer før eventet"
  (det er allerede sådan i seed-data, vi gentager bare)
- Event-thread/kommentarer
- Deltagerliste (vises aldrig)
- "Mine tilmeldinger"-link

## Teknisk implementering

### Backend

**Public API endpoints** (uden auth):
- `GET /api/public/events` — liste, samme filtre som `/api/events` minus capacity-info pr. user
- `GET /api/public/events/:slug` — detail, kun public-safe felter

**SSR routes på Hono:**
- `GET /events` — returnerer HTML
- `GET /events/:slug` — returnerer HTML eller 404

Renderer med `hono/html` (template-tag, ingen ekstra deps).

**Sitemap + robots:**
- `GET /sitemap.xml` — auto-genereret fra alle published events + statiske pages
- `GET /robots.txt` — allow public, disallow private

### Caddy routing

```
findgloed.dk {
  # SSR-paths først (specifik > generel)
  @ssr path /events /events/* /sitemap.xml /robots.txt
  reverse_proxy @ssr api:39564

  # Resten = React SPA
  reverse_proxy web:80
}
```

### JSON-LD Event-schema (på `/events/:slug`)

```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Intim åbning — en aften om nærvær",
  "description": "...",
  "startDate": "2026-06-07T19:00:00+02:00",
  "endDate": "2026-06-07T22:00:00+02:00",
  "eventStatus": "https://schema.org/EventScheduled",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "location": {
    "@type": "Place",
    "name": "Indre by, København",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "København",
      "addressCountry": "DK"
    }
  },
  "offers": {
    "@type": "Offer",
    "price": "495.00",
    "priceCurrency": "DKK",
    "availability": "https://schema.org/InStock",
    "url": "https://findgloed.dk/events/intim-aabning-koebenhavn"
  },
  "organizer": {
    "@type": "Organization",
    "name": "Glød",
    "url": "https://findgloed.dk"
  },
  "performer": {
    "@type": "Person",
    "name": "Mette Kristensen",
    "jobTitle": "Sexolog, Sexologisk Akademi"
  }
}
```

### Meta-tags (på hver event-detail)

```html
<title>{event.title} — {region} {dato} | Glød</title>
<meta name="description" content="{event.description første 155 tegn}">
<link rel="canonical" href="https://findgloed.dk/events/{slug}">

<!-- OG -->
<meta property="og:title" content="{event.title}">
<meta property="og:description" content="...">
<meta property="og:type" content="event">
<meta property="og:url" content="https://findgloed.dk/events/{slug}">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{event.title}">
<meta name="twitter:description" content="...">
```

### BreadcrumbList JSON-LD

På både `/events` og `/events/:slug` — hjælper Google forstå hierarkiet.

### Sitemap.xml struktur

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://findgloed.dk/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://findgloed.dk/vision</loc>
    <changefreq>monthly</changefreq>
  </url>
  <url>
    <loc>https://findgloed.dk/code-of-conduct</loc>
    <changefreq>monthly</changefreq>
  </url>
  <url>
    <loc>https://findgloed.dk/events</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <!-- Hver published event: -->
  <url>
    <loc>https://findgloed.dk/events/{slug}</loc>
    <lastmod>{event.updated_at}</lastmod>
    <priority>0.8</priority>
  </url>
</urlset>
```

### Robots.txt

```
User-agent: *
Allow: /
Allow: /events
Allow: /events/
Allow: /vision
Allow: /code-of-conduct
Allow: /privacy
Allow: /terms
Disallow: /admin
Disallow: /admin/
Disallow: /me
Disallow: /me/
Disallow: /messages
Disallow: /messages/
Disallow: /interests
Disallow: /interests/
Disallow: /profile
Disallow: /profile/
Disallow: /signup
Disallow: /login
Disallow: /membership

Sitemap: https://findgloed.dk/sitemap.xml
```

## Hvorfor SSR Hono og ikke en pre-rendering-service?

- **Pre-render-services** (Prerender.io, Rendertron) kræver eksternt setup
  og introducerer en cache-invalidering-problem (events ændrer sig)
- **Caddy on-demand-TLS + reverse-proxy** kan rute path-baseret uden ekstra
  infrastructure
- **Hono kører allerede i vores stack** — ingen ny container, ingen ny secret,
  ingen ny deploy-pipeline
- HTML er bygget fra samme datakilde som SPA (db) — ingen risiko for
  drift mellem SSR-version og live-data

## Performance-overvejelser

- SSR HTML er **mindre end SPA-bundle** for første load (~10-30 KB vs ~200 KB)
- Vi cacher ikke output i Caddy — events ændrer sig (titel-edit, capacity,
  status). Cache-Control: `public, max-age=60, stale-while-revalidate=3600`
  giver Caddy frihed til at servere stale i op til en time mens vi reloader
- N+1 er ikke et problem — vi har `listEvents` allerede batcher
- Performance budget: TTFB under 200ms (lokal db), Largest Contentful Paint
  under 1s

## Test-strategi

- Curl med `User-Agent: Googlebot/2.1` skal returnere komplet HTML uden JS
- `curl https://findgloed.dk/events/X | grep '"@context"'` skal vise JSON-LD
- Facebook Sharing Debugger (developers.facebook.com/tools/debug) skal vise
  korrekt OG-preview
- Google Rich Results Test (search.google.com/test/rich-results) skal validere
  Event-schema
- Sitemap.xml skal validere på xml-sitemaps.com/validate

## Out of scope (kan komme senere)

- Cover-images til hvert event (vi har `cover_path` i schema men ikke uploads)
- Region-specifikke landing pages (`/events/koebenhavn`, `/events/aarhus`)
- Tag-baseret discovery (`/events/par-only`, `/events/begyndere`)
- AMP-versioner
- Internationalisering (`hreflang`)
- Cover-images til facilitator-profiler (E-A-T-boost)

Disse kan tages som separate optimeringer når trafik viser hvor folk søger.
