import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import { repairRecommendationMetadata } from "../src/paper-metadata.js";
import type { MetadataRepairConfig } from "../src/app-config.js";
import type { RecommendedPaper } from "../src/types.js";

const enabledConfig: MetadataRepairConfig = {
  enabled: true,
  model: "ner-test",
  timeoutMs: 300000
};

function paper(overrides: Partial<RecommendedPaper> = {}): RecommendedPaper {
  return {
    journal: "Urban Geography",
    title: "AI Urbanism",
    abstract: "",
    url: "https://example.test/paper",
    publishedAt: null,
    authors: ["Jun Zhang", "Andrew Cox", "Jing Wang"],
    firstAffiliation: "School of Information",
    score: 0.8,
    matchContext: null,
    ...overrides
  };
}

describe("repairRecommendationMetadata", () => {
  afterEach(() => {
    mock.restore();
  });

  it("keeps parsed metadata when repair is disabled", async () => {
    const recommendations = [paper()];

    await expect(
      repairRecommendationMetadata(recommendations, { ...enabledConfig, enabled: false }, async () => {
        throw new Error("should not load");
      })
    ).resolves.toEqual(recommendations);
  });

  it("uses NER entities to conservatively improve selected recommendation metadata", async () => {
    const recommendations = [
      paper({
        authors: ["Jun Zhang Andrew Cox Jing Wang"],
        firstAffiliation: "School",
        metadataText:
          "Jun Zhang Andrew Cox Jing Wang a School of Information, Journalism and Communication, University of Sheffield"
      })
    ];

    const repaired = await repairRecommendationMetadata(recommendations, enabledConfig, async () => async () => [
      { entity: "B-PER", word: "Jun" },
      { entity: "I-PER", word: "Zhang" },
      { entity: "B-PER", word: "Andrew" },
      { entity: "I-PER", word: "Cox" },
      { entity: "B-PER", word: "Jing" },
      { entity: "I-PER", word: "Wang" },
      { entity: "B-ORG", word: "School" },
      { entity: "I-ORG", word: "of" },
      { entity: "I-ORG", word: "Information" },
      { entity: "I-ORG", word: "University" }
    ]);

    expect(repaired[0]).toMatchObject({
      authors: ["Jun Zhang", "Andrew Cox", "Jing Wang"],
      firstAffiliation: "School of Information University"
    });
  });

  it("keeps current metadata when NER load fails or times out", async () => {
    const logSpy = spyOn(console, "log").mockImplementation(() => undefined);
    const recommendations = [paper()];

    await expect(
      repairRecommendationMetadata(recommendations, enabledConfig, async () => {
        throw new Error("model unavailable");
      })
    ).resolves.toEqual(recommendations);

    await expect(
      repairRecommendationMetadata(
        recommendations,
        { ...enabledConfig, timeoutMs: 1 },
        async () => async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return [];
        }
      )
    ).resolves.toEqual(recommendations);

    expect(logSpy.mock.calls.flat().join("\n")).toContain("[paper-metadata] NER skipped: model unavailable");
    expect(logSpy.mock.calls.flat().join("\n")).toContain("[paper-metadata] NER skipped: metadata repair timeout");
  });

  it("logs metadata repair progress and counts", async () => {
    const logSpy = spyOn(console, "log").mockImplementation(() => undefined);
    const recommendations = [
      paper({
        authors: ["Jun Zhang Andrew Cox Jing Wang"],
        firstAffiliation: "School",
        metadataText:
          "Jun Zhang Andrew Cox Jing Wang a School of Information, Journalism and Communication, University of Sheffield"
      })
    ];

    await repairRecommendationMetadata(recommendations, enabledConfig, async () => async () => [
      { entity: "B-PER", word: "Jun" },
      { entity: "I-PER", word: "Zhang" },
      { entity: "B-PER", word: "Andrew" },
      { entity: "I-PER", word: "Cox" },
      { entity: "B-PER", word: "Jing" },
      { entity: "I-PER", word: "Wang" },
      { entity: "B-ORG", word: "School" },
      { entity: "I-ORG", word: "of" },
      { entity: "I-ORG", word: "Information" },
      { entity: "I-ORG", word: "University" }
    ]);

    expect(logSpy.mock.calls.flat().join("\n")).toContain("[paper-metadata] loading NER model ner-test");
    expect(logSpy.mock.calls.flat().join("\n")).toContain(
      "[paper-metadata] NER repaired authors for 1/1, affiliations for 1/1"
    );
  });
});
