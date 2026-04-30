import type { SummaryConfig } from "./app-config.js";
import type { RecommendedPaper } from "./types.js";

export type SummarizePaper = (paper: RecommendedPaper) => Promise<string>;

export function createOpenAISummarizer(
  config: SummaryConfig,
  _env: Record<string, string | undefined> = process.env
): SummarizePaper {
  return async (paper: RecommendedPaper) => {
    const apiKey = config.apiKey.trim();
    if (!apiKey) {
      throw new Error("Missing summary API key.");
    }

    const endpoint = `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "system",
            content: `You write concise one-sentence TLDR summaries for academic papers. Write the TLDR in ${config.language}.`
          },
          {
            role: "user",
            content: `Title: ${paper.title}\n\nAbstract: ${paper.abstract || "No abstract provided."}`
          }
        ],
        temperature: 0.2,
        ...(config.maxTokens ? { max_tokens: config.maxTokens } : {})
      })
    });

    if (!response.ok) {
      throw new Error(`Generation API request failed (${response.status} ${response.statusText}).`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return payload.choices?.[0]?.message?.content?.trim() || paper.abstract;
  };
}

export async function summarizeRecommendedPapers(
  papers: RecommendedPaper[],
  summarizePaper: SummarizePaper
): Promise<RecommendedPaper[]> {
  const summarized: RecommendedPaper[] = [];

  for (const paper of papers) {
    summarized.push({
      ...paper,
      tldr: await summarizePaper(paper)
    });
  }

  return summarized;
}
