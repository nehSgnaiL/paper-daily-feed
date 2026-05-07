import type { AppConfig } from "./app-config.js";
import { resolveFeedSources } from "./feed-sources.js";
import { fetchJournalFeeds, filterRecentPapers } from "./rss.js";
import type { FeedPaper, FeedSource, Journal } from "./types.js";

export type FeedIngestionResult = {
  sources: FeedSource[];
  allPapers: FeedPaper[];
  recentPapers: FeedPaper[];
};

export async function ingestFeedPapers(
  catalog: Journal[],
  config: AppConfig["feeds"],
  maxAgeDays: number,
  now = new Date()
): Promise<FeedIngestionResult> {
  const sources = resolveFeedSources(catalog, config);
  console.log(`Fetching ${sources.length} RSS feeds...`);
  const allPapers = await fetchJournalFeeds(sources);
  const recentPapers = filterRecentPapers(allPapers, maxAgeDays, now);
  console.log(`Fetched ${allPapers.length} RSS papers; ${recentPapers.length} are recent.`);
  return { sources, allPapers, recentPapers };
}

export async function fetchRecentFeedPapers(
  catalog: Journal[],
  config: AppConfig["feeds"],
  maxAgeDays: number,
  now = new Date()
): Promise<FeedPaper[]> {
  return (await ingestFeedPapers(catalog, config, maxAgeDays, now)).recentPapers;
}

