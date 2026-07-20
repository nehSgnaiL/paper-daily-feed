import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { AppConfig } from "../src/app-config.js";
import { ingestFeedPapers as ingestFeedPapersProduction } from "../src/feed-ingestion.js";
import type { FeedPaper, FeedSource, Journal } from "../src/types.js";

const fetchFeedSources = mock(async (_sources: FeedSource[]): Promise<FeedPaper[]> => []);

function ingestFeedPapers(
  catalog: Journal[],
  config: AppConfig["feeds"],
  maxAgeDays: number,
  now?: Date
) {
  return ingestFeedPapersProduction(catalog, config, maxAgeDays, now, { fetchSources: fetchFeedSources });
}

describe("ingestFeedPapers", () => {
  beforeEach(() => {
    mock.clearAllMocks();
    fetchFeedSources.mockResolvedValue([]);
  });

  it("resolves configured sources, fetches papers, and keeps recent papers", async () => {
    fetchFeedSources.mockResolvedValue([
      {
        journal: "Nature",
        title: "Recent",
        abstract: "A",
        url: "https://example.test/recent",
        publishedAt: new Date("2026-05-06T00:00:00Z")
      },
      {
        journal: "Custom",
        title: "Old",
        abstract: "B",
        url: "https://example.test/old",
        publishedAt: new Date("2026-04-01T00:00:00Z")
      }
    ]);

    const config: AppConfig["feeds"] = {
      catalogSelections: ["Nature"],
      customRss: [{ name: "Custom", rss: "https://example.test/rss.xml" }]
    };

    const result = await ingestFeedPapers(
      [{ name: "Nature", abbr: "Nature", rss: "https://nature.example/rss" }],
      config,
      7,
      new Date("2026-05-07T00:00:00Z")
    );

    expect(result.sources.map((source) => source.name)).toEqual(["Nature", "Custom"]);
    expect(result.allPapers).toHaveLength(2);
    expect(result.recentPapers.map((paper) => paper.title)).toEqual(["Recent"]);
  });

  it("rejects unknown catalog selections through the Feed Ingestion interface", async () => {
    await expect(
      ingestFeedPapers(
        [{ name: "Nature", rss: "https://nature.example/rss" }],
        { catalogSelections: ["Unknown Journal"], customRss: [] },
        7
      )
    ).rejects.toThrow("Unknown journal subscription(s): Unknown Journal");
    expect(fetchFeedSources).not.toHaveBeenCalled();
  });

  it("uses only custom Feed Sources when the catalog is disabled", async () => {
    fetchFeedSources.mockResolvedValue([]);

    const result = await ingestFeedPapers(
      [{ name: "Nature", rss: "https://nature.example/rss" }],
      {
        includeCatalog: false,
        catalogSelections: [],
        customRss: [{ name: "Lab", rss: "https://lab.example/rss" }]
      },
      7
    );

    expect(result.sources).toEqual([
      { kind: "custom", name: "Lab", rss: "https://lab.example/rss" }
    ]);
  });

  it("includes all catalog Feed Sources when no selections are configured", async () => {
    fetchFeedSources.mockResolvedValue([]);
    const catalog = [
      { name: "Nature", rss: "https://example.test/nature.rss" },
      { name: "Science", rss: "https://example.test/science.rss" }
    ];

    const result = await ingestFeedPapers(catalog, { catalogSelections: [], customRss: [] }, 7);

    expect(result.sources.map((source) => source.name)).toEqual(["Nature", "Science"]);
  });

  it("selects catalog Feed Sources by name or abbreviation", async () => {
    fetchFeedSources.mockResolvedValue([]);
    const catalog = [
      { name: "Science", rss: "https://example.test/science.rss" },
      {
        name: "IEEE Transactions on Intelligent Transportation Systems",
        abbr: "IEEE T-ITS",
        rss: "https://example.test/ieee.rss"
      }
    ];

    const result = await ingestFeedPapers(
      catalog,
      { catalogSelections: ["IEEE T-ITS"], customRss: [] },
      7
    );

    expect(result.sources.map((source) => source.name)).toEqual(["IEEE T-ITS"]);
  });

  it("appends custom Feed Sources after selected catalog sources", async () => {
    fetchFeedSources.mockResolvedValue([]);

    const result = await ingestFeedPapers(
      [{ name: "Nature", rss: "https://example.test/nature.rss" }],
      {
        catalogSelections: ["Nature"],
        customRss: [{ name: "Transit Lab", rss: "https://example.test/transit.xml" }]
      },
      7
    );

    expect(result.sources.map((source) => source.name)).toEqual(["Nature", "Transit Lab"]);
  });
});
