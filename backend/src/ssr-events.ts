import type { Hono } from "hono";
import { html, raw } from "hono/html";
import type { EventRecord, EventRepository } from "./events";

// SSR for /events og /events/:slug. Bevidst standalone fra React-SPA fordi:
// 1. Vi vil have ren HTML i første response (ingen JS-dependency)
// 2. Crawlers (Google, FB, ChatGPT, Perplexity) parser HTML direkte
// 3. Cover-image, JSON-LD, OG-tags, breadcrumbs bygges server-side fra db
//
// Tilmeldings-flow er gated: ikke-loggede ser "Log ind for at tilmelde" CTA;
// loggede brugere kan klikke direkte til /me/events/register?slug=… (eller
// vi kan tilføje session-detection senere).
//
// Cache-Control sættes til public,max-age=60,stale-while-revalidate=3600
// så hyppige requests fra crawlers ikke spammer db, men ændringer (ny event,
// status-ændring) propagerer inden for 1 time.

type SsrDeps = {
  eventRepository: EventRepository;
  appUrl: string;
};

const CATEGORY_LABEL: Record<string, string> = {
  single_only: "Kun singles",
  couple_only: "Kun par",
  mixed: "Singles og par"
};

const LEVEL_LABEL: Record<string, string> = {
  sensual_social: "Sanseligt-socialt",
  sensual: "Sensuelt",
  explicit: "Eksplicit"
};

