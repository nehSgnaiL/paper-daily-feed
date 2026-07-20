import type { AppConfig } from "./app-config.js";
import { fetchFeedSources, type FetchFeedSourcesOptions } from "./rss.js";
import type { FeedPaper, FeedSource, Journal } from "./types.js";

export type FeedIngestionResult = {
  sources: FeedSource[];
  allPapers: FeedPaper[];
  recentPapers: FeedPaper[];
};

export type FeedIngestionOptions = {
  fetchSources?: typeof fetchFeedSources;
  fetchOptions?: FetchFeedSourcesOptions;
};

function selectedCatalogFeeds(catalog: Journal[], selections: string[] | null): Journal[] {
  if (!selections || selections.length === 0) {
    return catalog;
  }

  const normalizedSelections = new Set(selections.map((value) => value.trim().toLowerCase()));
  const selected = catalog.filter((journal) =>
    [journal.name, journal.abbr].some((value) => value && normalizedSelections.has(value.trim().toLowerCase()))
  );
  const knownSelections = new Set(
    selected.flatMap((journal) => [journal.name, journal.abbr].filter((value): value is string => Boolean(value)))
      .map((value) => value.trim().toLowerCase())
  );
  const unknown = selections.filter((value) => !knownSelections.has(value.trim().toLowerCase()));
  if (unknown.length > 0) {
    throw new Error(`Unknown journal subscription(s): ${unknown.join(", ")}.`);
  }
  return selected;
}

function configuredFeedSources(catalog: Journal[], config: AppConfig["feeds"]): FeedSource[] {
  const catalogSources: FeedSource[] = (config.includeCatalog === false
    ? []
    : selectedCatalogFeeds(catalog, config.catalogSelections)
  ).map((journal) => ({
    kind: "catalog",
    name: journal.abbr ?? journal.name,
    rss: journal.rss,
    ...(journal.issn ? { issn: journal.issn } : {})
  }));
  const customSources: FeedSource[] = config.customRss.map((feed) => ({
    kind: "custom",
    name: feed.name,
    rss: feed.rss
  }));
  return [...catalogSources, ...customSources];
}

function recentFeedPapers(papers: FeedPaper[], maxAgeDays: number, now: Date): FeedPaper[] {
  const oldest = now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000;
  return papers.filter((paper) => paper.publishedAt === null || paper.publishedAt.getTime() >= oldest);
}

export async function ingestFeedPapers(
  catalog: Journal[],
  config: AppConfig["feeds"],
  maxAgeDays: number,
  now = new Date(),
  options: FeedIngestionOptions = {}
): Promise<FeedIngestionResult> {
  const sources = configuredFeedSources(catalog, config);
  console.log(`Fetching ${sources.length} RSS feeds...`);
  const allPapers = await (options.fetchSources ?? fetchFeedSources)(sources, options.fetchOptions);
  const recentPapers = recentFeedPapers(allPapers, maxAgeDays, now);
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
