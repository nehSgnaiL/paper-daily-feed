import { afterEach, describe, expect, it, vi } from "vitest";
import { createOpenAISummarizer, summarizeRankedPapers } from "../src/summary.js";
import type { RankedPaper } from "../src/types.js";

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

    const summarize = createOpenAISummarizer({
      apiKey: "llm-key",
      baseUrl: "https://example.test/v1",
      model: "Qwen/Qwen3-8B",
      language: "Chinese",
      maxTokens: 2048
    });

    await summarize({
      journal: "Nature",
      title: "Urban mobility",
      abstract: "A paper about urban mobility.",
      url: "https://example.test/paper",
      publishedAt: null,
      score: 0.9,
      matchedZoteroTitle: "Transport equity"
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.test/v1/chat/completions",
      expect.objectContaining({
        body: expect.stringContaining('"model":"Qwen/Qwen3-8B"')
      })
    );
    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(String(requestInit?.body)).toContain("Chinese");
    expect(String(requestInit?.body)).toContain('"max_tokens":2048');
  });

  it("adds TLDR summaries to ranked papers", async () => {
    const papers: RankedPaper[] = [
      {
        journal: "Nature",
        title: "Urban mobility",
        abstract: "A paper about urban mobility.",
        url: "https://example.test/paper",
        publishedAt: null,
        score: 0.9,
        matchedZoteroTitle: "Transport equity"
      }
    ];

    const summarized = await summarizeRankedPapers(papers, async () => "A concise TLDR.");

    expect(summarized[0].tldr).toBe("A concise TLDR.");
  });
});
