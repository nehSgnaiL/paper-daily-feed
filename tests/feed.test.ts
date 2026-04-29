import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchJournalFeed, fetchJournalFeeds, normalizeFeedItem } from "../src/rss.js";

describe("normalizeFeedItem", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("converts RSS parser items into feed papers", () => {
    const paper = normalizeFeedItem("Nature Cities", {
      title: "A walkable city study",
      link: "https://example.test/walkable",
      contentSnippet: "Urban design and walkability.",
      isoDate: "2026-04-28T10:30:00.000Z"
    });

    expect(paper).toEqual({
      journal: "Nature Cities",
      title: "A walkable city study",
      abstract: "Urban design and walkability.",
      url: "https://example.test/walkable",
      publishedAt: new Date("2026-04-28T10:30:00.000Z")
    });
  });

  it("returns null when an item has no usable URL or title", () => {
    expect(normalizeFeedItem("Nature", { title: "", link: "" })).toBeNull();
    expect(normalizeFeedItem("Nature", { title: "Valid title" })).toBeNull();
  });

  it("fetches RSS feeds with browser-compatible headers", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>Nature</title>
            <item>
              <title>Urban paper</title>
              <link>https://example.test/paper</link>
              <description>Urban science.</description>
              <pubDate>Tue, 28 Apr 2026 10:30:00 GMT</pubDate>
            </item>
          </channel>
        </rss>`,
        {
          status: 200,
          headers: { "Content-Type": "application/rss+xml" }
        }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const papers = await fetchJournalFeed({
      name: "Nature",
      rss: "https://www.nature.com/nature.rss"
    });

    expect(papers[0]?.title).toBe("Urban paper");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.nature.com/nature.rss",
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: expect.stringContaining("application/rss+xml"),
          "User-Agent": expect.stringContaining("paper-daily-feed")
        })
      })
    );
  });

  it("uses feed source names as fetched paper labels", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          `<?xml version="1.0"?>
          <rss version="2.0">
            <channel>
              <title>Custom Feed</title>
              <item>
                <title>Custom paper</title>
                <link>https://example.test/custom-paper</link>
                <description>Custom abstract.</description>
              </item>
            </channel>
          </rss>`,
          {
            status: 200,
            headers: { "Content-Type": "application/rss+xml" }
          }
        );
      })
    );

    const papers = await fetchJournalFeeds([
      {
        kind: "custom",
        name: "Custom Digest",
        rss: "https://example.test/feed.xml"
      }
    ]);

    expect(papers[0]?.journal).toBe("Custom Digest");
  });
});
