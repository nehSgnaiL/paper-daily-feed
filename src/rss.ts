import Parser from "rss-parser";
import { createProgress } from "./progress.js";
import type { FeedPaper, FeedSource, Journal } from "./types.js";
import { stripHtml } from "./text.js";

type ParserItem = {
  title?: string;
  link?: string;
  guid?: string;
  content?: string;
  contentSnippet?: string;
  summary?: string;
  isoDate?: string;
  pubDate?: string;
  date?: string;
  creator?: string;
  author?: string;
  authors?: string | string[];
  dcCreators?: string | string[];
  dcDate?: string;
  prismPublicationDate?: string;
  prismCoverDate?: string;
  affiliations?: string | string[];
  dcAffiliations?: string | string[];
  prismAffiliations?: string | string[];
};

const parser = new Parser<object, ParserItem>({
  customFields: {
    item: [
      ["author", "authors", { keepArray: true }],
      ["dc:creator", "dcCreators", { keepArray: true }],
      ["dc:date", "dcDate"],
      ["prism:publicationDate", "prismPublicationDate"],
      ["prism:coverDate", "prismCoverDate"],
      ["affiliation", "affiliations", { keepArray: true }],
      ["dc:affiliation", "dcAffiliations", { keepArray: true }],
      ["prism:affiliation", "prismAffiliations", { keepArray: true }]
    ]
  }
});
const RSS_HEADERS = {
  Accept: "application/rss+xml, application/xml, text/xml, */*",
  "User-Agent": "paper-daily-feed/0.1 (+https://github.com/nehSgnaiL/paper-daily-feed)"
};

type FetchableFeed = Journal | FeedSource;

function feedLabel(feed: FetchableFeed): string {
  return "kind" in feed ? feed.name : (feed.abbr ?? feed.name);
}

function asStringArray(value: string | string[] | undefined): string[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function normalizeField(value: string): string {
  return stripHtml(value).replace(/\s+/g, " ").trim();
}

function normalizeAuthors(item: ParserItem): string[] | undefined {
  const candidates = [
    ...asStringArray(item.dcCreators),
    ...asStringArray(item.authors),
    ...asStringArray(item.creator),
    ...asStringArray(item.author)
  ];
  const authors = candidates
    .flatMap((value) => normalizeField(value).replace(/^by\s+/i, "").split(/\s*(?:;|\|)\s*/))
    .map((value) => value.trim())
    .filter((value, index, values) => value.length > 0 && values.indexOf(value) === index);

  return authors.length > 0 ? authors : undefined;
}

function normalizeFirstAffiliation(item: ParserItem): string | undefined {
  const candidates = [
    ...asStringArray(item.affiliations),
    ...asStringArray(item.dcAffiliations),
    ...asStringArray(item.prismAffiliations)
  ];
  const firstAffiliation = candidates.map(normalizeField).find((value) => value.length > 0);
  return firstAffiliation || undefined;
}

function normalizeDate(item: ParserItem): Date | null {
  const rawDate =
    item.isoDate ?? item.pubDate ?? item.date ?? item.dcDate ?? item.prismPublicationDate ?? item.prismCoverDate;
  const publishedAt = rawDate ? new Date(rawDate) : null;
  return publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null;
}

export function normalizeFeedItem(journal: string, item: ParserItem): FeedPaper | null {
  const title = stripHtml(item.title ?? "");
  const url = (item.link ?? item.guid ?? "").trim();

  if (!title || !url) {
    return null;
  }

  const authors = normalizeAuthors(item);
  const firstAffiliation = normalizeFirstAffiliation(item);

  return {
    journal,
    title,
    abstract: stripHtml(item.contentSnippet ?? item.summary ?? item.content ?? ""),
    url,
    publishedAt: normalizeDate(item),
    ...(authors ? { authors } : {}),
    ...(firstAffiliation ? { firstAffiliation } : {})
  };
}

export async function fetchJournalFeed(journal: FetchableFeed): Promise<FeedPaper[]> {
  const response = await fetch(journal.rss, {
    headers: RSS_HEADERS
  });

  if (!response.ok) {
    throw new Error(`Status code ${response.status}`);
  }

  const feed = await parser.parseString(await response.text());
  return feed.items
    .map((item) => normalizeFeedItem(feedLabel(journal), item))
    .filter((paper): paper is FeedPaper => paper !== null);
}

export async function fetchJournalFeeds(journals: FetchableFeed[]): Promise<FeedPaper[]> {
  const progress = createProgress("RSS", { total: journals.length });
  const results = await Promise.allSettled(
    journals.map(async (journal, index) => {
      const label = feedLabel(journal);
      console.log(`[RSS] start ${index + 1}/${journals.length}: ${label}`);
      const papers = await fetchJournalFeed(journal);
      progress.step(`${label}: ${papers.length} papers`);
      return papers;
    })
  );
  return results.flatMap((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    const journal = journals[index];
    progress.step(`${journal ? feedLabel(journal) : "unknown feed"} failed: ${String(result.reason)}`);
    return [];
  });
}

export function filterRecentPapers(papers: FeedPaper[], maxAgeDays: number, now = new Date()): FeedPaper[] {
  const oldest = now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000;
  return papers.filter((paper) => paper.publishedAt === null || paper.publishedAt.getTime() >= oldest);
}
