import { describe, expect, test } from "bun:test";
import { Hono } from "hono";

import {
  registerArticleSearchRoutes,
  type ArticleSearchService
} from "../src/article-search";

function createSearchApp(searchService: ArticleSearchService) {
  const app = new Hono();
  registerArticleSearchRoutes(app, { searchService });
  return app;
}

describe("GET /api/search/articles", () => {
  test("requires a meaningful query", async () => {
    const app = createSearchApp({
      search: async () => ({ items: [], estimatedTotalHits: 0, processingTimeMs: 0 })
    });

    const response = await app.request("/api/search/articles?q=a");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      code: "INVALID_QUERY",
      message: "Søgningen skal indeholde mindst 2 tegn."
    });
  });

  test("normalizes options and returns the public result contract", async () => {
    const calls: Array<{ query: string; cluster?: string; limit: number }> = [];
    const app = createSearchApp({
      search: async (query, options) => {
        calls.push({ query, ...options });
        return {
          items: [
            {
              id: "hvad-er-en-munch",
              title: "Hvad er en BDSM-munch?",
              excerpt: "En rolig introduktion.",
              contentCluster: "faellesskab-events-deltagelse",
              contentType: "guide",
              canonicalUrl: "/viden/bdsm-faellesskab-events/hvad-er-en-munch/",
              updated: "2026-07-26",
              readingMinutes: 12
            }
          ],
          estimatedTotalHits: 1,
          processingTimeMs: 2
        };
      }
    });

    const response = await app.request(
      "/api/search/articles?q=%20munch%20&cluster=faellesskab-events-deltagelse&limit=999"
    );

    expect(response.status).toBe(200);
    expect(calls).toEqual([
      {
        query: "munch",
        cluster: "faellesskab-events-deltagelse",
        limit: 20
      }
    ]);
    expect(await response.json()).toEqual({
      ok: true,
      items: [
        {
          id: "hvad-er-en-munch",
          title: "Hvad er en BDSM-munch?",
          excerpt: "En rolig introduktion.",
          content_cluster: "faellesskab-events-deltagelse",
          content_type: "guide",
          canonical_url: "/viden/bdsm-faellesskab-events/hvad-er-en-munch/",
          updated: "2026-07-26",
          reading_minutes: 12
        }
      ],
      meta: {
        query: "munch",
        estimated_total_hits: 1,
        processing_time_ms: 2,
        limit: 20
      }
    });
  });

  test("rejects unsafe cluster filters", async () => {
    const app = createSearchApp({
      search: async () => ({ items: [], estimatedTotalHits: 0, processingTimeMs: 0 })
    });

    const response = await app.request(
      "/api/search/articles?q=munch&cluster=events%20OR%20status%20%3D%20draft"
    );

    expect(response.status).toBe(422);
    expect((await response.json()).code).toBe("INVALID_CLUSTER");
  });

  test("returns a stable error when the search engine is unavailable", async () => {
    const app = createSearchApp({
      search: async () => {
        throw new Error("connection refused");
      }
    });

    const response = await app.request("/api/search/articles?q=munch");

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      code: "SEARCH_UNAVAILABLE",
      message: "Søgningen er midlertidigt utilgængelig. Prøv igen om lidt."
    });
  });
});
