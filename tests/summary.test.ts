import { afterEach, describe, expect, it, vi } from "vitest";
import { createOpenAISummarizer, summarizeRecommendedPapers } from "../src/summary.js";
import type { SummaryConfig } from "../src/app-config.js";
import type { RecommendedPaper } from "../src/types.js";

const summaryConfig: SummaryConfig = {
  enabled: true,
  baseUrl: "https://example.test/v1",
  model: "Qwen/Qwen3-8B",
  apiKeyEnv: "SUMMARY_API_KEY",
  language: "Chinese",
  maxTokens: 2048
};

describe("createOpenAISummarizer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes the configured generation model as the chat completion model parameter", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "A concise TLDR." } }]
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const summarize = createOpenAISummarizer(summaryConfig, {
      SUMMARY_API_KEY: "llm-key"
    });

    await summarize({
      journal: "Nature",
      title: "Urban mobility",
      abstract: "A paper about urban mobility.",
      url: "https://example.test/paper",
      publishedAt: null,
      score: 0.9,
      matchContext: {
        bestMatchSource: "zotero",
        bestMatchTitle: "Transport equity",
        bestMatchTopics: ["transport"]
      }
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.test/v1/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer llm-key"
        }),
        body: expect.stringContaining('"model":"Qwen/Qwen3-8B"')
      })
    );
    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(String(requestInit?.body)).toContain("Chinese");
    expect(String(requestInit?.body)).toContain('"max_tokens":2048');
  });

  it("throws a clear error when the configured summary API key is missing", async () => {
    const summarize = createOpenAISummarizer(summaryConfig, {});

    await expect(
      summarize({
        journal: "Nature",
        title: "Urban mobility",
        abstract: "A paper about urban mobility.",
        url: "https://example.test/paper",
        publishedAt: null,
        score: 0.9,
        matchContext: null
      })
    ).rejects.toThrow("Missing summary API key: SUMMARY_API_KEY.");
  });

  it("adds TLDR summaries to ranked papers", async () => {
    const papers: RecommendedPaper[] = [
      {
        journal: "Nature",
        title: "Urban mobility",
        abstract: "A paper about urban mobility.",
        url: "https://example.test/paper",
        publishedAt: null,
        score: 0.9,
        matchContext: {
          bestMatchSource: "zotero",
          bestMatchTitle: "Transport equity",
          bestMatchTopics: ["transport"]
        }
      }
    ];

    const summarized = await summarizeRecommendedPapers(papers, async () => "A concise TLDR.");

    expect(summarized[0].tldr).toBe("A concise TLDR.");
  });
});
