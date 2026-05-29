import type { Hono } from "hono";
import { html } from "hono/html";
import type { EventRecord } from "./events";
import type { OrganizationRecord, OrganizationRepository } from "./organization";
import {
  CATEGORY_LABEL,
  LEVEL_LABEL,
  eventPath,
  formatDate,
  formatPrice,
  pageShell
} from "./ssr-events";

// SSR for /organizations og /organizations/:slug — standalone HTML (samme
// mønster som ssr-events): SEO-venlig, server-renderet fra db, ingen JS-
// dependency. Caddy router disse paths til api-containeren.

type SsrDeps = {
  organizationRepository: OrganizationRepository;
  appUrl: string;
  apiUrl: string;
};

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trim() + "…";
}

function orgPath(slug: string): string {
  return `/organizations/${encodeURIComponent(slug)}`;
}

function logoUrl(apiUrl: string, slug: string): string {
  return `${apiUrl.replace(/\/+$/, "")}/api/public/organizations/${encodeURIComponent(slug)}/logo`;
}

function renderListing(orgs: OrganizationRecord[], appUrl: string, apiUrl: string) {
  const canonical = `${appUrl}/organizations`;
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Glød", item: appUrl },
      { "@type": "ListItem", position: 2, name: "Arrangører", item: canonical }
    ]
  };
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: orgs.slice(0, 50).map((org, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${appUrl}${orgPath(org.slug)}`,
      name: org.name
    }))
  };

  return pageShell({
    title: "Arrangører — klubber og fagpersoner bag Gløds events | Glød",
    description:
      "Organisationerne bag Gløds events: klubber, fagpersoner og fællesskaber " +
      "der skaber rammer for nærvær og sanselighed for voksne.",
    canonical,
    jsonLd: [breadcrumbLd, itemListLd],
    body: html`
      <p class="kicker">ARRANGØRER</p>
      <h1>Arrangører</h1>
      <p>
        Organisationerne bag Gløds events — klubber, fagpersoner og fællesskaber
        der skaber rammer for nærvær og sanselighed.
      </p>

      ${orgs.length === 0
        ? html`<p class="empty">Ingen arrangører endnu.</p>`
        : html`
            <ul class="event-list">
              ${orgs.map(
                (org) => html`
                  <li>
                    <a href="${orgPath(org.slug)}">
                      ${org.logo_path
                        ? html`<img
                            src="${logoUrl(apiUrl, org.slug)}"
                            alt="${org.name}"
                            width="56"
                            height="56"
                            style="border-radius:0.75rem;object-fit:cover;float:left;margin-right:1rem;"
                          />`
                        : ""}
                      <h3>${org.name}</h3>
                      <p class="meta">${org.region ?? "Danmark"}</p>
                      ${org.description
                        ? html`<p class="meta">${truncate(org.description, 120)}</p>`
                        : ""}
                    </a>
                  </li>
                `
              )}
            </ul>
          `}
    `
  });
}

function renderDetail(
  org: OrganizationRecord,
  events: EventRecord[],
  appUrl: string,
  apiUrl: string
) {
  const canonical = `${appUrl}${orgPath(org.slug)}`;
  const description = org.description
    ? truncate(org.description, 155)
    : `${org.name} — arrangør på Glød.`;

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: org.name,
    url: canonical,
    ...(org.description ? { description: org.description } : {}),
    ...(org.region ? { areaServed: org.region } : {}),
    ...(org.logo_path ? { logo: logoUrl(apiUrl, org.slug) } : {})
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Glød", item: appUrl },
      { "@type": "ListItem", position: 2, name: "Arrangører", item: `${appUrl}/organizations` },
      { "@type": "ListItem", position: 3, name: org.name, item: canonical }
    ]
  };

  return pageShell({
    title: `${org.name} — arrangør | Glød`,
    description,
    canonical,
    ogType: "website",
    jsonLd: [orgLd, breadcrumbLd],
    body: html`
      <p class="breadcrumb">
        <a href="/">Glød</a> /
        <a href="/organizations">Arrangører</a> /
        ${org.name}
      </p>
      ${org.logo_path
        ? html`<img
            src="${logoUrl(apiUrl, org.slug)}"
            alt="${org.name}"
            width="96"
            height="96"
            style="border-radius:1rem;object-fit:cover;margin-bottom:1rem;"
          />`
        : ""}
      <p class="kicker">ARRANGØR</p>
      <h1>${org.name}</h1>
      ${org.region ? html`<p>${org.region}</p>` : ""}

      ${org.description
        ? html`<div class="description">
            ${org.description.split("\n\n").map((p) => html`<p>${p}</p>`)}
          </div>`
        : ""}

      <h2>Kommende events</h2>
      ${events.length === 0
        ? html`<p class="empty">Ingen kommende events lige nu.</p>`
        : html`
            <ul class="event-list">
              ${events.map(
                (event) => html`
                  <li>
                    <a href="${eventPath(event.slug)}">
                      <p class="kicker">
                        ${CATEGORY_LABEL[event.category] ?? event.category} ·
                        ${LEVEL_LABEL[event.level] ?? event.level}
                      </p>
                      <h3>${event.title}</h3>
                      <p class="meta">
                        ${formatDate(event.starts_at)} · ${event.region ?? "Danmark"}
                        · ${formatPrice(event.price_cents)}
                      </p>
                    </a>
                  </li>
                `
              )}
            </ul>
          `}
    `
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerOrganizationsSsr(app: Hono<any, any, any>, deps: SsrDeps): void {
  const { organizationRepository, appUrl, apiUrl } = deps;
  const cacheControl = "public, max-age=60, stale-while-revalidate=3600";

  app.get("/organizations", async (c) => {
    const { items } = await organizationRepository.listPublic({ limit: 100, offset: 0 });
    c.header("Cache-Control", cacheControl);
    c.header("Content-Type", "text/html; charset=utf-8");
    return c.body(String(await renderListing(items, appUrl, apiUrl)));
  });

  app.get("/organizations/:slug", async (c) => {
    const org = await organizationRepository.getPublicBySlug(c.req.param("slug"));
    if (!org) {
      c.header("Cache-Control", "no-store");
      return c.notFound();
    }
    const events = await organizationRepository.listPublishedEventsForOrg(org.id, { limit: 50 });
    c.header("Cache-Control", cacheControl);
    c.header("Content-Type", "text/html; charset=utf-8");
    return c.body(String(await renderDetail(org, events, appUrl, apiUrl)));
  });
}
