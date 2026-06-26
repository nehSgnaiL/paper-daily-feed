import { describe, expect, it, vi } from "vitest";
import { enrichFeedPapers } from "../src/metadata-enrichment.js";
import type { FeedPaper } from "../src/types.js";

function paper(overrides: Partial<FeedPaper> = {}): FeedPaper {
  return {
    journal: "AAAG",
    title: "RSS title",
    abstract: "RSS abstract",
    url: "https://www.tandfonline.com/doi/full/10.1080/24694452.2025.2592754?af=R",
    publishedAt: null,
    ...overrides
  };
}

describe("metadata enrichment", () => {
  it("uses Crossref metadata to supplement and correct RSS paper fields", async () => {
    const fetchCrossref = vi.fn(async () => ({
      doi: "10.1080/24694452.2025.2592754",
      title: "Crossref title",
      abstract: "Crossref abstract with enough detail to replace the RSS description.",
      authors: ["Ada Lovelace"],
      journal: "Annals of the American Association of Geographers",
      publishedAt: new Date("2026-04-21T00:00:00.000Z"),
      url: "https://doi.org/10.1080/24694452.2025.2592754"
    }));

    const enriched = await enrichFeedPapers(
      [paper()],
      { enabled: true, crossref: { enabled: true, mailto: "" } },
      { fetchCrossref }
    );

    expect(fetchCrossref).toHaveBeenCalledWith("10.1080/24694452.2025.2592754");
    expect(enriched).toEqual([
      {
        journal: "Annals of the American Association of Geographers",
        title: "Crossref title",
        abstract: "Crossref abstract with enough detail to replace the RSS description.",
        url: "https://www.tandfonline.com/doi/full/10.1080/24694452.2025.2592754?af=R",
        doi: "10.1080/24694452.2025.2592754",
        publishedAt: new Date("2026-04-21T00:00:00.000Z"),
        authors: ["Ada Lovelace"]
      }
    ]);
  });

  it("leaves RSS metadata unchanged when no DOI is available", async () => {
    const fetchCrossref = vi.fn();

    const enriched = await enrichFeedPapers(
      [paper({ url: "https://example.test/no-doi" })],
      { enabled: true, crossref: { enabled: true, mailto: "" } },
      { fetchCrossref }
    );

    expect(fetchCrossref).not.toHaveBeenCalled();
    expect(enriched).toEqual([paper({ url: "https://example.test/no-doi" })]);
  });

  it("does not replace RSS abstracts with Crossref placeholder text", async () => {
    const fetchCrossref = vi.fn(async () => ({
      doi: "10.1080/24694452.2025.2592754",
      abstract: "."
    }));

    const enriched = await enrichFeedPapers(
      [paper({ abstract: "RSS abstract with useful text." })],
      { enabled: true, crossref: { enabled: true, mailto: "" } },
      { fetchCrossref }
    );

    expect(enriched[0]?.abstract).toBe("RSS abstract with useful text.");
  });
});