const LEVEL_DESCRIPTION: Record<string, string> = {
  sensual_social:
    "Påklædt hele aftenen. Faciliterede øvelser i nærvær, kontakt og samtale.",
  sensual: "Behageligt tøj. Sanselige øvelser med tydelige rammer for kropskontakt.",
  explicit: "Eksplicitte rammer. Kun for medlemmer med tidligere event-erfaring."
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("da-DK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
}

function formatDateMachine(date: Date): string {
  // ISO 8601 med Europe/Copenhagen offset (+01:00 vinter, +02:00 sommer).
  // toISOString returnerer UTC — vi vil gerne have lokal tid for SEO.
  // Vi bruger toISOString + lader Google håndtere TZ-conversion.
  return date.toISOString();
}

function formatPrice(cents: number): string {
  const kr = cents / 100;
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(kr);
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trim() + "…";
}

function metaDescription(event: EventRecord): string {
  const firstParagraph = event.description.split("\n\n")[0] ?? event.description;
  return truncate(firstParagraph, 155);
}

function eventPath(slug: string): string {
  return `/events/${encodeURIComponent(slug)}`;
}

function pageShell(opts: {
  title: string;
  description: string;
  canonical: string;
  ogType?: string;
  jsonLd?: object[];
  body: ReturnType<typeof html>;
}) {
  const ogType = opts.ogType ?? "website";
  const jsonLdScripts =
    opts.jsonLd?.map(
      (obj) =>
        html`<script type="application/ld+json">${raw(JSON.stringify(obj))}</script>`
    ) ?? [];

  return html`<!doctype html>
<html lang="da">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${opts.title}</title>
    <meta name="description" content="${opts.description}" />
    <link rel="canonical" href="${opts.canonical}" />

    <meta property="og:title" content="${opts.title}" />
    <meta property="og:description" content="${opts.description}" />
    <meta property="og:type" content="${ogType}" />
    <meta property="og:url" content="${opts.canonical}" />
    <meta property="og:site_name" content="Glød" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${opts.title}" />
    <meta name="twitter:description" content="${opts.description}" />

    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="alternate icon" type="image/x-icon" href="/favicon.ico" />

    <style>
      :root {
        color-scheme: light;
        --ink: #2a201b;
        --ink-muted: #5f4e44;
        --rose: #c5615a;
        --warm: #f4ecdf;
        --warm-2: #ead9c2;
      }
      * { box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: linear-gradient(135deg, #f7eedf 0%, #ead5c2 100%);
        color: var(--ink);
        margin: 0;
        padding: 0;
        line-height: 1.6;
      }
      header {
        max-width: 960px;
        margin: 0 auto;
        padding: 2rem 1.5rem 1rem;
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 1rem;
      }
      header a.brand {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--rose);
        text-decoration: none;
      }
      header nav { display: flex; gap: 1.5rem; }
      header nav a {
        color: var(--ink-muted);
        text-decoration: none;
        font-size: 0.95rem;
      }
      header nav a:hover { color: var(--rose); }
      main {
        max-width: 960px;
        margin: 0 auto;
        padding: 1rem 1.5rem 4rem;
      }
      h1 {
        font-size: clamp(1.8rem, 4vw, 2.8rem);
        margin: 0.5rem 0 1rem;
        line-height: 1.2;
      }
      h2 {
        font-size: 1.4rem;
        margin: 2rem 0 0.5rem;
      }
      .kicker {
        text-transform: uppercase;
        letter-spacing: 0.15em;
        color: var(--rose);
        font-size: 0.75rem;
        font-weight: 600;
        margin: 0;
      }
      .breadcrumb {
        font-size: 0.85rem;
        color: var(--ink-muted);
        margin-bottom: 1rem;
      }
      .breadcrumb a {
        color: var(--ink-muted);
      }
      .card {
        background: rgba(255, 255, 255, 0.6);
        backdrop-filter: blur(10px);
        border-radius: 1.5rem;
        padding: 2rem;
        margin: 1.5rem 0;
        border: 1px solid rgba(255, 255, 255, 0.4);
      }
      .meta-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 1rem;
        margin: 1.5rem 0;
      }
      .meta-item label {
        display: block;
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--ink-muted);
        margin-bottom: 0.25rem;
      }
      .meta-item span { font-weight: 500; }
      .badges { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 1rem 0; }
      .badge {
        background: rgba(197, 97, 90, 0.15);
        color: var(--rose);
        padding: 0.3rem 0.75rem;
        border-radius: 1rem;
        font-size: 0.8rem;
        font-weight: 500;
      }
      .cta {
        display: inline-block;
        background: var(--rose);
        color: white;
        padding: 0.85rem 1.5rem;
        border-radius: 0.75rem;
        text-decoration: none;
        font-weight: 500;
        margin-top: 1rem;
        transition: transform 0.15s;
      }
      .cta:hover { transform: translateY(-1px); }
      .cta.secondary {
        background: transparent;
        color: var(--rose);
        border: 1px solid var(--rose);
      }
      .not-for {
        background: rgba(197, 97, 90, 0.08);
        border-left: 3px solid var(--rose);
        padding: 1rem 1.25rem;
        border-radius: 0.5rem;
        margin: 1.5rem 0;
        font-style: italic;
      }
      .event-list {
        display: grid;
        gap: 1rem;
        list-style: none;
        padding: 0;
        margin: 2rem 0;
      }
      .event-list a {
        display: block;
        background: rgba(255, 255, 255, 0.6);
        padding: 1.5rem;
        border-radius: 1rem;
        text-decoration: none;
        color: var(--ink);
        border: 1px solid rgba(255, 255, 255, 0.4);
        transition: transform 0.15s, box-shadow 0.15s;
      }
      .event-list a:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
      }
      .event-list h3 {
        margin: 0.25rem 0 0.5rem;
        font-size: 1.25rem;
      }
      .event-list .meta { color: var(--ink-muted); font-size: 0.9rem; }
      footer {
        max-width: 960px;
        margin: 0 auto;
        padding: 2rem 1.5rem;
        color: var(--ink-muted);
        font-size: 0.85rem;
        text-align: center;
      }
      footer nav { display: flex; gap: 1.25rem; justify-content: center; margin-top: 0.5rem; }
      footer a { color: var(--ink-muted); }
      p.empty {
        text-align: center;
        padding: 3rem 1rem;
        color: var(--ink-muted);
      }
      .description p { margin: 1rem 0; white-space: pre-wrap; }
    </style>
    ${raw(jsonLdScripts.map((h) => String(h)).join(""))}
  </head>
  <body>
    <header>
      <a href="/" class="brand">Glød</a>
      <nav>
        <a href="/events">Events</a>
        <a href="/vision">Vision</a>
        <a href="/code-of-conduct">Code of conduct</a>
        <a href="/login">Log ind</a>
        <a href="/signup">Bliv medlem</a>
      </nav>
    </header>
    <main>${opts.body}</main>
    <footer>
      <p>© Glød 2026</p>
      <nav>
        <a href="/privacy">Privatliv</a>
        <a href="/terms">Vilkår</a>
        <a href="/code-of-conduct">Code of conduct</a>
      </nav>
    </footer>
  </body>
</html>`;
}

function renderEventListing(events: EventRecord[], appUrl: string) {
  const canonical = `${appUrl}/events`;
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Glød", item: appUrl },
      { "@type": "ListItem", position: 2, name: "Events", item: canonical }
    ]
  };

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: events.slice(0, 25).map((event, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${appUrl}${eventPath(event.slug)}`,
      name: event.title
    }))
  };

  return pageShell({
    title: "Events for voksne — København & Aarhus | Glød",
    description:
      "Faciliterede aftener for voksne i samarbejde med Dansk Sexologisk Akademi. " +
      "Singles, par, mixed — sanseligt, sensuelt eller eksplicit. Klare rammer for samtykke.",
    canonical,
    jsonLd: [breadcrumbLd, itemListLd],
    body: html`
      <p class="kicker">BEGIVENHEDER</p>
      <h1>Voksne rum at mødes i</h1>
      <p>
        Faciliterede aftener i samarbejde med Dansk Sexologisk Akademi. Vælg
        event-type og niveau der passer dig. Tilmelding kræver medlemskab.
      </p>

      ${events.length === 0
        ? html`<p class="empty">
            Ingen events lige nu. Kom tilbage senere, eller
            <a href="/signup">skriv dig på ventelisten</a>.
          </p>`
        : html`
            <ul class="event-list">
              ${events.map(
                (event) => html`
                  <li>
                    <a href="${eventPath(event.slug)}">
                      <p class="kicker">${CATEGORY_LABEL[event.category] ?? event.category} · ${LEVEL_LABEL[event.level] ?? event.level}</p>
                      <h3>${event.title}</h3>
                      <p class="meta">
                        ${formatDate(event.starts_at)} · ${event.region}
                        · ${formatPrice(event.price_cents)}
                      </p>
                    </a>
                  </li>
                `
              )}
            </ul>
          `}

      <div class="card">
        <h2>Sådan virker det</h2>
        <p>
          Glød er for voksne der vil mødes via virkelige aftener, ikke
          dating-app-flade. Alle medlemmer er manuelt verificerede, og hver
          aften har klare rammer i vores
          <a href="/code-of-conduct">code of conduct</a>.
        </p>
        <a href="/signup" class="cta">Opret medlemskab</a>
        <a href="/login" class="cta secondary">Log ind</a>
      </div>
    `
  });
}

function renderEventDetail(event: EventRecord, registrations: number, appUrl: string) {
  const canonical = `${appUrl}${eventPath(event.slug)}`;
  const dateLabel = formatDate(event.starts_at);
  const title = `${event.title} — ${event.region} ${dateLabel} | Glød`;
  const description = metaDescription(event);
  const spotsLeft = Math.max(0, event.capacity - registrations);
  const isAvailable = spotsLeft > 0;

  const eventLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    startDate: formatDateMachine(event.starts_at),
    endDate: formatDateMachine(event.ends_at),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: event.location_label,
      address: {
        "@type": "PostalAddress",
        addressLocality: event.region,
        addressCountry: "DK"
      }
    },
    offers: {
      "@type": "Offer",
      price: (event.price_cents / 100).toFixed(2),
      priceCurrency: "DKK",
      availability: isAvailable
        ? "https://schema.org/InStock"
        : "https://schema.org/SoldOut",
      url: canonical,
      validFrom: formatDateMachine(new Date())
    },
    organizer: {
      "@type": "Organization",
      name: "Glød",
      url: appUrl
    },
    performer: event.facilitator_name
      ? {
          "@type": "Person",
          name: event.facilitator_name,
          ...(event.facilitator_credential ? { jobTitle: event.facilitator_credential } : {})
        }
      : undefined
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Glød", item: appUrl },
      { "@type": "ListItem", position: 2, name: "Events", item: `${appUrl}/events` },
      { "@type": "ListItem", position: 3, name: event.title, item: canonical }
    ]
  };

  return pageShell({
    title,
    description,
    canonical,
    ogType: "event",
    jsonLd: [eventLd, breadcrumbLd],
    body: html`
      <p class="breadcrumb">
        <a href="/">Glød</a> /
        <a href="/events">Events</a> /
        ${event.title}
      </p>
      <p class="kicker">
        ${CATEGORY_LABEL[event.category] ?? event.category} ·
        ${LEVEL_LABEL[event.level] ?? event.level}
      </p>
      <h1>${event.title}</h1>

      <div class="badges">
        <span class="badge">${formatDate(event.starts_at)}</span>
        <span class="badge">${formatTime(event.starts_at)}–${formatTime(event.ends_at)}</span>
        <span class="badge">${event.region}</span>
        <span class="badge">${formatPrice(event.price_cents)}</span>
        ${event.beginner_friendly
          ? html`<span class="badge">Begynder-friendly</span>`
          : ""}
        ${event.experience_required
          ? html`<span class="badge">Tidligere erfaring kræves</span>`
          : ""}
        ${!isAvailable ? html`<span class="badge">Udsolgt</span>` : ""}
      </div>

      <div class="card">
        <div class="description">
          ${event.description.split("\n\n").map((p) => html`<p>${p}</p>`)}
        </div>

        ${event.not_for
          ? html`
              <div class="not-for">
                <strong>Ikke for dig hvis:</strong> ${event.not_for}
              </div>
            `
          : ""}

        <div class="meta-grid">
          ${event.facilitator_name
            ? html`
                <div class="meta-item">
                  <label>Facilitator</label>
                  <span>${event.facilitator_name}</span>
                  ${event.facilitator_credential
                    ? html`<br /><small style="color: var(--ink-muted);"
                        >${event.facilitator_credential}</small
                      >`
                    : ""}
                </div>
              `
            : ""}
          ${event.dresscode
            ? html`
                <div class="meta-item">
                  <label>Dresscode</label>
                  <span>${event.dresscode}</span>
                </div>
              `
            : ""}
          <div class="meta-item">
            <label>Lokation</label>
            <span>${event.location_label}</span>
            <br /><small style="color: var(--ink-muted);"
              >Adresse oplyses efter tilmelding</small
            >
          </div>
          <div class="meta-item">
            <label>Pladser tilbage</label>
            <span>${spotsLeft} af ${event.capacity}</span>
          </div>
        </div>

        ${event.exit_strategy
          ? html`
              <p style="color: var(--ink-muted); font-size: 0.9rem;">
                <strong>Exit-strategi:</strong> ${event.exit_strategy}
              </p>
            `
          : ""}

        ${isAvailable
          ? html`
              <a href="/login?next=${encodeURIComponent(eventPath(event.slug))}" class="cta">
                Log ind for at tilmelde
              </a>
              <a href="/signup" class="cta secondary">Opret medlemskab</a>
            `
          : html`<p><strong>Eventet er udsolgt.</strong> Tilmeld dig
              <a href="/events">andre events</a> eller
              <a href="/signup">opret en konto</a> så du får besked om næste runde.</p>`}
      </div>

      <p style="color: var(--ink-muted); font-size: 0.9rem;">
        Læs vores
        <a href="/code-of-conduct#${event.level}">code of conduct for ${LEVEL_LABEL[event.level] ?? event.level}-events</a>
        før du tilmelder dig. ${LEVEL_DESCRIPTION[event.level] ?? ""}
      </p>
    `
  });
}

// Accepter generisk Hono-app — kalderen kan have egne Variables/Bindings.
// Vi bruger ikke ctx.set/get her, så env-typen er irrelevant for runtime,
// kun for TypeScripts type-narrowing.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerEventsSsr(app: Hono<any, any, any>, deps: SsrDeps): void {
  const { eventRepository, appUrl } = deps;
  const cacheControl = "public, max-age=60, stale-while-revalidate=3600";

  app.get("/events", async (c) => {
    const { items: events } = await eventRepository.list({
      upcomingOnly: true,
      limit: 50,
      offset: 0
    });
    const published = events.filter((e) => e.status === "published");
    c.header("Cache-Control", cacheControl);
    c.header("Content-Type", "text/html; charset=utf-8");
    return c.body(String(await renderEventListing(published, appUrl)));
  });

  app.get("/events/:slug", async (c) => {
    const slug = c.req.param("slug");
    const event = await eventRepository.getBySlug(slug);
    if (!event || event.status !== "published") {
      c.header("Cache-Control", "no-store");
      return c.notFound();
    }
    const count = await eventRepository.countConfirmed(event.id);
    c.header("Cache-Control", cacheControl);
    c.header("Content-Type", "text/html; charset=utf-8");
    return c.body(String(await renderEventDetail(event, count, appUrl)));
  });
}
