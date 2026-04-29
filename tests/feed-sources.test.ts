import { describe, expect, it } from "vitest";
import { resolveFeedSources } from "../src/feed-sources.js";
import type { AppConfig } from "../src/app-config.js";
import type { Journal } from "../src/types.js";

describe("resolveFeedSources", () => {
  const catalog: Journal[] = [
    { name: "Nature", abbr: "Nature", rss: "https://example.test/nature.rss" },
    { name: "Science", abbr: "Science", rss: "https://example.test/science.rss" },
    {
      name: "IEEE Transactions on Intelligent Transportation Systems",
      abbr: "IEEE T-ITS",
      rss: "https://example.test/ieee.rss"
    }
  ];

  function feedsConfig(overrides: Partial<AppConfig["feeds"]> = {}): AppConfig["feeds"] {
    return {
      catalogSelections: [],
      customRss: [],
      ...overrides
    };
  }

  it("includes all catalog journals when catalog selections are empty", () => {
    expect(resolveFeedSources(catalog, feedsConfig())).toEqual([
      { kind: "catalog", name: "Nature", rss: "https://example.test/nature.rss" },
      { kind: "catalog", name: "Science", rss: "https://example.test/science.rss" },
      { kind: "catalog", name: "IEEE T-ITS", rss: "https://example.test/ieee.rss" }
    ]);
  });

  it("selects catalog journals by name or abbreviation", () => {
    expect(
      resolveFeedSources(catalog, feedsConfig({ catalogSelections: ["Science", "IEEE T-ITS"] }))
    ).toEqual([
      { kind: "catalog", name: "Science", rss: "https://example.test/science.rss" },
      { kind: "catalog", name: "IEEE T-ITS", rss: "https://example.test/ieee.rss" }
    ]);
  });

  it("appends custom RSS entries after catalog sources", () => {
    expect(
      resolveFeedSources(
        catalog,
        feedsConfig({
          catalogSelections: ["Nature"],
          customRss: [{ name: "Transit Lab", rss: "https://example.test/transit.xml" }]
        })
      )
    ).toEqual([
      { kind: "catalog", name: "Nature", rss: "https://example.test/nature.rss" },
      { kind: "custom", name: "Transit Lab", rss: "https://example.test/transit.xml" }
    ]);
  });

  it("throws a clear error when a catalog selection is unknown", () => {
    expect(() =>
      resolveFeedSources(catalog, feedsConfig({ catalogSelections: ["Unknown Journal"] }))
    ).toThrow("Unknown journal subscription: Unknown Journal");
  });
});
