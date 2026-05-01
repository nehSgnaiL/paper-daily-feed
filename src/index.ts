import { config as loadDotenv } from "dotenv";
import { pathToFileURL } from "node:url";

loadDotenv({ path: [".env.local", ".env"], quiet: true });

import journals from "../data/journals.config.js";
import { loadAppConfig } from "./app-config.js";
import { parseCliMode, type CliMode } from "./cli.js";
import { renderEmail, sendEmail } from "./email.js";
import { resolveFeedSources } from "./feed-sources.js";
import { buildInterestCorpus } from "./interest-corpus.js";
import { rankPapers } from "./matching.js";
import { fetchJournalFeeds, filterRecentPapers } from "./rss.js";
import { createOpenAISummarizer, summarizeRecommendedPapers } from "./summary.js";

type Env = Record<string, string | undefined>;

const PROFILE_TEMPLATE = {
  interests: {
    profile: {
      enabled: true,
      summary: "",
      topics: [],
      methods: [],
      favoriteJournals: [],
      avoidTopics: [],
      referencePapers: []
    }
  }
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

async function runPipeline(mode: Exclude<CliMode, "setup-profile" | "test-config">, env: Env): Promise<void> {
  console.log("Loading app config...");
  const config = loadAppConfig(env);
  console.log("Loaded app config.");

  console.log("Building interest corpus...");
  const interestCorpus = await buildInterestCorpus(config.interests, env);
  if (interestCorpus.length === 0) {
    throw new Error("Interest corpus is empty. Enable profile or Zotero interests in app config.");
  }
  console.log(`Built ${interestCorpus.length} interest documents.`);

  const feedSources = resolveFeedSources(journals, config.feeds);
  console.log(`Fetching ${feedSources.length} RSS feeds...`);
  const allFeedPapers = await fetchJournalFeeds(feedSources);
  const recentPapers = filterRecentPapers(allFeedPapers, config.matching.maxPaperAgeDays);
  console.log(`Fetched ${allFeedPapers.length} RSS papers; ${recentPapers.length} are recent.`);

  const matchingProvider =
    config.matching.provider === "api" && config.matching.api.apiKey.trim() ? "API embeddings" : "local embeddings";
  console.log(
    `Ranking ${recentPapers.length} papers against ${interestCorpus.length} interest documents with ${matchingProvider}...`
  );
  let ranked = await rankPapers(config.matching, recentPapers, interestCorpus, env);
  console.log(`Ranked ${ranked.length} recommended papers.`);
  if (ranked.length === 0 && !config.runtime.sendEmpty && mode === "run") {
    console.log("No recommended papers above threshold. Skipping email.");
    return;
  }

  if (config.summary.enabled && config.summary.apiKey.trim() && ranked.length > 0) {
    console.log(`Generating TLDR summaries for ${ranked.length} papers...`);
    ranked = await summarizeRecommendedPapers(ranked, createOpenAISummarizer(config.summary, env));
    console.log("Generated TLDR summaries.");
  } else {
    console.log("Skipping TLDR summaries.");
  }

  console.log("Rendering email HTML...");
  const html = renderEmail(ranked);
  console.log("Rendered email HTML.");
  if (mode === "preview-email" || config.runtime.debug) {
    if (config.runtime.debug && mode === "run") {
      console.log(`Debug mode enabled. Skipping email send for ${ranked.length} recommendations.`);
    }
    console.log(html);
    return;
  }

  const date = new Date().toISOString().slice(0, 10);
  console.log(`Sending ${ranked.length} recommendations via SMTP...`);
  const delivery = await sendEmail(config.delivery, html, `Daily paper feeds ${date}`);
  console.log(`Sent ${ranked.length} recommendations${describeDelivery(delivery)}.`);
}

export async function main(args: string[] = process.argv.slice(2), env: Env = process.env): Promise<void> {
  const mode = parseCliMode(args);

  if (mode === "setup-profile") {
    console.log(JSON.stringify(PROFILE_TEMPLATE, null, 2));
    return;
  }

  if (mode === "test-config") {
    loadAppConfig(env);
    console.log("Config is valid.");
    return;
  }

  await runPipeline(mode, env);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
