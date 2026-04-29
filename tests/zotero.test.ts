import { describe, expect, it } from "vitest";
import { filterCorpusByPath, normalizeZoteroItem } from "../src/zotero.js";

describe("normalizeZoteroItem", () => {
  it("converts Zotero API items with abstracts into corpus papers", () => {
    const paper = normalizeZoteroItem({
      data: {
        itemType: "journalArticle",
        title: "Urban mobility and climate adaptation",
        abstractNote: "Public transit accessibility, climate adaptation, and cities."
      }
    });

    expect(paper).toEqual({
      title: "Urban mobility and climate adaptation",
      abstract: "Public transit accessibility, climate adaptation, and cities.",
      paths: []
    });
  });

  it("returns null for unsupported item types or items without abstracts", () => {
    expect(
      normalizeZoteroItem({
        data: {
          itemType: "book",
          title: "A book",
          abstractNote: "Not a candidate corpus item."
        }
      })
    ).toBeNull();
    expect(
      normalizeZoteroItem({
        data: {
          itemType: "journalArticle",
          title: "No abstract",
          abstractNote: ""
        }
      })
    ).toBeNull();
  });

  it("filters Zotero corpus papers by include and exclude path globs", () => {
    const corpus = [
      {
        title: "Keep",
        abstract: "Urban mobility.",
        paths: ["2026/survey/mobility"]
      },
      {
        title: "Exclude",
        abstract: "Urban mobility archive.",
        paths: ["2026/survey/archive"]
      },
      {
        title: "Ignore",
        abstract: "Other paper.",
        paths: ["2025/other"]
      }
    ];

    const filtered = filterCorpusByPath(corpus, ["2026/survey/**"], ["**/archive"]);

    expect(filtered.map((paper) => paper.title)).toEqual(["Keep"]);
  });
});
