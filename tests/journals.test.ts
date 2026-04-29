import { describe, expect, it } from "vitest";
import { filterSubscribedJournals } from "../src/journals.js";
import type { Journal } from "../src/types.js";

describe("filterSubscribedJournals", () => {
  const journals: Journal[] = [
    { name: "Nature", abbr: "Nature", rss: "https://example.test/nature.rss" },
    { name: "Science", abbr: "Science", rss: "https://example.test/science.rss" },
    {
      name: "IEEE Transactions on Intelligent Transportation Systems",
      abbr: "IEEE T-ITS",
      rss: "https://example.test/ieee.rss"
    }
  ];

  it("keeps all configured journals when no subscriptions are provided", () => {
    expect(filterSubscribedJournals(journals, null)).toEqual(journals);
  });

  it("matches subscriptions by journal name or abbreviation", () => {
    const filtered = filterSubscribedJournals(journals, ["Nature", "IEEE T-ITS"]);

    expect(filtered.map((journal) => journal.name)).toEqual([
      "Nature",
      "IEEE Transactions on Intelligent Transportation Systems"
    ]);
  });

  it("throws a clear error when a requested subscription is unknown", () => {
    expect(() => filterSubscribedJournals(journals, ["Unknown Journal"])).toThrow(
      "Unknown journal subscription: Unknown Journal"
    );
  });
});
