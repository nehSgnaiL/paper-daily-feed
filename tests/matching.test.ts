import { describe, expect, it } from "vitest";
import type { FeedSource, InterestDocument, MatchContext, RecommendedPaper } from "../src/types.js";

describe("neutral matching domain types", () => {
  it("supports neutral feed sources, interest documents, match context, and recommendations", () => {
    const source: FeedSource = {
      kind: "catalog",
      name: "Nature",
      rss: "https://example.test/nature.rss"
    };
    const interest: InterestDocument = {
      source: "profile",
      title: "Research profile",
      text: "Urban mobility, accessibility, and public transit equity.",
      topics: ["urban mobility", "equity"]
    };
    const matchContext: MatchContext = {
      bestMatchSource: "profile",
      bestMatchTitle: null,
      bestMatchTopics: ["urban mobility"]
    };
    const recommendation: RecommendedPaper = {
      journal: source.name,
      title: "Transit access and equity",
      abstract: "A study of public transit accessibility.",
      url: "https://example.test/transit",
      publishedAt: new Date("2026-04-29T00:00:00.000Z"),
      score: 0.91,
      matchContext,
      tldr: "Transit access varies by neighborhood."
    };

    expect(source).toMatchObject({ kind: "catalog", name: "Nature" });
    expect(interest.topics).toContain("equity");
    expect(recommendation.matchContext?.bestMatchSource).toBe("profile");
    expect(recommendation.matchContext?.bestMatchTopics).toEqual(["urban mobility"]);
  });
});
