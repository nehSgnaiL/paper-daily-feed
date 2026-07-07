import { describe, expect, it } from "vitest";
import catalog from "../data/journals.config.js";
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

describe("bundled journal catalog", () => {
  const addedCatalogEntries = [
    "Journal of The Royal Society Interface",
    "Habitat International",
    "Urban Geography",
    "Economic Geography",
    "npj Urban Sustainability",
    "Transportation Research Part C: Emerging Technologies",
    "International Journal of Digital Earth"
  ];

  it("keeps every bundled journal selectable and backed by RSS and ISSN identifiers", () => {
    for (const journal of catalog) {
      expect(journal.name.trim()).toBe(journal.name);
      expect(journal.name.length).toBeGreaterThan(0);
      expect(journal.rss).toMatch(/^https:\/\//);
      expect(journal.issn).toMatch(/^\d{4}-\d{3}[\dX]$/);
    }
  });

  it("has unique names and abbreviations for subscription matching", () => {
    const aliasesByJournal = catalog.flatMap((journal) =>
      [journal.name, journal.abbr]
        .filter((value): value is string => Boolean(value))
        .map((value) => ({
          alias: value.trim().toLowerCase(),
          journal: journal.name
        }))
    );
    const aliasesByName = new Map<string, Set<string>>();

    for (const { alias, journal } of aliasesByJournal) {
      aliasesByName.set(alias, (aliasesByName.get(alias) ?? new Set()).add(journal));
    }

    expect([...aliasesByName.values()].every((journals) => journals.size === 1)).toBe(true);
  });

  it("includes the newly supported catalog entries", () => {
    expect(catalog.map((journal) => journal.name)).toEqual(expect.arrayContaining(addedCatalogEntries));
  });
});
