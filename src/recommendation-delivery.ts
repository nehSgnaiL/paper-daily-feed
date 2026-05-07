import type { SummaryConfig } from "./app-config.js";
import { renderEmail } from "./email.js";
import { createOpenAISummarizer, summarizeRecommendedPapers } from "./summary.js";
import type { RecommendedPaper } from "./types.js";

type Env = Record<string, string | undefined>;

export async function summarizeRecommendations(
  recommendations: RecommendedPaper[],
  config: SummaryConfig,
  env: Env = process.env
): Promise<RecommendedPaper[]> {
  if (config.enabled && config.apiKey.trim() && recommendations.length > 0) {
    console.log(`Generating TLDR summaries for ${recommendations.length} papers...`);
    const summarized = await summarizeRecommendedPapers(recommendations, createOpenAISummarizer(config, env));
    console.log("Generated TLDR summaries.");
    return summarized;
  }

  console.log("Skipping TLDR summaries.");
  return recommendations;
}

export function renderRecommendationEmail(recommendations: RecommendedPaper[]): string {
  console.log("Rendering email HTML...");
  const html = renderEmail(recommendations);
  console.log("Rendered email HTML.");
  return html;
}

