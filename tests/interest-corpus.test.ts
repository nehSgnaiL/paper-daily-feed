import { describe, expect, it } from "vitest";
import type { AppConfig, ProfileInterestConfig, ZoteroInterestConfig } from "../src/app-config.js";
import { buildInterestCorpus } from "../src/interest-corpus.js";
import { buildProfileInterestDocuments } from "../src/interest-profile.js";
import type { InterestDocument } from "../src/types.js";

function profileConfig(overrides: Partial<ProfileInterestConfig> = {}): ProfileInterestConfig {
  return {
    enabled: true,
    summary: "",
    topics: [],
    methods: [],
    favoriteJournals: [],
    avoidTopics: [],
    referencePapers: [],
    ...overrides
  };
}

function zoteroConfig(overrides: Partial<ZoteroInterestConfig> = {}): ZoteroInterestConfig {
  return {
    enabled: false,
    userId: "",
    apiKey: "",
    libraryType: "user",
    includeCollections: [],
    excludeCollections: [],
    ...overrides
  };
}

function interestsConfig(overrides: {
  profile?: Partial<ProfileInterestConfig>;
  zotero?: Partial<ZoteroInterestConfig>;
} = {}): AppConfig["interests"] {
  return {
    profile: profileConfig(overrides.profile),
    zotero: zoteroConfig(overrides.zotero)
  };
}

describe("buildProfileInterestDocuments", () => {
  it("returns no documents when the profile is disabled", () => {
    const documents = buildProfileInterestDocuments(
      profileConfig({
        enabled: false,
        summary: "Ignored research profile",
        topics: ["ignored"],
        referencePapers: [{ title: "Ignored reference" }]
      })
    );

    expect(documents).toEqual([]);
  });

  it("converts an enabled profile into atomic positive and negative interest documents", () => {
    const documents = buildProfileInterestDocuments(
      profileConfig({
        summary: "Urban analytics for equitable climate adaptation.",
        topics: ["urban analytics", "climate adaptation"],
        methods: ["causal inference", "remote sensing"],
        favoriteJournals: ["Nature Cities", "PNAS"],
        avoidTopics: ["traffic prediction without policy relevance"]
      })
    );

    expect(documents).toEqual([
      {
        source: "profile",
        title: "Interest summary",
        text: "Summary: Urban analytics for equitable climate adaptation.",
        topics: ["urban analytics", "climate adaptation"],
        kind: "summary",
        label: "Interest summary",
        polarity: "positive"
      },
      {
        source: "profile",
        title: "urban analytics",
        text: "Topic: urban analytics",
        topics: ["urban analytics"],
        kind: "topic",
        label: "urban analytics",
        polarity: "positive"
      },
      {
        source: "profile",
        title: "climate adaptation",
        text: "Topic: climate adaptation",
        topics: ["climate adaptation"],
        kind: "topic",
        label: "climate adaptation",
        polarity: "positive"
      },
      {
        source: "profile",
        title: "causal inference",
        text: "Method: causal inference",
        topics: ["urban analytics", "climate adaptation"],
        kind: "method",
        label: "causal inference",
        polarity: "positive"
      },
      {
        source: "profile",
        title: "remote sensing",
        text: "Method: remote sensing",
        topics: ["urban analytics", "climate adaptation"],
        kind: "method",
        label: "remote sensing",
        polarity: "positive"
      },
      {
        source: "profile",
        title: "Nature Cities",
        text: "Favorite journal: Nature Cities",
        topics: ["urban analytics", "climate adaptation"],
        kind: "favorite-journal",
        label: "Nature Cities",
        polarity: "positive"
      },
      {
        source: "profile",
        title: "PNAS",
        text: "Favorite journal: PNAS",
        topics: ["urban analytics", "climate adaptation"],
        kind: "favorite-journal",
        label: "PNAS",
        polarity: "positive"
      },
      {
        source: "profile",
        title: "traffic prediction without policy relevance",
        text: "Avoid topic: traffic prediction without policy relevance",
        topics: ["traffic prediction without policy relevance"],
        kind: "topic",
        label: "traffic prediction without policy relevance",
        polarity: "negative"
      }
    ]);
  });

  it("adds reference paper documents with optional text parts omitted when empty", () => {
    const documents = buildProfileInterestDocuments(
      profileConfig({
        summary: "Foundation model applications.",
        topics: ["geospatial AI"],
        referencePapers: [
          {
            title: "Foundation Models for Geospatial AI",
            abstract: "A survey of geospatial foundation models.",
            notes: "Strong framing reference."
          },
          {
            title: "Title Only Reference"
          }
        ]
      })
    );

    expect(documents).toEqual([
      {
        source: "profile",
        title: "Interest summary",
        text: "Summary: Foundation model applications.",
        topics: ["geospatial AI"],
        kind: "summary",
        label: "Interest summary",
        polarity: "positive"
      },
      {
        source: "profile",
        title: "geospatial AI",
        text: "Topic: geospatial AI",
        topics: ["geospatial AI"],
        kind: "topic",
        label: "geospatial AI",
        polarity: "positive"
      },
      {
        source: "reference-paper",
        title: "Foundation Models for Geospatial AI",
        text: [
          "Title: Foundation Models for Geospatial AI",
          "Abstract: A survey of geospatial foundation models.",
          "Notes: Strong framing reference."
        ].join("\n"),
        topics: ["geospatial AI"],
        kind: "reference-paper",
        label: "Foundation Models for Geospatial AI",
        polarity: "positive"
      },
      {
        source: "reference-paper",
        title: "Title Only Reference",
        text: "Title: Title Only Reference",
        topics: ["geospatial AI"],
        kind: "reference-paper",
        label: "Title Only Reference",
        polarity: "positive"
      }
    ]);
  });
});

describe("buildInterestCorpus", () => {
  it("merges profile, reference paper, and Zotero interest documents", async () => {
    const zoteroDocuments: InterestDocument[] = [
      {
        source: "zotero",
        title: "Zotero reference",
        text: "Title: Zotero reference\nAbstract: Imported abstract.",
        topics: []
      }
    ];

    const documents = await buildInterestCorpus(
      interestsConfig({
        profile: {
          summary: "Urban climate adaptation.",
          topics: ["urban analytics"],
          referencePapers: [{ title: "Reference Paper", abstract: "Reference abstract." }]
        },
        zotero: {
          enabled: true,
          userId: "123",
          apiKey: "secret"
        }
      }),
      {},
      async () => zoteroDocuments
    );

    expect(documents.map((document) => document.source)).toEqual(["profile", "profile", "reference-paper", "zotero"]);
    expect(documents[3]).toBe(zoteroDocuments[0]);
  });

  it("does not fetch Zotero interest documents when Zotero is disabled", async () => {
    let fetchCalls = 0;

    const documents = await buildInterestCorpus(
      interestsConfig({
        profile: {
          summary: "Profile only.",
          topics: ["profile"]
        },
        zotero: {
          enabled: false,
          userId: "123",
          apiKey: "secret"
        }
      }),
      {},
      async () => {
        fetchCalls += 1;
        return [];
      }
    );

    expect(fetchCalls).toBe(0);
    expect(documents.map((document) => document.source)).toEqual(["profile", "profile"]);
  });
});
