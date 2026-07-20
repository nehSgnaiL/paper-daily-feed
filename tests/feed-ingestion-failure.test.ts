import { afterEach, describe, expect, it, mock } from "bun:test";
import { ingestFeedPapers } from "../src/feed-ingestion.js";
import { stubFetch } from "./test-support.js";

afterEach(() => {
  mock.restore();
});

describe("feed ingestion failures", () => {
  it("fails the run when every configured Feed Source fails", async () => {
    stubFetch(mock(async () => new Response("unavailable", { status: 503 })));

    await expect(
      ingestFeedPapers(
        [],
        {
          includeCatalog: false,
          catalogSelections: [],
          customRss: [{ name: "Broken feed", rss: "https://example.test/feed.xml" }]
        },
        7,
        new Date(),
        {
          fetchOptions: {
            retryCount: 0,
            retryDelayMs: 0,
            deferredRetryDelayMs: 0,
            curlFallback: false
          }
        }
      )
    ).rejects.toThrow("All 1 configured Feed Sources failed");
  });
});
