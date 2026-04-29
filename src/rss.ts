import Parser from "rss-parser";
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
};

const parser = new Parser();
const RSS_HEADERS = {
  Accept: "application/rss+xml, application/xml, text/xml, */*",
  "User-Agent": "paper-daily-feed/0.1 (+https://github.com/nehSgnaiL/paper-daily-feed)"
};

type FetchableFeed = Journal | FeedSource;

function feedLabel(feed: FetchableFeed): string {
  return "kind" in feed ? feed.name : (feed.abbr ?? feed.name);
}

export function normalizeFeedItem(journal: string, item: ParserItem): FeedPaper | null {
  const title = stripHtml(item.title ?? "");
  const url = (item.link ?? item.guid ?? "").trim();

  if (!title || !url) {
    return null;
  }

  const rawDate = item.isoDate ?? item.pubDate;
  const publishedAt = rawDate ? new Date(rawDate) : null;

  return {
    journal,
    title,
    abstract: stripHtml(item.contentSnippet ?? item.summary ?? item.content ?? ""),
    url,
    publishedAt: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null
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
  const results = await Promise.allSettled(journals.map((journal) => fetchJournalFeed(journal)));
  return results.flatMap((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    console.warn(`Failed to fetch ${journals[index]?.name}: ${String(result.reason)}`);
    return [];
  });
}

export function filterRecentPapers(papers: FeedPaper[], maxAgeDays: number, now = new Date()): FeedPaper[] {
  const oldest = now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000;
  return papers.filter((paper) => paper.publishedAt === null || paper.publishedAt.getTime() >= oldest);
}
