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

  it("removes Taylor & Francis affiliation and biography text from author metadata", () => {
    const paper = normalizeFeedItem("IJGIS", {
      title: "Taylor author metadata includes affiliations",
      link: "https://example.test/ijgis-paper",
      author:
        "Wei Tu Zhuoyuan Bao Xiaojuan Liu Yatao Zhang Wei Gao Mingxiao Li a Department of Urban Informatics, School of Architecture and Urban Planning, Shenzhen University, Shenzhen, Guangdong Province, P.R. China b School of Architecture and Urban Planning, Guangdong Key Laboratory for Urban Informatics, Shenzhen University, Shenzhen, P.R. China Wei Tu is currently a Professor in the Department of Urban Spatial Information Engineering, Shenzhen University."
    });

    expect(paper?.authors).toEqual([
      "Wei Tu",
      "Zhuoyuan Bao",
      "Xiaojuan Liu",
      "Yatao Zhang",
      "Wei Gao",
      "Mingxiao Li"
    ]);
  });

  it("removes PNAS ROR affiliations from concatenated author metadata", () => {
    const paper = normalizeFeedItem("PNAS", {
      title: "PNAS creator metadata includes ROR affiliations",
      link: "https://example.test/pnas-paper",
      dcCreators: [
        "Megan KangKathryn EdinJens LudwigTimothy NelsonSendhil Mullainathanahttps://ror.org/00za53h95School of Government and Policy, Johns Hopkins University, Washington, DC 20001"
      ]
    });

    expect(paper?.authors).toEqual([
      "Megan Kang",
      "Kathryn Edin",
      "Jens Ludwig",
      "Timothy Nelson",
      "Sendhil Mullainathan"
    ]);
  });

  it("removes unmarked affiliation text from Taylor & Francis author metadata", () => {
    const paper = normalizeFeedItem("AAAG", {
      title: "Taylor creator metadata has affiliation without superscript marker",
      link: "https://example.test/aaag-paper",
      dcCreators: ["Harriet Hawkins Department of Geography, Royal Holloway University of London"]
    });

    expect(paper?.authors).toEqual(["Harriet Hawkins"]);
  });

  it("parses current AAAG Taylor & Francis author and cover date metadata", () => {
    const paper = normalizeFeedItem("AAAG", {
      title: "Fixing Streams",
      link: "https://www.tandfonline.com/doi/full/10.1080/24694452.2025.2592754?af=R",
      contentSnippet: "Volume 116, Issue 4, null 2026, Page 786-804\n.",
      dcDate: "2025-12-15T06:42:33Z",
      prismCoverDate: "2026-04-21T07:00:00Z",
      dcCreators: [
        "Sydney Widell Caroline Gottschalk Rebecca Lave Eric Booth a Freshwater & Marine Science, University of Wisconsin-Madison, USAb Department of English, University of Wisconsin-Madison, USAc Department of Geography, Indiana University, USAd Department of Plant and Agroecosystem Sciences, University of Wisconsin-Madison, USASYDNEY WIDELL is the Watershed Coordinator with the Coon Creek Community Watershed Council. CAROLINE GOTTSCHALK is a Vilas Distinguished Achievement Professor."
      ]
    });

    expect(paper).toMatchObject({
      abstract: "",
      authors: ["Sydney Widell", "Caroline Gottschalk", "Rebecca Lave", "Eric Booth"],
      firstAffiliation: "Freshwater & Marine Science, University of Wisconsin-Madison, USA",
      publishedAt: new Date("2026-04-21T07:00:00.000Z")
    });
  });

  it("removes Urban Geography Taylor affiliations that start with Asia Research metadata", () => {
    const paper = normalizeFeedItem("Urban Geography", {
      title: "Circulating referencescapes",
      link: "https://www.tandfonline.com/doi/full/10.1080/example?af=R",
      dcCreators: [
        "Qian Hui, Tan Brenda, Saw Ai, Yeoh a Asia Research Institute, National University of Singapore, Singapore b Department of Geography, National University of Singapore, Singapore"
      ]
    });

    expect(paper?.authors).toEqual(["Qian Hui", "Tan Brenda", "Saw Ai", "Yeoh"]);
    expect(paper?.firstAffiliation).toBe("Asia Research Institute, National University of Singapore, Singapore");
  });

  it("ends Taylor first affiliation before Business school metadata", () => {
    const paper = normalizeFeedItem("Urban Geography", {
      title: "AI Urbanism",
      link: "https://www.tandfonline.com/doi/full/10.1080/example?af=R",
      dcCreators: [
        "Jun Zhang Andrew Cox Jing Wang a School of Information, Journalism and Communication, University of Sheffield, Sheffield, UKb Business School, University of Sheffield, Sheffield, UK"
      ]
    });

    expect(paper?.authors).toEqual(["Jun Zhang", "Andrew Cox", "Jing Wang"]);
    expect(paper?.firstAffiliation).toBe(
      "School of Information, Journalism and Communication, University of Sheffield, Sheffield, UK"
    );
  });

  it("splits Taylor authors before Urban affiliation metadata", () => {
    const paper = normalizeFeedItem("IJGIS", {
      title: "Street semantic tree",
      link: "https://www.tandfonline.com/doi/full/10.1080/example?af=R",
      dcCreators: [
        "Huihai Wang William Davis Yiming Xu Justin Yu Gengchen Mai Junfeng Jiao a Urban Information Lab"
      ]
    });

    expect(paper?.authors).toEqual([
      "Huihai Wang",
      "William Davis",
      "Yiming Xu",
      "Justin Yu",
      "Gengchen Mai",
      "Junfeng Jiao"
    ]);
    expect(paper?.firstAffiliation).toBe("Urban Information Lab");
  });

  it("ends compact Taylor affiliation before lowercase marker after country text", () => {
    const paper = normalizeFeedItem("AAAG", {
      title: "Speculating on Social Media Traffic",
      link: "https://www.tandfonline.com/doi/full/10.1080/example?af=R",
      dcCreators: [
        "Di Wu, Chen Li a School of Geography, Nanjing Normal University, Chinab Department of Social Sciences and Policy Studies, The Education University of Hong Kong, Hong Kong"
      ]
    });

    expect(paper?.authors).toEqual(["Di Wu", "Chen Li"]);
    expect(paper?.firstAffiliation).toBe("School of Geography, Nanjing Normal University, China");
  });

  it("splits Taylor authors before Graduate affiliation metadata", () => {
    const paper = normalizeFeedItem("AAAG", {
      title: "Pandemic, People, and Street Crime",
      link: "https://www.tandfonline.com/doi/full/10.1080/example?af=R",
      dcCreators: ["Yuta Takahashi, Tomoki Nakaya, a Graduate School of Environmental Studies, Nagoya University"]
    });

    expect(paper?.authors).toEqual(["Yuta Takahashi", "Tomoki Nakaya"]);
    expect(paper?.firstAffiliation).toBe("Graduate School of Environmental Studies, Nagoya University");
  });

  it("drops Taylor & Francis bibliographic metadata descriptions", () => {
    const paper = normalizeFeedItem("Urban Geography", {
      title: "Taylor description only contains issue metadata",
      link: "https://example.test/taylor-paper",
      contentSnippet: "Volume 47, Issue 2, March 2026, Page 397-419\n."
    });

    expect(paper?.abstract).toBe("");
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

  it("fetches RSS feeds with RSS-compatible headers", async () => {
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
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "User-Agent": expect.stringContaining("paper-daily-feed")
        })
      })
    );
  });

  it("samples from multiple RSS header profiles across RSS requests", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>Nature</title>
            <item>
              <title>Urban paper</title>
              <link>https://example.test/paper</link>
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

    await fetchJournalFeed({ name: "Nature", rss: "https://www.nature.com/nature.rss" });
    await fetchJournalFeed({ name: "AAAG", rss: "https://www.tandfonline.com/feed/rss/raag21" });

    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>;
    const userAgents = calls.map((call) => {
      const init = call[1];
      return (init.headers as Record<string, string>)["User-Agent"];
    });

    expect(new Set(userAgents).size).toBeGreaterThan(1);
  });

  it("rotates to browser headers after feed-reader header failures", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const userAgent = (init?.headers as Record<string, string>)["User-Agent"];
      const status = userAgent.includes("paper-daily-feed") ? 403 : 200;
      return new Response(
        `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>Feed</title>
            <item>
              <title>Paper</title>
              <link>https://example.test/paper</link>
            </item>
          </channel>
        </rss>`,
        {
          status,
          headers: { "Content-Type": "application/rss+xml" }
        }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const papers = await fetchJournalFeeds([{ name: "AAAG", rss: "https://www.tandfonline.com/feed/rss/raag21" }], {
      delayMs: 0,
      retryDelayMs: 0
    });

    const userAgents = (fetchMock.mock.calls as unknown as Array<[string, RequestInit]>).map(
      ([, init]) => (init.headers as Record<string, string>)["User-Agent"]
    );
    expect(papers).toHaveLength(1);
    expect(userAgents[0]).toContain("paper-daily-feed");
    expect(userAgents[1]).toContain("Mozilla/5.0");
  });

  it("rejects HTML challenge pages before XML parsing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response("<!DOCTYPE html><html><title>Challenge</title></html>", {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      })
    );

    await expect(
      fetchJournalFeed({
        name: "Nature Health",
        rss: "https://www.nature.com/naturehealth.rss"
      })
    ).rejects.toThrow("Expected RSS/XML feed but received text/html");
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

    const papers = await fetchJournalFeeds(
      [
        {
          kind: "custom",
          name: "Custom Digest",
          rss: "https://example.test/feed.xml"
        }
      ],
      { delayMs: 0 }
    );

    expect(papers[0]?.journal).toBe("Custom Digest");
  });

  it("logs publisher context while loading RSS feeds", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          `<?xml version="1.0"?>
          <rss version="2.0">
            <channel>
              <title>Nature</title>
              <item>
                <title>Nature paper</title>
                <link>https://example.test/nature-paper</link>
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

    const feeds = [
      { name: "Nature", rss: "https://www.nature.com/nature.rss" },
      ...Array.from({ length: 19 }, (_, index) => ({
        kind: "custom" as const,
        name: `Custom ${index + 1}`,
        rss: `https://example.test/custom-${index + 1}.xml`
      }))
    ];

    await fetchJournalFeeds(feeds, { delayMs: 0 });

    const logs = logSpy.mock.calls.flat().join("\n");
    expect(logs).not.toContain("[RSS] start");
    expect(logs).toMatch(
      /\[RSS] 1\/20 \[#-------------------] 5% \| \d+\.\ds \| \[Springer] Nature: 1 papers/
    );
  });

  it("loads RSS feeds without concurrent publisher requests", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    let activeRequests = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        activeRequests += 1;
        await new Promise((resolve) => setTimeout(resolve, 1));
        const status = activeRequests > 1 ? 403 : 200;
        activeRequests -= 1;

        return new Response(
          `<?xml version="1.0"?>
          <rss version="2.0">
            <channel>
              <title>Feed</title>
              <item>
                <title>Paper</title>
                <link>https://example.test/paper</link>
              </item>
            </channel>
          </rss>`,
          {
            status,
            headers: { "Content-Type": "application/rss+xml" }
          }
        );
      })
    );

    const papers = await fetchJournalFeeds(
      [
        { name: "AAAG", rss: "https://www.tandfonline.com/feed/rss/raag21" },
        { name: "IJGIS", rss: "https://www.tandfonline.com/feed/rss/tgis20" }
      ],
      { delayMs: 0 }
    );

    expect(papers).toHaveLength(2);
    expect(logSpy.mock.calls.flat().join("\n")).not.toContain("Status code 403");
  });

  it("waits between RSS feed requests when configured", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const requestTimes: number[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        requestTimes.push(Date.now());
        return new Response(
          `<?xml version="1.0"?>
          <rss version="2.0">
            <channel>
              <title>Feed</title>
              <item>
                <title>Paper</title>
                <link>https://example.test/paper</link>
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

    await fetchJournalFeeds(
      [
        { name: "AAAG", rss: "https://www.tandfonline.com/feed/rss/raag21" },
        { name: "IJGIS", rss: "https://www.tandfonline.com/feed/rss/tgis20" }
      ],
      { delayMs: 20 }
    );

    expect(requestTimes[1] - requestTimes[0]).toBeGreaterThanOrEqual(15);
    expect(logSpy).toHaveBeenCalled();
  });

  it("samples variable RSS feed delays from a configured range", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(1);
    const requestTimes: number[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        requestTimes.push(Date.now());
        return new Response(
          `<?xml version="1.0"?>
          <rss version="2.0">
            <channel>
              <title>Feed</title>
              <item>
                <title>Paper</title>
                <link>https://example.test/paper</link>
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

    await fetchJournalFeeds(
      [
        { name: "AAAG", rss: "https://www.tandfonline.com/feed/rss/raag21" },
        { name: "IJGIS", rss: "https://www.tandfonline.com/feed/rss/tgis20" }
      ],
      { delayRangeMs: { minMs: 20, maxMs: 40 } }
    );

    expect(requestTimes[1] - requestTimes[0]).toBeGreaterThanOrEqual(25);
    expect(randomSpy).toHaveBeenCalledTimes(2);
  });

  it("interleaves publishers while loading RSS feeds", async () => {
    const requestedUrls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        requestedUrls.push(String(input));
        return new Response(
          `<?xml version="1.0"?>
          <rss version="2.0">
            <channel>
              <title>Feed</title>
              <item>
                <title>Paper</title>
                <link>https://example.test/paper</link>
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

    await fetchJournalFeeds(
      [
        { name: "Nature", rss: "https://www.nature.com/nature.rss" },
        { name: "Nature Cities", rss: "https://www.nature.com/natcities.rss" },
        { name: "Science", rss: "https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=science" },
        { name: "AAAG", rss: "https://www.tandfonline.com/feed/rss/raag21" }
      ],
      { delayMs: 0 }
    );

    expect(requestedUrls).toEqual([
      "https://www.nature.com/nature.rss",
      "https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=science",
      "https://www.tandfonline.com/feed/rss/raag21",
      "https://www.nature.com/natcities.rss"
    ]);
  });

  it("retries temporary RSS status failures while loading multiple feeds", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const fetchMock = vi.fn(async () => {
      const status = fetchMock.mock.calls.length === 1 ? 403 : 200;
      return new Response(
        `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>Feed</title>
            <item>
              <title>Paper</title>
              <link>https://example.test/paper</link>
            </item>
          </channel>
        </rss>`,
        {
          status,
          headers: { "Content-Type": "application/rss+xml" }
        }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const papers = await fetchJournalFeeds([{ name: "AAAG", rss: "https://www.tandfonline.com/feed/rss/raag21" }], {
      delayMs: 0,
      retryDelayMs: 0
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(papers).toHaveLength(1);
    expect(logSpy.mock.calls.flat().join("\n")).not.toContain("failed");
  });

  it("retries temporary HTML challenge pages while loading multiple feeds", async () => {
    const fetchMock = vi.fn(async () => {
      if (fetchMock.mock.calls.length === 1) {
        return new Response("<!DOCTYPE html><html><title>Challenge</title></html>", {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }

      return new Response(
        `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>Nature</title>
            <item>
              <title>Paper</title>
              <link>https://example.test/paper</link>
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

    const papers = await fetchJournalFeeds([{ name: "Nature Health", rss: "https://www.nature.com/naturehealth.rss" }], {
      delayMs: 0,
      retryDelayMs: 0
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(papers).toHaveLength(1);
  });

  it("logs persistent publisher blocks as zero-paper feeds instead of errors", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response("<!DOCTYPE html><html><title>Client Challenge</title></html>", {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      })
    );

    const papers = await fetchJournalFeeds([{ name: "Nature Geoscience", rss: "https://www.nature.com/ngeo.rss" }], {
      delayMs: 0,
      retryCount: 1,
      retryDelayMs: 0,
      deferredRetryDelayMs: 0
    });

    const logs = logSpy.mock.calls.flat().join("\n");
    expect(papers).toHaveLength(0);
    expect(logs).toContain("[Springer] Nature Geoscience: 0 papers (publisher returned non-RSS response)");
    expect(logs).not.toContain("failed: Error");
  });

  it("defers publisher-blocked feeds and retries them after other feeds", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const requestedUrls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        requestedUrls.push(url);
        const isFirstNatureAttempt =
          url === "https://www.nature.com/ngeo.rss" &&
          requestedUrls.filter((requestedUrl) => requestedUrl === url).length === 1;

        if (isFirstNatureAttempt) {
          return new Response("<!DOCTYPE html><html><title>Client Challenge</title></html>", {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8" }
          });
        }

        return new Response(
          `<?xml version="1.0"?>
          <rss version="2.0">
            <channel>
              <title>Feed</title>
              <item>
                <title>Paper</title>
                <link>https://example.test/paper</link>
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

    const papers = await fetchJournalFeeds(
      [
        { name: "Nature Geoscience", rss: "https://www.nature.com/ngeo.rss" },
        { name: "Science", rss: "https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=science" }
      ],
      { delayMs: 0, retryCount: 0, deferredRetryDelayMs: 0 }
    );

    const logs = logSpy.mock.calls.flat().join("\n");
    expect(requestedUrls).toEqual([
      "https://www.nature.com/ngeo.rss",
      "https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=science",
      "https://www.nature.com/ngeo.rss"
    ]);
    expect(papers).toHaveLength(2);
    expect(logs).toContain("[Springer] Nature Geoscience: 1 papers");
    expect(logs).not.toContain("[Springer] Nature Geoscience: 0 papers");
  });

  it("defers publisher-blocked feeds without immediate same-feed retries", async () => {
    const requestedUrls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        requestedUrls.push(url);

        if (url === "https://www.tandfonline.com/feed/rss/raag21") {
          const aaagAttemptCount = requestedUrls.filter((requestedUrl) => requestedUrl === url).length;
          if (aaagAttemptCount === 1) {
            return new Response("", {
              status: 403,
              headers: { "Content-Type": "text/plain" }
            });
          }
        }

        return new Response(
          `<?xml version="1.0"?>
          <rss version="2.0">
            <channel>
              <title>Feed</title>
              <item>
                <title>Paper</title>
                <link>https://example.test/paper</link>
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

    const papers = await fetchJournalFeeds(
      [
        { name: "AAAG", rss: "https://www.tandfonline.com/feed/rss/raag21" },
        { name: "Science", rss: "https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=science" }
      ],
      { delayMs: 0, retryDelayMs: 0, deferredRetryDelayMs: 0 }
    );

    expect(requestedUrls).toEqual([
      "https://www.tandfonline.com/feed/rss/raag21",
      "https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=science",
      "https://www.tandfonline.com/feed/rss/raag21"
    ]);
    expect(papers).toHaveLength(2);
  });

  it("waits between deferred publisher retries", async () => {
    const requestTimesByUrl = new Map<string, number[]>();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        requestTimesByUrl.set(url, [...(requestTimesByUrl.get(url) ?? []), Date.now()]);
        const isFirstAttempt = (requestTimesByUrl.get(url) ?? []).length === 1;
        if (isFirstAttempt) {
          return new Response("", {
            status: 403,
            headers: { "Content-Type": "text/plain" }
          });
        }

        return new Response(
          `<?xml version="1.0"?>
          <rss version="2.0">
            <channel>
              <title>Feed</title>
              <item>
                <title>Paper</title>
                <link>https://example.test/paper</link>
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

    await fetchJournalFeeds(
      [
        { name: "AAAG", rss: "https://www.tandfonline.com/feed/rss/raag21" },
        { name: "IJGIS", rss: "https://www.tandfonline.com/feed/rss/tgis20" }
      ],
      { retryCount: 0, deferredRetryDelayMs: 0, delayRangeMs: { minMs: 20, maxMs: 20 } }
    );

    const aaagRetry = requestTimesByUrl.get("https://www.tandfonline.com/feed/rss/raag21")?.[1] ?? 0;
    const ijgisRetry = requestTimesByUrl.get("https://www.tandfonline.com/feed/rss/tgis20")?.[1] ?? 0;
    expect(ijgisRetry - aaagRetry).toBeGreaterThanOrEqual(15);
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
      label: "Royal Society Publishing",
      xml: `<?xml version="1.0"?>
        <rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:prism="http://prismstandard.org/namespaces/basic/2.0/">
          <channel>
            <title>Journal of The Royal Society Interface</title>
            <item>
              <title>Royal Society paper</title>
              <link>https://example.test/royal-society-paper</link>
              <description>Royal Society abstract.</description>
              <dc:creator>Mary Cartwright</dc:creator>
              <dc:creator>Alan Hodgkin</dc:creator>
              <prism:publicationDate>2026-04-25</prism:publicationDate>
            </item>
          </channel>
        </rss>`,
      expectedAuthors: ["Mary Cartwright", "Alan Hodgkin"],
      expectedDate: new Date("2026-04-25T00:00:00.000Z")
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
