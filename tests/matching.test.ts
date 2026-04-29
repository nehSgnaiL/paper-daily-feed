import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createEmbedder,
  createOpenAICompatibleEmbedder,
  rankPapers,
  type EmbedTexts
} from "../src/matching.js";
import type { MatchingConfig } from "../src/app-config.js";
import type { FeedSource, InterestDocument, MatchContext, RecommendedPaper } from "../src/types.js";

const pipelineMock = vi.fn();

vi.mock("@huggingface/transformers", () => ({
  pipeline: pipelineMock
}));

const matchingConfig: MatchingConfig = {
  provider: "api",
  api: {
    baseUrl: "https://example.test/v1",
    model: "text-embedding-test",
    apiKeyEnv: "EMBEDDING_API_KEY",
    batchSize: 2
  },
  local: {
    model: "local-embedding-test",
    batchSize: 2
  },
  paperLimit: 10,
  maxPaperAgeDays: 7
};

const candidate = (title: string, abstract: string, url = `https://example.test/${title}`) => ({
  journal: "Test Journal",
  title,
  abstract,
  url,
  publishedAt: new Date("2026-04-29T00:00:00.000Z")
});

const interest = (
  title: string,
  text: string,
  topics: string[],
  source: InterestDocument["source"] = "profile"
): InterestDocument => ({
  source,
  title,
  text,
  topics
});

describe("neutral matching domain types", () => {
  it("supports neutral feed sources, interest documents, match context, and recommendations", () => {
    const source: FeedSource = {
      kind: "catalog",
      name: "Nature",
      rss: "https://example.test/nature.rss"
    };
    const interest: InterestDocument = {
      source: "profile",
      title: "Research profile",
      text: "Urban mobility, accessibility, and public transit equity.",
      topics: ["urban mobility", "equity"]
    };
    const matchContext: MatchContext = {
      bestMatchSource: "profile",
      bestMatchTitle: null,
      bestMatchTopics: ["urban mobility"]
    };
    const recommendation: RecommendedPaper = {
      journal: source.name,
      title: "Transit access and equity",
      abstract: "A study of public transit accessibility.",
      url: "https://example.test/transit",
      publishedAt: new Date("2026-04-29T00:00:00.000Z"),
      score: 0.91,
      matchContext,
      tldr: "Transit access varies by neighborhood."
    };

    expect(source).toMatchObject({ kind: "catalog", name: "Nature" });
    expect(interest.topics).toContain("equity");
    expect(recommendation.matchContext?.bestMatchSource).toBe("profile");
    expect(recommendation.matchContext?.bestMatchTopics).toEqual(["urban mobility"]);
  });
});

describe("rankPapers", () => {
  it("returns score and match context from the best matching interest document", async () => {
    const papers = [
      candidate("Transit access", "Public transit accessibility and equity."),
      candidate("Protein folding", "Molecular biology and protein structure.")
    ];
    const interests = [
      interest("Urban transport equity", "Transport accessibility and equitable mobility.", ["transport", "equity"]),
      interest("Molecular biology", "Protein folding in bacteria.", ["biology"], "zotero")
    ];

    const ranked = await rankPapers(matchingConfig, papers, interests, {}, async () => [
      [1, 0],
      [0, 1],
      [1, 0],
      [0.2, 0.8]
    ]);

    expect(ranked.map((paper) => paper.title)).toEqual(["Transit access", "Protein folding"]);
    expect(ranked[0]).toMatchObject({
      score: 1,
      matchContext: {
        bestMatchSource: "profile",
        bestMatchTitle: "Urban transport equity",
        bestMatchTopics: ["transport", "equity"]
      }
    });
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it("deduplicates candidates by normalized URL and title before ranking", async () => {
    const duplicate = candidate("Transit Access ", "First copy.", " HTTPS://EXAMPLE.TEST/TRANSIT ");
    const embedTexts: EmbedTexts = vi.fn(async () => [
      [1, 0],
      [1, 0]
    ]);

    const ranked = await rankPapers(
      matchingConfig,
      [duplicate, { ...duplicate, title: " transit access", url: "https://example.test/transit" }],
      [interest("Transport", "Transport networks.", ["transport"])],
      {},
      embedTexts
    );

    expect(ranked).toHaveLength(1);
    expect(embedTexts).toHaveBeenCalledWith(["Transit Access \n\nFirst copy.", "Transport\n\nTransport networks."]);
  });

  it("keeps match context when the best score is zero", async () => {
    const ranked = await rankPapers(
      matchingConfig,
      [candidate("Unknown topic", "No vector overlap.")],
      [interest("Fallback interest", "Reference text.", ["fallback"])],
      {},
      async () => [
        [0, 0],
        [1, 0]
      ]
    );

    expect(ranked[0]).toMatchObject({
      score: 0,
      matchContext: {
        bestMatchTitle: "Fallback interest",
        bestMatchTopics: ["fallback"]
      }
    });
  });
});

describe("createOpenAICompatibleEmbedder", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("passes model, body, and authorization header to the embeddings API", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ data: [{ index: 0, embedding: [1, 0] }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const embedTexts = await createOpenAICompatibleEmbedder(matchingConfig.api, "embedding-key");

    await embedTexts(["urban mobility"]);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.test/v1/embeddings",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer embedding-key"
        },
        body: JSON.stringify({
          model: "text-embedding-test",
          input: ["urban mobility"],
          encoding_format: "float"
        })
      })
    );
  });

  it("batches requests and sorts returned vectors by index", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { input: string[] };
      return new Response(
        JSON.stringify({
          data: body.input.map((_text, index) => ({ index, embedding: [index, body.input.length] })).reverse()
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const embedTexts = await createOpenAICompatibleEmbedder(matchingConfig.api, "");

    await expect(embedTexts(["a", "b", "c"])).resolves.toEqual([
      [0, 2],
      [1, 2],
      [0, 1]
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]).not.toMatchObject({
      headers: expect.objectContaining({ Authorization: expect.any(String) })
    });
  });
});

describe("createEmbedder", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    pipelineMock.mockReset();
  });

  it("uses the API embedder when provider, base URL, and API key are configured", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ data: [{ index: 0, embedding: [1, 0] }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const embedTexts = await createEmbedder(matchingConfig, { EMBEDDING_API_KEY: "embedding-key" });

    await embedTexts(["urban mobility"]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(pipelineMock).not.toHaveBeenCalled();
  });

  it("falls back to the local embedder when the API key is missing", async () => {
    const extractor = vi.fn(async () => ({ tolist: () => [[0.5, 0.5]] }));
    pipelineMock.mockResolvedValue(extractor);

    const embedTexts = await createEmbedder(matchingConfig, {});

    await expect(embedTexts(["local text"])).resolves.toEqual([[0.5, 0.5]]);
    expect(pipelineMock).toHaveBeenCalledWith("feature-extraction", "local-embedding-test", { dtype: "fp32" });
    expect(extractor).toHaveBeenCalledWith(["local text"], { pooling: "mean", normalize: true });
  });
});
