import { afterEach, describe, expect, it, vi } from "vitest";
import { createOpenAIEmbedder, rankCandidates } from "../src/recommender.js";
import type { CorpusPaper, FeedPaper } from "../src/types.js";

describe("rankCandidates", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ranks candidates by vector similarity to Zotero abstracts", async () => {
    const corpus: CorpusPaper[] = [
      {
        title: "Urban transport equity",
        abstract: "Transport accessibility and equitable mobility in cities.",
        paths: []
      },
      {
        title: "Molecular biology",
        abstract: "Protein folding and bacterial molecular biology.",
        paths: []
      }
    ];
    const candidates: FeedPaper[] = [
      {
        journal: "Cities",
        title: "Public transit accessibility",
        abstract: "A paper about accessible public transit systems.",
        url: "https://example.test/transit",
        publishedAt: new Date("2026-04-29T00:00:00.000Z")
      },
      {
        journal: "Science",
        title: "Protein folding",
        abstract: "A paper about protein folding.",
        url: "https://example.test/protein",
        publishedAt: new Date("2026-04-29T00:00:00.000Z")
      }
    ];

    const ranked = await rankCandidates(
      { provider: "api", baseUrl: "https://example.test", model: "model", batchSize: null },
      candidates,
      corpus,
      2,
      async () => [
        [1, 0],
        [0, 1],
        [1, 0],
        [0.2, 0.8]
      ]
    );

    expect(ranked.map((paper) => paper.title)).toEqual(["Public transit accessibility", "Protein folding"]);
    expect(ranked[0].matchedZoteroTitle).toBe("Urban transport equity");
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it("deduplicates candidates by URL and title before ranking", async () => {
    const corpus: CorpusPaper[] = [
      {
        title: "Transport geography",
        abstract: "Transportation networks, travel behavior, and urban geography.",
        paths: []
      }
    ];
    const duplicate: FeedPaper = {
      journal: "Journal of Transport Geography",
      title: "Travel behavior and transport networks",
      abstract: "Travel behavior and transport networks in cities.",
      url: "https://example.test/transport",
      publishedAt: new Date("2026-04-29T00:00:00.000Z")
    };

    const ranked = await rankCandidates(
      { provider: "api", baseUrl: "https://example.test", model: "model", batchSize: null },
      [duplicate, { ...duplicate }],
      corpus,
      10,
      async () => [
        [1, 0],
        [1, 0]
      ]
    );

    expect(ranked).toHaveLength(1);
  });

  it("passes the configured model as the API model parameter", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          data: [{ index: 0, embedding: [1, 0] }]
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const embedTexts = await createOpenAIEmbedder({
      provider: "api",
      apiKey: "embedding-key",
      baseUrl: "https://example.test/v1",
      model: "BAAI/bge-m3",
      batchSize: null
    });

    await embedTexts(["urban mobility"]);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.test/v1/embeddings",
      expect.objectContaining({
        body: JSON.stringify({
          model: "BAAI/bge-m3",
          input: ["urban mobility"],
          encoding_format: "float"
        })
      })
    );
  });

  it("batches embedding API requests when batchSize is configured", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { input: string[] };
      return new Response(
        JSON.stringify({
          data: body.input.map((_text, index) => ({ index, embedding: [index, 0] }))
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const embedTexts = await createOpenAIEmbedder({
      provider: "api",
      apiKey: "embedding-key",
      baseUrl: "https://example.test/v1",
      model: "BAAI/bge-m3",
      batchSize: 2
    });

    await embedTexts(["a", "b", "c"]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
