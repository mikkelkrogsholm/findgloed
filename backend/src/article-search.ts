import type { Hono } from "hono";

export type ArticleSearchItem = {
  id: string;
  title: string;
  excerpt: string;
  contentCluster: string;
  contentType: string;
  canonicalUrl: string;
  updated: string;
  readingMinutes: number;
};

export type ArticleSearchResult = {
  items: ArticleSearchItem[];
  estimatedTotalHits: number;
  processingTimeMs: number;
};

export type ArticleSearchService = {
  search: (
    query: string,
    options: { cluster?: string; limit: number }
  ) => Promise<ArticleSearchResult>;
};

type MeilisearchHit = {
  id?: unknown;
  title?: unknown;
  excerpt?: unknown;
  content_cluster?: unknown;
  content_type?: unknown;
  canonical_url?: unknown;
  updated?: unknown;
  reading_minutes?: unknown;
};

type MeilisearchResponse = {
  hits?: unknown;
  estimatedTotalHits?: unknown;
  processingTimeMs?: unknown;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNonNegativeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function asSearchItem(value: unknown): ArticleSearchItem | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const hit = value as MeilisearchHit;
  const id = asString(hit.id);
  const title = asString(hit.title);
  const canonicalUrl = asString(hit.canonical_url);
  if (!id || !title || !canonicalUrl.startsWith("/viden/")) {
    return null;
  }

  return {
    id,
    title,
    excerpt: asString(hit.excerpt),
    contentCluster: asString(hit.content_cluster),
    contentType: asString(hit.content_type) || "guide",
    canonicalUrl,
    updated: asString(hit.updated),
    readingMinutes: asNonNegativeNumber(hit.reading_minutes)
  };
}

export class MeilisearchArticleSearch implements ArticleSearchService {
  constructor(
    private readonly options: {
      host: string;
      apiKey: string;
      indexUid?: string;
      timeoutMs?: number;
    }
  ) {}

  async search(
    query: string,
    options: { cluster?: string; limit: number }
  ): Promise<ArticleSearchResult> {
    const indexUid = this.options.indexUid ?? "articles";
    const response = await fetch(
      `${this.options.host.replace(/\/$/u, "")}/indexes/${encodeURIComponent(indexUid)}/search`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          q: query,
          limit: options.limit,
          filter: options.cluster
            ? `content_cluster = "${options.cluster}"`
            : undefined,
          attributesToRetrieve: [
            "id",
            "title",
            "excerpt",
            "content_cluster",
            "content_type",
            "canonical_url",
            "updated",
            "reading_minutes"
          ],
          attributesToHighlight: ["title", "excerpt"],
          showRankingScore: false
        }),
        signal: AbortSignal.timeout(this.options.timeoutMs ?? 2_500)
      }
    );

    if (!response.ok) {
      throw new Error(`Meilisearch returned ${response.status}`);
    }

    const payload = (await response.json()) as MeilisearchResponse;
    const hits = Array.isArray(payload.hits) ? payload.hits : [];

    return {
      items: hits.map(asSearchItem).filter((item): item is ArticleSearchItem => item !== null),
      estimatedTotalHits: asNonNegativeNumber(payload.estimatedTotalHits),
      processingTimeMs: asNonNegativeNumber(payload.processingTimeMs)
    };
  }
}

export function registerArticleSearchRoutes(
  // Route registreres også på app-varianter med egne context variables.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app: Hono<any, any, any>,
  deps: {
    searchService: ArticleSearchService;
  }
): void {
  app.get("/api/search/articles", async (c) => {
    const query = (c.req.query("q") ?? "").trim();
    if (query.length < 2) {
      return c.json(
        {
          ok: false,
          code: "INVALID_QUERY",
          message: "Søgningen skal indeholde mindst 2 tegn."
        },
        400
      );
    }

    if (query.length > 120) {
      return c.json(
        {
          ok: false,
          code: "INVALID_QUERY",
          message: "Søgningen må højst indeholde 120 tegn."
        },
        400
      );
    }

    const cluster = (c.req.query("cluster") ?? "").trim();
    if (cluster && !/^[a-z0-9-]{1,80}$/u.test(cluster)) {
      return c.json(
        {
          ok: false,
          code: "INVALID_CLUSTER",
          message: "Det valgte emne er ugyldigt."
        },
        422
      );
    }

    const rawLimit = Number(c.req.query("limit"));
    const limit = Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(20, Math.floor(rawLimit))
      : 10;

    try {
      const result = await deps.searchService.search(query, {
        cluster: cluster || undefined,
        limit
      });

      return c.json({
        ok: true,
        items: result.items.map((item) => ({
          id: item.id,
          title: item.title,
          excerpt: item.excerpt,
          content_cluster: item.contentCluster,
          content_type: item.contentType,
          canonical_url: item.canonicalUrl,
          updated: item.updated,
          reading_minutes: item.readingMinutes
        })),
        meta: {
          query,
          estimated_total_hits: result.estimatedTotalHits,
          processing_time_ms: result.processingTimeMs,
          limit
        }
      });
    } catch (error) {
      console.error("Article search failed", error);
      return c.json(
        {
          ok: false,
          code: "SEARCH_UNAVAILABLE",
          message: "Søgningen er midlertidigt utilgængelig. Prøv igen om lidt."
        },
        503
      );
    }
  });
}
