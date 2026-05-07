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

  it("parses authors and first affiliation from RSS metadata when present", () => {
    const paper = normalizeFeedItem("Nature", {
      title: "A metadata-rich paper",
      link: "https://example.test/metadata",
      dcCreators: ["Ada Lovelace", "Grace Hopper"],
      affiliations: ["Example University"],
      prismPublicationDate: "2026-04-29"
    });

    expect(paper).toMatchObject({
      authors: ["Ada Lovelace", "Grace Hopper"],
      firstAffiliation: "Example University",
      publishedAt: new Date("2026-04-29T00:00:00.000Z")
    });
  });

  it("parses ScienceDirect description fallback metadata", () => {
    const paper = normalizeFeedItem("CEUS", {
      title: "Urban housing markets under flood risk",
      link: "https://www.sciencedirect.com/science/article/pii/S0198971526000426?dgcid=rss_sd_all",
      contentSnippet:
        "Publication date: September 2026\nSource: Computers, Environment and Urban Systems, Volume 128\nAuthor(s): Asli Mutlu, Tatiana Filatova"
    });

    expect(paper).toMatchObject({
      abstract: "",
      authors: ["Asli Mutlu", "Tatiana Filatova"],
      publishedAt: new Date("2026-09-01T00:00:00.000Z")
    });
  });

  it("keeps ScienceDirect abstract content when metadata labels precede it", () => {
    const paper = normalizeFeedItem("CEUS", {
      title: "Urban housing markets under flood risk",
      link: "https://www.sciencedirect.com/science/article/pii/S0198971526000426?dgcid=rss_sd_all",
      contentSnippet:
        "Publication date: September 2026\nSource: Computers, Environment and Urban Systems, Volume 128\nAuthor(s): Asli Mutlu, Tatiana Filatova\nAbstract: This paper studies urban housing markets under flood risk."
    });

    expect(paper).toMatchObject({
      abstract: "This paper studies urban housing markets under flood risk.",
      authors: ["Asli Mutlu", "Tatiana Filatova"],
      publishedAt: new Date("2026-09-01T00:00:00.000Z")
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

  it.each([
    {
      label: "Nature",
      xml: `<?xml version="1.0"?>
        <rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:prism="http://prismstandard.org/namespaces/basic/2.0/">
          <channel>
            <title>Nature</title>
            <item>
              <title>Nature paper</title>
              <link>https://example.test/nature-paper</link>
              <description>Nature abstract.</description>
              <dc:creator>Ada Lovelace</dc:creator>
              <dc:creator>Grace Hopper</dc:creator>
              <prism:publicationDate>2026-04-28</prism:publicationDate>
            </item>
          </channel>
        </rss>`,
      expectedAuthors: ["Ada Lovelace", "Grace Hopper"],
      expectedDate: new Date("2026-04-28T00:00:00.000Z")
    },
    {
      label: "Science",
      xml: `<?xml version="1.0"?>
        <rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
          <channel>
            <title>Science</title>
            <item>
              <title>Science paper</title>
              <link>https://example.test/science-paper</link>
              <description>Science abstract.</description>
              <author>By Jane Smith; Alan Turing</author>
              <dc:date>2026-04-27</dc:date>
            </item>
          </channel>
        </rss>`,
      expectedAuthors: ["Jane Smith", "Alan Turing"],
      expectedDate: new Date("2026-04-27T00:00:00.000Z")
    },
    {
      label: "PNAS",
      xml: `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>PNAS</title>
            <item>
              <title>PNAS paper</title>
              <link>https://example.test/pnas-paper</link>
              <description>PNAS abstract.</description>
              <pubDate>Tue, 28 Apr 2026 10:30:00 GMT</pubDate>
            </item>
          </channel>
        </rss>`,
      expectedDate: new Date("2026-04-28T10:30:00.000Z")
    },
    {
      label: "Taylor & Francis",
      xml: `<?xml version="1.0"?>
        <rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
          <channel>
            <title>Taylor &amp; Francis</title>
            <item>
              <title>Taylor paper</title>
              <link>https://example.test/taylor-paper</link>
              <description>Taylor abstract.</description>
              <dc:creator>Harriet Tubman</dc:creator>
              <dc:date>2026-04-26T12:00:00Z</dc:date>
            </item>
          </channel>
        </rss>`,
      expectedAuthors: ["Harriet Tubman"],
      expectedDate: new Date("2026-04-26T12:00:00.000Z")
    },
    {
      label: "ScienceDirect",
      xml: `<?xml version="1.0"?>
        <rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:prism="http://prismstandard.org/namespaces/basic/2.0/">
          <channel>
            <title>ScienceDirect</title>
            <item>
              <title>ScienceDirect paper</title>
              <link>https://example.test/sciencedirect-paper</link>
              <description>ScienceDirect abstract.</description>
              <dc:creator>Katherine Johnson</dc:creator>
              <dc:creator>Dorothy Vaughan</dc:creator>
              <prism:coverDate>2026-04-25</prism:coverDate>
            </item>
          </channel>
        </rss>`,
      expectedAuthors: ["Katherine Johnson", "Dorothy Vaughan"],
      expectedDate: new Date("2026-04-25T00:00:00.000Z")
    },
    {
      label: "IEEE Xplore",
      xml: `<?xml version="1.0"?>
        <rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:prism="http://prismstandard.org/namespaces/basic/2.0/">
          <channel>
            <title>IEEE Xplore</title>
            <item>
              <title>IEEE paper</title>
              <link>https://example.test/ieee-paper</link>
              <description>IEEE abstract.</description>
              <dc:creator>Claude Shannon</dc:creator>
              <prism:publicationDate>2026-04-24</prism:publicationDate>
            </item>
          </channel>
        </rss>`,
      expectedAuthors: ["Claude Shannon"],
      expectedDate: new Date("2026-04-24T00:00:00.000Z")
    }
  ])("parses representative $label RSS metadata", async ({ label, xml, expectedAuthors, expectedDate }) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(xml, {
          status: 200,
          headers: { "Content-Type": "application/rss+xml" }
        });
      })
    );

    const papers = await fetchJournalFeed({
      name: label,
      rss: `https://example.test/${encodeURIComponent(label)}.xml`
    });

    expect(papers[0]).toMatchObject({
      journal: label,
      title: expect.stringContaining("paper"),
      url: expect.stringContaining("https://example.test/"),
      publishedAt: expectedDate
    });
    if (expectedAuthors) {
      expect(papers[0]?.authors).toEqual(expectedAuthors);
    }
  });
});
