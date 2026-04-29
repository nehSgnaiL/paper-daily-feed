import type { AppConfig } from "./app-config.js";
import { filterSubscribedJournals } from "./journals.js";
import type { FeedSource, Journal } from "./types.js";

export function resolveFeedSources(catalog: Journal[], config: AppConfig["feeds"]): FeedSource[] {
  const selectedCatalog = filterSubscribedJournals(catalog, config.catalogSelections);
  const catalogSources: FeedSource[] = selectedCatalog.map((journal) => ({
    kind: "catalog",
    name: journal.abbr ?? journal.name,
    rss: journal.rss
  }));

  const customSources: FeedSource[] = config.customRss.map((feed) => ({
    kind: "custom",
    name: feed.name,
    rss: feed.rss
  }));

  return [...catalogSources, ...customSources];
}
