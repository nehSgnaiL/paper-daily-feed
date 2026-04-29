import { describe, expect, it } from "vitest";
import type { ProfileInterestConfig } from "../src/app-config.js";
import { buildProfileInterestDocuments } from "../src/interest-profile.js";

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

  it("converts an enabled profile into one readable profile document", () => {
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
        title: "Interest profile",
        text: [
          "Summary: Urban analytics for equitable climate adaptation.",
          "Topics: urban analytics, climate adaptation",
          "Methods: causal inference, remote sensing",
          "Favorite journals: Nature Cities, PNAS",
          "Avoid topics: traffic prediction without policy relevance"
        ].join("\n"),
        topics: ["urban analytics", "climate adaptation"]
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
        title: "Interest profile",
        text: ["Summary: Foundation model applications.", "Topics: geospatial AI"].join("\n"),
        topics: ["geospatial AI"]
      },
      {
        source: "reference-paper",
        title: "Foundation Models for Geospatial AI",
        text: [
          "Title: Foundation Models for Geospatial AI",
          "Abstract: A survey of geospatial foundation models.",
          "Notes: Strong framing reference."
        ].join("\n"),
        topics: ["geospatial AI"]
      },
      {
        source: "reference-paper",
        title: "Title Only Reference",
        text: "Title: Title Only Reference",
        topics: ["geospatial AI"]
      }
    ]);
  });
});
