import { describe, expect, it, vi } from "vitest";
import type { AppConfig } from "../src/app-config.js";
import { ingestFeedPapers } from "../src/feed-ingestion.js";

const rssMock = vi.hoisted(() => ({
  fetchJournalFeeds: vi.fn()
}));

vi.mock("../src/rss.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/rss.js")>();
  return {
    ...actual,
    fetchJournalFeeds: rssMock.fetchJournalFeeds
  };
});

describe("ingestFeedPapers", () => {
  it("resolves configured sources, fetches papers, and keeps recent papers", async () => {
    rssMock.fetchJournalFeeds.mockResolvedValue([
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
});

