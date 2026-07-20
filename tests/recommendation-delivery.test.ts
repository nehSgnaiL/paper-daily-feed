import { afterEach, describe, expect, it, mock } from "bun:test";
import type { AppConfig } from "../src/app-config.js";
import { deliverRecommendations } from "../src/recommendation-delivery.js";
import type { RecommendedPaper } from "../src/types.js";
import { stubFetch } from "./test-support.js";

afterEach(() => {
  mock.restore();
});

const recommendation: RecommendedPaper = {
  journal: "Nature",
  title: "Resilient streets",
  abstract: "Original abstract retained when summary generation fails.",
  url: "https://example.test/paper",
  publishedAt: new Date("2026-07-01T00:00:00Z"),
  score: 0.9,
  matchContext: null
};

const config: Pick<AppConfig, "summary" | "delivery" | "runtime"> = {
  summary: {
    enabled: true,
    baseUrl: "https://api.example.test/v1",
    model: "summary-model",
    apiKey: "key",
    language: "Chinese",
    maxTokens: 128
  },
  delivery: {
    mode: "smtp",
    from: "sender@example.test",
    to: "reader@example.test",
    smtpHost: "smtp.example.test",
    smtpPort: 465,
    smtpPassword: "password"
  },
  runtime: { debug: false, sendEmpty: false }
};

describe("Recommendation Delivery", () => {
  it("falls back to the original abstract when one AI summary fails", async () => {
    stubFetch(mock(async () => new Response("unavailable", { status: 503 })));

    const result = await deliverRecommendations([recommendation], "preview-email", config, {
      filterUndeliveredPapers: (papers) => papers,
      confirmSuccessfulDelivery: () => undefined
    });

    expect(result.sent).toBe(false);
    expect(result.html).toContain("Original abstract retained when summary generation fails.");
  });
});
