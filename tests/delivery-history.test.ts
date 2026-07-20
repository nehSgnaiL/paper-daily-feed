import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "bun:test";
import { openDeliveryHistory } from "../src/delivery-history.js";
import type { FeedPaper } from "../src/types.js";

const tempDirs: string[] = [];

function tempPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "paper-daily-feed-history-"));
  tempDirs.push(dir);
  return join(dir, ".delivery-history.json");
}

function paper(overrides: Partial<FeedPaper> = {}): FeedPaper {
  return {
    journal: "Nature",
    title: " Transit Accessibility and Equity ",
    abstract: "Public transit access.",
    url: " HTTPS://Example.test/Paper?utm_source=rss&id=42 ",
    publishedAt: new Date("2026-05-11T00:00:00.000Z"),
    ...overrides
  };
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("delivery history", () => {
  it("reports that Delivery may have succeeded when persistence fails", () => {
    const directoryPath = tempPath().replace("/.delivery-history.json", "");
    const history = openDeliveryHistory({ path: directoryPath, env: {} });

    expect(() => history.confirmSuccessfulDelivery([paper()], new Date("2026-05-11T00:00:00Z"))).toThrow(
      "Delivery may have succeeded, but Delivery History could not be saved"
    );
  });

  it("creates stable fingerprints from normalized URL and title with an optional salt", () => {
    const path = tempPath();
    const original = paper();
    const equivalent = paper({
      title: "Transit   Accessibility and Equity",
      url: "https://example.test/Paper?id=42&utm_medium=email"
    });
    const history = openDeliveryHistory({ path, env: {} });
    history.confirmSuccessfulDelivery([original], new Date("2026-05-11T00:00:00Z"));

    expect(history.filterUndeliveredPapers([equivalent])).toEqual([]);
    expect(openDeliveryHistory({ path, env: { DELIVERY_HISTORY_SALT: "private-salt" } }).filterUndeliveredPapers([equivalent])).toEqual([equivalent]);
  });

  it("loads missing or malformed history files as empty history", () => {
    const path = tempPath();

    expect(openDeliveryHistory({ path, env: {} }).filterUndeliveredPapers([paper()])).toEqual([paper()]);

    writeFileSync(path, "not valid json");

    expect(openDeliveryHistory({ path, env: {} }).filterUndeliveredPapers([paper()])).toEqual([paper()]);
  });

  it("filters papers already present in delivery history", () => {
    const delivered = paper();
    const fresh = paper({ title: "Fresh paper", url: "https://example.test/fresh" });
    const history = openDeliveryHistory({ path: tempPath(), env: {} });
    history.confirmSuccessfulDelivery([delivered], new Date("2026-05-11T00:00:00Z"));

    expect(history.filterUndeliveredPapers([delivered, fresh])).toEqual([fresh]);
  });

  it("records final delivered papers once and prunes entries older than retention", () => {
    const path = tempPath();
    const old = paper({ title: "Old", url: "https://example.test/old" });
    const recent = paper({ title: "Recent", url: "https://example.test/recent" });
    const history = openDeliveryHistory({ path, env: {} });
    history.confirmSuccessfulDelivery([old], new Date("2025-01-01T00:00:00Z"));
    history.confirmSuccessfulDelivery([recent, recent], new Date("2026-05-11T00:00:00Z"));

    const reopened = openDeliveryHistory({ path, env: {} });
    expect(reopened.filterUndeliveredPapers([old, recent])).toEqual([old]);
  });
});
