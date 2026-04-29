import type { GenerationConfig } from "./config.js";
import type { RankedPaper } from "./types.js";

export type SummarizePaper = (paper: RankedPaper) => Promise<string>;

export function createOpenAISummarizer(config: GenerationConfig): SummarizePaper {
  return async (paper: RankedPaper) => {
    const endpoint = `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
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

export async function summarizeRankedPapers(
  papers: RankedPaper[],
  summarizePaper: SummarizePaper
): Promise<RankedPaper[]> {
  const summarized: RankedPaper[] = [];

  for (const paper of papers) {
    summarized.push({
      ...paper,
      tldr: await summarizePaper(paper)
    });
  }

  return summarized;
}
