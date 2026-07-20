import type { AppConfig, SummaryConfig } from "./app-config.js";
import type { DeliveryHistorySession } from "./delivery-history.js";
import { renderEmail, sendEmail } from "./email.js";
import { createOpenAISummarizer, summarizeRecommendedPapers } from "./summary.js";
import type { RecommendedPaper } from "./types.js";

type Env = Record<string, string | undefined>;

type DeliveryMode = "run" | "preview-email";

export type RecommendationDeliveryResult = {
  recommendationCount: number;
  html: string;
  sent: boolean;
  deliveryDetails: string;
};

export type RecommendationDeliveryDependencies = {
  sendEmail: typeof sendEmail;
};

const defaultDependencies: RecommendationDeliveryDependencies = { sendEmail };

function describeDelivery(result: unknown): string {
  if (!result || typeof result !== "object") return "";
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

function ordinalDay(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`;
  if (day % 10 === 1) return `${day}st`;
  if (day % 10 === 2) return `${day}nd`;
  if (day % 10 === 3) return `${day}rd`;
  return `${day}th`;
}

function emailSubject(date: Date): string {
  return `Paper feed for ${ordinalDay(date.getUTCDate())} ${date.toLocaleString("en-US", {
    month: "long",
    timeZone: "UTC"
  })} ${date.getUTCFullYear()}`;
}

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

export async function deliverRecommendations(
  recommendations: RecommendedPaper[],
  mode: DeliveryMode,
  config: Pick<AppConfig, "summary" | "delivery" | "runtime">,
  deliveryHistory: DeliveryHistorySession,
  env: Env = process.env,
  now = new Date(),
  dependencies: RecommendationDeliveryDependencies = defaultDependencies
): Promise<RecommendationDeliveryResult> {
  if (recommendations.length === 0 && !config.runtime.sendEmpty && mode === "run") {
    console.log("No recommended papers above threshold. Skipping email.");
    return { recommendationCount: 0, html: "", sent: false, deliveryDetails: "" };
  }

  const prepared = await summarizeRecommendations(recommendations, config.summary, env);
  const html = renderRecommendationEmail(prepared);
  if (mode === "preview-email" || config.runtime.debug) {
    if (config.runtime.debug && mode === "run") {
      console.log(`Debug mode enabled. Skipping email send for ${prepared.length} recommendations.`);
    }
    console.log(html);
    return { recommendationCount: prepared.length, html, sent: false, deliveryDetails: "" };
  }

  console.log(`Sending ${prepared.length} recommendations via SMTP...`);
  const delivery = await dependencies.sendEmail(config.delivery, html, emailSubject(now));
  if (prepared.length > 0) {
    deliveryHistory.confirmSuccessfulDelivery(prepared, now);
  }
  const deliveryDetails = describeDelivery(delivery);
  console.log(`Sent ${prepared.length} recommendations${deliveryDetails}.`);
  return {
    recommendationCount: prepared.length,
    html,
    sent: true,
    deliveryDetails
  };
}
