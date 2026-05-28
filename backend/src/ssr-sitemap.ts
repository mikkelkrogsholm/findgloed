import type { Hono } from "hono";
import type { EventRepository } from "./events";

// Sitemap + robots.txt. Serveres af samme api-container som SSR-eventene.

type SitemapDeps = {
  eventRepository: EventRepository;
  appUrl: string;
};

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Statiske offentlige pages — opdateres når vi tilføjer flere.
const STATIC_PAGES: Array<{
  path: string;
  changefreq: string;
  priority: string;
}> = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/vision", changefreq: "monthly", priority: "0.7" },
  { path: "/code-of-conduct", changefreq: "monthly", priority: "0.6" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/events", changefreq: "daily", priority: "0.9" }
];

// Accepter generisk Hono-app — kalderen kan have egne Variables/Bindings.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerSitemapRoutes(app: Hono<any, any, any>, deps: SitemapDeps): void {
  const { eventRepository, appUrl } = deps;
  const baseUrl = appUrl.replace(/\/+$/, "");

  app.get("/sitemap.xml", async (c) => {
    const { items: events } = await eventRepository.list({
      upcomingOnly: false, // Inkludér også afsluttede events — de har stadig SEO-værdi
      limit: 1000,
      offset: 0
    });
    const published = events.filter((e) => e.status === "published");

    const staticEntries = STATIC_PAGES.map(
      (page) =>
        `  <url>\n` +
        `    <loc>${xmlEscape(baseUrl + page.path)}</loc>\n` +
        `    <changefreq>${page.changefreq}</changefreq>\n` +
        `    <priority>${page.priority}</priority>\n` +
        `  </url>`
    ).join("\n");

    const eventEntries = published
      .map((event) => {
        const lastmod = event.starts_at.toISOString(); // Vi har ikke updated_at — bruger starts_at som best effort
        return (
          `  <url>\n` +
          `    <loc>${xmlEscape(baseUrl + "/events/" + event.slug)}</loc>\n` +
          `    <lastmod>${lastmod}</lastmod>\n` +
          `    <changefreq>weekly</changefreq>\n` +
          `    <priority>0.8</priority>\n` +
          `  </url>`
        );
      })
      .join("\n");

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      staticEntries +
      "\n" +
      eventEntries +
      "\n" +
      `</urlset>\n`;

    c.header("Content-Type", "application/xml; charset=utf-8");
    c.header("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
    return c.body(xml);
  });

  app.get("/robots.txt", async (c) => {
    const lines = [
      "User-agent: *",
      "Allow: /",
      "Allow: /events",
      "Allow: /events/",
      "Allow: /vision",
      "Allow: /code-of-conduct",
      "Allow: /privacy",
      "Allow: /terms",
      "",
      "# Private/authenticated områder",
      "Disallow: /admin",
      "Disallow: /admin/",
      "Disallow: /me",
      "Disallow: /me/",
      "Disallow: /messages",
      "Disallow: /messages/",
      "Disallow: /interests",
      "Disallow: /interests/",
      "Disallow: /profile",
      "Disallow: /profile/",
      "Disallow: /onboarding",
      "Disallow: /onboarding/",
      "Disallow: /signup",
      "Disallow: /login",
      "Disallow: /membership",
      "Disallow: /partner/",
      "Disallow: /waitlist/",
      "",
      `Sitemap: ${baseUrl}/sitemap.xml`,
      ""
    ];

    c.header("Content-Type", "text/plain; charset=utf-8");
    c.header("Cache-Control", "public, max-age=3600");
    return c.body(lines.join("\n"));
  });
}
