import journals from "../data/journals.config.js";
import type { AppConfig } from "./app-config.js";
import { loadAppConfig } from "./app-config.js";
import { configSummaryLines } from "./config-summary.js";
import {
  filterUndeliveredPapers,
  loadDeliveryHistory,
  recordDeliveredPapers,
  saveDeliveryHistory,
  DELIVERY_HISTORY_PATH
} from "./delivery-history.js";
import { sendEmail } from "./email.js";
import { buildInterestCorpus } from "./interest-corpus.js";
import { rankPapers } from "./matching.js";
import { repairRecommendationMetadata } from "./metadata-repair.js";
import { enrichFeedPapers } from "./metadata-enrichment.js";
import { renderRecommendationEmail, summarizeRecommendations } from "./recommendation-delivery.js";
import { fetchRecentFeedPapers } from "./feed-ingestion.js";

type Env = Record<string, string | undefined>;

export type DailyFeedMode = "run" | "preview-email";

export type DailyFeedResult = {
  recommendationCount: number;
  html: string;
  sent: boolean;
  deliveryDetails: string;
};

function describeDelivery(result: unknown): string {
  if (!result || typeof result !== "object") {
    return "";
  }
  const delivery = result as { messageId?: unknown; accepted?: unknown };
  const details: string[] = [];
  if (typeof delivery.messageId === "string" && delivery.messageId.length > 0) {
    details.push(`message id ${delivery.messageId}`);
  }
  if (Array.isArray(delivery.accepted) && delivery.accepted.length > 0) {
    details.push(`accepted by SMTP for ${delivery.accepted.join(", ")}`);
  }
  return details.length > 0 ? ` (${details.join("; ")})` : "";
}

function matchingProvider(config: AppConfig): string {
  return config.matching.provider === "api" && config.matching.api.apiKey.trim() ? "API embeddings" : "local embeddings";
}

function ordinalDay(day: number): string {
  if (day >= 11 && day <= 13) {
    return `${day}th`;
  }

  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

function emailSubject(date = new Date()): string {
  return `Paper feed for ${ordinalDay(date.getUTCDate())} ${date.toLocaleString("en-US", {
    month: "long",
    timeZone: "UTC"
  })} ${date.getUTCFullYear()}`;
}

export async function runDailyFeed(
  mode: DailyFeedMode,
  env: Env = process.env,
  config: AppConfig = loadAppConfig(env)
): Promise<DailyFeedResult> {
  console.log("Loaded app config.");
  for (const line of configSummaryLines(config)) {
    console.log(line);
  }

  console.log("Building interest corpus...");
  const interestCorpus = await buildInterestCorpus(config.interests, env);
  if (interestCorpus.length === 0) {
    throw new Error("Interest corpus is empty. Enable profile or Zotero interests in app config.");
  }
  console.log(`Built ${interestCorpus.length} interest documents.`);

  const recentPapers = await fetchRecentFeedPapers(journals, config.feeds, config.matching.maxPaperAgeDays);
  const deliveryHistory = loadDeliveryHistory();
  const eligiblePapers = filterUndeliveredPapers(recentPapers, deliveryHistory, env);
  console.log(
    `Filtered ${recentPapers.length - eligiblePapers.length} already delivered papers; ${eligiblePapers.length} candidates remain.`
  );
  const enrichedPapers = await enrichFeedPapers(eligiblePapers, config.metadataEnrichment);
  console.log(`Ranking ${enrichedPapers.length} papers against ${interestCorpus.length} interest documents with ${matchingProvider(config)}...`);
  let recommendations = await rankPapers(config.matching, enrichedPapers, interestCorpus, env);
  console.log(`Ranked ${recommendations.length} recommended papers.`);
  recommendations = await repairRecommendationMetadata(recommendations, config.metadataRepair);

  if (recommendations.length === 0 && !config.runtime.sendEmpty && mode === "run") {
    console.log("No recommended papers above threshold. Skipping email.");
    return { recommendationCount: 0, html: "", sent: false, deliveryDetails: "" };
  }

  recommendations = await summarizeRecommendations(recommendations, config.summary, env);
  const html = renderRecommendationEmail(recommendations);

  if (mode === "preview-email" || config.runtime.debug) {
    if (config.runtime.debug && mode === "run") {
      console.log(`Debug mode enabled. Skipping email send for ${recommendations.length} recommendations.`);
    }
    console.log(html);
    return { recommendationCount: recommendations.length, html, sent: false, deliveryDetails: "" };
  }

  console.log(`Sending ${recommendations.length} recommendations via SMTP...`);
  const delivery = await sendEmail(config.delivery, html, emailSubject());
  if (recommendations.length > 0) {
    saveDeliveryHistory(DELIVERY_HISTORY_PATH, recordDeliveredPapers(deliveryHistory, recommendations, new Date(), env));
  }
  const deliveryDetails = describeDelivery(delivery);
  console.log(`Sent ${recommendations.length} recommendations${deliveryDetails}.`);
  return { recommendationCount: recommendations.length, html, sent: true, deliveryDetails };
}
