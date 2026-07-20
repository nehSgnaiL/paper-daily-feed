import { describe, expect, it } from "bun:test";
import catalog from "../data/journals.config.js";

describe("bundled journal catalog", () => {
  const supportedEntries = [
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

  it("has unique names and abbreviations for Feed Source selection", () => {
    const aliases = catalog.flatMap((journal) =>
      [journal.name, journal.abbr]
        .filter((value): value is string => Boolean(value))
        .map((value) => ({ alias: value.trim().toLowerCase(), journal: journal.name }))
    );
    const journalsByAlias = new Map<string, Set<string>>();
    for (const { alias, journal } of aliases) {
      journalsByAlias.set(alias, (journalsByAlias.get(alias) ?? new Set()).add(journal));
    }
    expect([...journalsByAlias.values()].every((journals) => journals.size === 1)).toBe(true);
  });

  it("includes the supported catalog entries", () => {
    expect(catalog.map((journal) => journal.name)).toEqual(expect.arrayContaining(supportedEntries));
  });
});
