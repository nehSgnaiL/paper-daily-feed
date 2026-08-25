import type { AppConfig, SummaryConfig } from "./app-config.js";
import type { DeliveryHistorySession } from "./delivery-history.js";
import { fetchDailyRomance, type DailyRomance } from "./daily-romance.js";
import { renderEmail, sendEmail } from "./email.js";
import { createOpenAIEditorialSummarizer, type EditorialDigest } from "./summary.js";
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
  fetchDailyRomance?: typeof fetchDailyRomance;
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

function datedEmailSubject(date: Date): string {
  return `Paper feed for ${ordinalDay(date.getUTCDate())} ${date.toLocaleString("en-US", {
    month: "long",
    timeZone: "UTC"
  })} ${date.getUTCFullYear()}`;
}

function researchProfile(interests: AppConfig["interests"]): string {
  const profile = interests.profile;
  return [
    profile.summary,
    profile.topics.length > 0 ? `Topics: ${profile.topics.join(", ")}` : "",
    profile.methods.length > 0 ? `Methods: ${profile.methods.join(", ")}` : "",
    profile.favoriteJournals.length > 0
      ? `Favorite journals: ${profile.favoriteJournals.join(", ")}`
      : ""
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateEditorialDigest(
  recommendations: RecommendedPaper[],
  config: SummaryConfig,
  interests: AppConfig["interests"],
  _env: Env = process.env
): Promise<EditorialDigest | null> {
  if (config.enabled && config.apiKey.trim() && recommendations.length > 0) {
    console.log(`Generating an editorial digest for ${recommendations.length} papers...`);
    try {
      const digest = await createOpenAIEditorialSummarizer(config)(
        recommendations,
        researchProfile(interests)
      );
      console.log("Generated editorial digest.");
      return digest;
    } catch (error) {
      console.log(
        `[summary] editorial digest generation failed; using abstract excerpts: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    }
  }

  console.log("Skipping editorial digest; using abstract excerpts.");
  return null;
}

export function renderRecommendationEmail(
  recommendations: RecommendedPaper[],
  romance: DailyRomance | null = null,
  digest: EditorialDigest | null = null,
  now = new Date()
): string {
  console.log("Rendering email HTML...");
  const html = renderEmail(recommendations, romance, digest, now);
  console.log("Rendered email HTML.");
  return html;
}

export async function deliverRecommendations(
  recommendations: RecommendedPaper[],
  mode: DeliveryMode,
  config: Pick<AppConfig, "interests" | "summary" | "dailyRomance" | "delivery" | "runtime">,
  deliveryHistory: DeliveryHistorySession,
  env: Env = process.env,
  now = new Date(),
  dependencies: RecommendationDeliveryDependencies = defaultDependencies
): Promise<RecommendationDeliveryResult> {
  if (recommendations.length === 0 && !config.runtime.sendEmpty && mode === "run") {
    console.log("No recommended papers above threshold. Skipping email.");
    return { recommendationCount: 0, html: "", sent: false, deliveryDetails: "" };
  }

  const digest = await generateEditorialDigest(recommendations, config.summary, config.interests, env);
  const romance = config.dailyRomance.enabled
    ? await (dependencies.fetchDailyRomance ?? fetchDailyRomance)()
    : null;
  const html = renderRecommendationEmail(recommendations, romance, digest, now);
  if (mode === "preview-email" || config.runtime.debug) {
    if (config.runtime.debug && mode === "run") {
      console.log(`Debug mode enabled. Skipping email send for ${recommendations.length} recommendations.`);
    }
    console.log(html);
    return { recommendationCount: recommendations.length, html, sent: false, deliveryDetails: "" };
  }

  console.log(`Sending ${recommendations.length} recommendations via SMTP...`);
  const delivery = await dependencies.sendEmail(config.delivery, html, datedEmailSubject(now));
  if (recommendations.length > 0) {
    deliveryHistory.confirmSuccessfulDelivery(recommendations, now);
  }
  const deliveryDetails = describeDelivery(delivery);
  console.log(`Sent ${recommendations.length} recommendations${deliveryDetails}.`);
  return {
    recommendationCount: recommendations.length,
    html,
    sent: true,
    deliveryDetails
  };
}
