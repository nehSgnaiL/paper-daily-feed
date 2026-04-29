import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchZoteroInterestDocuments,
  filterCorpusByPath,
  normalizeZoteroInterestDocument,
  normalizeZoteroItem
} from "../src/zotero.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

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

describe("normalizeZoteroInterestDocument", () => {
  it("converts supported Zotero API items into neutral interest documents", () => {
    const document = normalizeZoteroInterestDocument({
      data: {
        itemType: "preprint",
        title: "Urban mobility and climate adaptation",
        abstractNote: "Public transit accessibility, climate adaptation, and cities."
      }
    });

    expect(document).toEqual({
      source: "zotero",
      title: "Urban mobility and climate adaptation",
      text: [
        "Title: Urban mobility and climate adaptation",
        "Abstract: Public transit accessibility, climate adaptation, and cities."
      ].join("\n"),
      topics: []
    });
  });

  it("returns null for unsupported Zotero interest documents", () => {
    expect(
      normalizeZoteroInterestDocument({
        data: {
          itemType: "book",
          title: "A book",
          abstractNote: "Not a candidate interest document."
        }
      })
    ).toBeNull();
  });
});

describe("fetchZoteroInterestDocuments", () => {
  it("returns no documents without enabled Zotero credentials", async () => {
    const fetchMock = vi.fn(() => {
      throw new Error("fetch should not be called");
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchZoteroInterestDocuments(
        {
          enabled: false,
          userId: "123",
          apiKeyEnv: "ZOTERO_KEY",
          libraryType: "user",
          includeCollections: [],
          excludeCollections: []
        },
        { ZOTERO_KEY: "secret" }
      )
    ).resolves.toEqual([]);
    await expect(
      fetchZoteroInterestDocuments(
        {
          enabled: true,
          userId: "",
          apiKeyEnv: "ZOTERO_KEY",
          libraryType: "user",
          includeCollections: [],
          excludeCollections: []
        },
        { ZOTERO_KEY: "secret" }
      )
    ).resolves.toEqual([]);
    await expect(
      fetchZoteroInterestDocuments(
        {
          enabled: true,
          userId: "123",
          apiKeyEnv: "ZOTERO_KEY",
          libraryType: "user",
          includeCollections: [],
          excludeCollections: []
        },
        {}
      )
    ).resolves.toEqual([]);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
