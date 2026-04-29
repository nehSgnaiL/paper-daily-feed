import { config as loadDotenv } from "dotenv";

loadDotenv({ path: [".env.local", ".env"] });

import journals from "../data/journals.config.js";
import { loadConfig } from "./config.js";
import { renderEmail, sendEmail } from "./email.js";
import { filterSubscribedJournals } from "./journals.js";
import { rankCandidates } from "./recommender.js";
import { fetchJournalFeeds, filterRecentPapers } from "./rss.js";
import { createOpenAISummarizer, summarizeRankedPapers } from "./summary.js";
import { fetchZoteroCorpus } from "./zotero.js";

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

async function main(): Promise<void> {
  const config = loadConfig();

  console.log(`Fetching Zotero corpus...`);
  const corpus = await fetchZoteroCorpus(config);
  if (corpus.length === 0) {
    throw new Error("No Zotero papers with abstracts found. Add abstracts or check Zotero API permissions.");
  }
  console.log(`Fetched ${corpus.length} Zotero corpus papers.`);

  const subscribedJournals = filterSubscribedJournals(journals, config.subscriptions);
  console.log(`Fetching ${subscribedJournals.length} journal RSS feeds...`);
  const allFeedPapers = await fetchJournalFeeds(subscribedJournals);
  const recentPapers = filterRecentPapers(allFeedPapers, config.maxPaperAgeDays);
  console.log(`Fetched ${allFeedPapers.length} RSS papers; ${recentPapers.length} are recent.`);

  let ranked = await rankCandidates(config.embedding, recentPapers, corpus, config.maxPapers);
  if (ranked.length === 0 && !config.sendEmpty) {
    console.log("No recommended papers above threshold. Skipping email.");
    return;
  }

  if (config.generation && ranked.length > 0) {
    ranked = await summarizeRankedPapers(ranked, createOpenAISummarizer(config.generation));
  }

  const html = renderEmail(ranked);
  const date = new Date().toISOString().slice(0, 10);
  if (config.debug) {
    console.log(`Debug mode enabled. Skipping email send for ${ranked.length} recommendations.`);
    console.log(html);
    return;
  }

  console.log(`Sending ${ranked.length} recommendations to ${config.email.receiver}...`);
  const delivery = await sendEmail(config, html, `Daily paper feeds ${date}`);
  console.log(`Sent ${ranked.length} recommendations${describeDelivery(delivery)}.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
