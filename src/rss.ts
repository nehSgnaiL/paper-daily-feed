import Parser from "rss-parser";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createProgress } from "./progress.js";
import { fetchCrossrefJournalWorks, type CrossrefMetadata } from "./crossref.js";
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

type RssHeaders = Record<string, string>;

const RSS_COMMON_HEADERS = {
  Accept: "application/rss+xml, application/rdf+xml, application/atom+xml, application/xml, text/xml, */*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache"
} satisfies RssHeaders;

const RSS_BROWSER_NAVIGATION_HEADERS = {
  Connection: "keep-alive",
  DNT: "1",
  Priority: "u=0, i",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1"
} satisfies RssHeaders;

const RSS_HEADER_PROFILES: RssHeaders[] = [
  {
    "User-Agent": "paper-daily-feed/0.1.2 (+https://github.com/nehSgnaiL/paper-daily-feed)"
  },
  {
    ...RSS_BROWSER_NAVIGATION_HEADERS,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Sec-CH-UA": '"Chromium";v="126", "Google Chrome";v="126", "Not-A.Brand";v="99"',
    "Sec-CH-UA-Mobile": "?0",
    "Sec-CH-UA-Platform": '"Windows"'
  },
  {
    ...RSS_BROWSER_NAVIGATION_HEADERS,
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15"
  },
  {
    ...RSS_BROWSER_NAVIGATION_HEADERS,
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0"
  }
];

let rssHeaderProfileIndex = 0;

function nextRssHeaders(): RssHeaders {
  const profile = RSS_HEADER_PROFILES[rssHeaderProfileIndex % RSS_HEADER_PROFILES.length] ?? {};
  rssHeaderProfileIndex += 1;
  return rssHeadersForProfile(profile);
}

function rssHeadersForProfile(profile: RssHeaders): RssHeaders {
  return {
    ...RSS_COMMON_HEADERS,
    ...profile
  };
}

type FetchableFeed = Journal | FeedSource;

type FetchJournalFeedsOptions = {
  delayMs?: number;
  delayRangeMs?: {
    minMs: number;
    maxMs: number;
  };
  retryCount?: number;
  retryDelayMs?: number;
  deferredRetryDelayMs?: number;
  curlFallback?: boolean;
  curlFetcher?: (journal: FetchableFeed) => Promise<FeedPaper[]>;
  crossrefFetcher?: (issn: string) => Promise<CrossrefMetadata[]>;
};

const DEFAULT_RSS_REQUEST_DELAY_RANGE_MS = {
  minMs: 1_200,
  maxMs: 2_500
};
const DEFAULT_RSS_RETRY_COUNT = 2;
const DEFAULT_RSS_RETRY_DELAY_MS = 5_000;
const DEFAULT_RSS_DEFERRED_RETRY_DELAY_MS = 10_000;
const execFileAsync = promisify(execFile);

function wait(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

function sampleDelayMs(range: { minMs: number; maxMs: number }): number {
  const minMs = Math.max(0, Math.min(range.minMs, range.maxMs));
  const maxMs = Math.max(minMs, range.maxMs);
  const centralBias = (Math.random() + Math.random()) / 2;
  return Math.round(minMs + (maxMs - minMs) * centralBias);
}

function nextFeedDelayMs(options: FetchJournalFeedsOptions): number {
  if (options.delayMs !== undefined) {
    return options.delayMs;
  }
  return sampleDelayMs(options.delayRangeMs ?? DEFAULT_RSS_REQUEST_DELAY_RANGE_MS);
}

function feedLabel(feed: FetchableFeed): string {
  return "kind" in feed ? feed.name : (feed.abbr ?? feed.name);
}

function feedPublisher(feed: FetchableFeed): string | undefined {
  let host: string;
  try {
    host = new URL(feed.rss).hostname.toLowerCase();
  } catch {
    return undefined;
  }

  if (host.endsWith("nature.com")) {
    return "Springer";
  }
  if (host.endsWith("science.org")) {
    return "AAAS";
  }
  if (host.endsWith("pnas.org")) {
    return "PNAS";
  }
  if (host.endsWith("tandfonline.com")) {
    return "Taylor & Francis";
  }
  if (host.endsWith("sciencedirect.com")) {
    return "Elsevier";
  }
  if (host.endsWith("royalsocietypublishing.org")) {
    return "Royal Society";
  }
  if (host.endsWith("ieeexplore.ieee.org")) {
    return "IEEE";
  }

  return undefined;
}

function feedLogLabel(feed: FetchableFeed): string {
  const label = feedLabel(feed);
  const publisher = feedPublisher(feed);
  return publisher ? `[${publisher}] ${label}` : label;
}

function feedHost(feed: FetchableFeed): string | undefined {
  try {
    return new URL(feed.rss).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

function feedScheduleKey(feed: FetchableFeed): string {
  return feedPublisher(feed) ?? feedHost(feed) ?? feedLabel(feed);
}

function interleaveFeedsByPublisher<TFeed extends FetchableFeed>(feeds: TFeed[]): TFeed[] {
  const queues = new Map<string, TFeed[]>();
  for (const feed of feeds) {
    const key = feedScheduleKey(feed);
    queues.set(key, [...(queues.get(key) ?? []), feed]);
  }

  const ordered: TFeed[] = [];
  while (queues.size > 0) {
    for (const [key, queue] of [...queues.entries()]) {
      const feed = queue.shift();
      if (feed) {
        ordered.push(feed);
      }
      if (queue.length === 0) {
        queues.delete(key);
      }
    }
  }

  return ordered;
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

function itemText(item: ParserItem): string {
  return normalizeField(item.contentSnippet ?? item.summary ?? item.content ?? "");
}

function removeLabeledFeedMetadata(text: string): string {
  return normalizeField(
    text
      .replace(
        /(?:^|\s)Publication date:\s*.*?(?=\s*(?:Source:|Author\(s\):|Abstract:|Summary:|Description:|$))/gi,
        " "
      )
      .replace(/(?:^|\s)Source:\s*.*?(?=\s*(?:Author\(s\):|Abstract:|Summary:|Description:|$))/gi, " ")
      .replace(/(?:^|\s)Author\(s\):\s*.*?(?=\s*(?:Abstract:|Summary:|Description:|$))/gi, " ")
  );
}

function isBibliographicMetadataOnly(text: string): boolean {
  return /^Volume\s+\d+[^.]*?(?:Issue\s+\d+[^.]*?)?(?:Page\s+[\w-]+[^.]*?)?\s*\.?$/i.test(text);
}

function normalizeAbstract(item: ParserItem): string {
  const text = itemText(item);
  if (!text) {
    return "";
  }

  const labeledAbstract = text.match(
    /(?:^|\s)(?:Abstract|Summary|Description):\s*(.+?)(?=\s*(?:Publication date:|Source:|Author\(s\):|$))/i
  )?.[1];
  if (labeledAbstract) {
    return removeLabeledFeedMetadata(labeledAbstract);
  }

  const abstract = removeLabeledFeedMetadata(text);
  return isBibliographicMetadataOnly(abstract) ? "" : abstract;
}

function isScienceDirectItem(item: ParserItem): boolean {
  return [item.link, item.guid].some((value) => value?.toLowerCase().includes("sciencedirect.com"));
}

function isTaylorFrancisItem(item: ParserItem): boolean {
  return [item.link, item.guid].some((value) => value?.toLowerCase().includes("tandfonline.com"));
}

function parseScienceDirectAuthors(item: ParserItem): string[] {
  if (!isScienceDirectItem(item)) {
    return [];
  }

  const match = itemText(item).match(
    /(?:^|\n|\s)Author\(s\):\s*(.+?)(?=\s*(?:Publication date:|Source:|Abstract:|Summary:|Description:|$))/i
  );
  if (!match?.[1]) {
    return [];
  }

  return match[1]
    .split(/\s*,\s*/)
    .map((value) => value.trim())
    .filter((value, index, values) => value.length > 0 && values.indexOf(value) === index);
}

function affiliationHeadPattern(): string {
  return (
    "Academy|Administration|Agency|Asia Research|Business|Centre|Center|College|Department|Dipartimento|Division|" +
    "Faculty|Freshwater|Graduate|Group|Institute|Key Laboratory|Laboratory|Ministry|National|Program|" +
    "Research Center|Research Centre|School|State Key Laboratory|Unit|University|Urban|WorldPop"
  );
}

function findTaylorFrancisAffiliationStart(value: string): RegExpExecArray | null {
  return new RegExp(`\\s+a\\s+(?=${affiliationHeadPattern()}\\b)`, "i").exec(value);
}

function findTaylorFrancisAffiliationEnd(value: string): number {
  const affiliationHead = affiliationHeadPattern();
  const markedAffiliation = new RegExp(`(?:\\s[b-z]|(?<=[A-Z])[b-z])\\s+(?=${affiliationHead}\\b)`, "u").exec(
    value
  );
  const compactCountryAffiliation = new RegExp(
    `\\b(?:China|Hong Kong|Japan|Singapore|USA|US|UK|Canada|Australia|Netherlands|Italy)([b-z])\\s+(?=${affiliationHead}\\b)`,
    "u"
  ).exec(value);
  const compactCountryMarkerIndex = compactCountryAffiliation
    ? compactCountryAffiliation.index + compactCountryAffiliation[0].lastIndexOf(compactCountryAffiliation[1] ?? "")
    : undefined;
  const biography = /\s*[A-Z][A-Z.'’-]+(?:\s+[A-Z][A-Z.'’-]+){1,3}\s+is\s+(?:currently\s+)?(?:a|an|the)\s+/u.exec(
    value
  );
  const starts = [markedAffiliation?.index, compactCountryMarkerIndex, biography?.index].filter(
    (index): index is number => index !== undefined
  );
  return starts.length > 0 ? Math.min(...starts) : value.length;
}

function parseTaylorFrancisContributorMetadata(value: string): { authorText: string; firstAffiliation?: string } | null {
  const normalized = normalizeField(value).replace(/^by\s+/i, "");
  const affiliationStart = findTaylorFrancisAffiliationStart(normalized);
  if (!affiliationStart) {
    return null;
  }

  const authorText = normalized.slice(0, affiliationStart.index).trim();
  const affiliationTextStart = affiliationStart.index + affiliationStart[0].length;
  const affiliationTail = normalized.slice(affiliationTextStart);
  const affiliationEnd = findTaylorFrancisAffiliationEnd(affiliationTail);
  const firstAffiliation = affiliationTail.slice(0, affiliationEnd).trim();

  return {
    authorText,
    ...(firstAffiliation ? { firstAffiliation } : {})
  };
}

function stripAuthorMetadataTail(value: string): { text: string; hadMetadataTail: boolean } {
  const affiliationStart = value.search(
    new RegExp(`\\s+(?:[a-z]\\s+)?(?:${affiliationHeadPattern()})\\b`, "i")
  );
  const rorAffiliationStart = value.search(/[a-z]https?:\/\/ror\.org\//i);
  const compactAffiliationStart = value.search(
    /(?<=[a-z])a(?:[A-Z]{2,}|Department|School|College|Faculty|Institute|Ministry|State|Key|Laboratory|Unit|JILA|WorldPop)\b/
  );
  const biographyStart = value.search(
    /\s+[A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){1,3}\s+is\s+(?:currently\s+)?(?:a|an|the)\s+/i
  );
  const starts = [affiliationStart, rorAffiliationStart, compactAffiliationStart, biographyStart].filter(
    (index) => index >= 0
  );
  const tailStart = starts.length > 0 ? Math.min(...starts) : -1;

  if (tailStart < 0) {
    return { text: value, hadMetadataTail: false };
  }

  return { text: value.slice(0, tailStart), hadMetadataTail: true };
}

function parseBiographyAuthorNames(value: string): string[] {
  return Array.from(
    value.matchAll(
      /([\p{Lu}][\p{L}.'’-]+(?:\s+[\p{Lu}][\p{L}.'’-]+){1,3})\s+is\s+(?:currently\s+)?(?:a|an|the|Associate|Chief|Director|Full|Senior|Principal|Research|Postdoctoral|Master)/gu
    ),
    (match) =>
      (match[1] ?? "")
        .replace(/^(?:United Kingdom|USA|UK|Italy|Netherlands|China|Maryland)\.?\s*/i, "")
        .trim()
  ).filter(
    (value, index, values) =>
      value.length > 0 && !/^(?:He|She|They|His|Her|Their)$/i.test(value) && values.indexOf(value) === index
  );
}

function splitAuthorValue(value: string): string[] {
  const taylorFrancisMetadata = parseTaylorFrancisContributorMetadata(value);
  const normalized = taylorFrancisMetadata?.authorText ?? normalizeField(value).replace(/^by\s+/i, "");
  const { text, hadMetadataTail } = stripAuthorMetadataTail(normalized);
  const hasStructuredMetadata = Boolean(taylorFrancisMetadata) || hadMetadataTail;
  if (!hasStructuredMetadata) {
    const biographyNames = parseBiographyAuthorNames(normalized);
    if (biographyNames.length > 1) {
      return biographyNames;
    }
  }

  const spacedNames = text.replace(/([a-z])([A-Z][a-z])/g, "$1 $2");
  const delimited = spacedNames.split(/\s*(?:;|\||,|\band\b)\s*/i);
  if (delimited.length > 1) {
    return delimited;
  }

  const tokens = spacedNames.trim().split(/\s+/).filter(Boolean);
  if (hasStructuredMetadata && tokens.length >= 4 && tokens.length <= 20 && tokens.length % 2 === 0) {
    const names: string[] = [];
    for (let index = 0; index < tokens.length; index += 2) {
      names.push(`${tokens[index]} ${tokens[index + 1]}`);
    }
    return names;
  }

  return [text];
}

function normalizeAuthors(item: ParserItem): string[] | undefined {
  const candidates = [
    ...asStringArray(item.dcCreators),
    ...asStringArray(item.authors),
    ...asStringArray(item.creator),
    ...asStringArray(item.author)
  ];
  const authors = candidates
    .flatMap(splitAuthorValue)
    .map((value) => value.trim())
    .filter((value, index, values) => value.length > 0 && values.indexOf(value) === index);

  const fallbackAuthors = authors.length > 0 ? authors : parseScienceDirectAuthors(item);
  return fallbackAuthors.length > 0 ? fallbackAuthors : undefined;
}

function parseTaylorFrancisFirstAffiliation(item: ParserItem): string | undefined {
  if (!isTaylorFrancisItem(item)) {
    return undefined;
  }

  const firstAffiliation = [
    ...asStringArray(item.dcCreators),
    ...asStringArray(item.authors),
    ...asStringArray(item.creator),
    ...asStringArray(item.author)
  ]
    .map((value) => parseTaylorFrancisContributorMetadata(value)?.firstAffiliation)
    .find((value): value is string => Boolean(value));

  return firstAffiliation;
}

function normalizeFirstAffiliation(item: ParserItem): string | undefined {
  const candidates = [
    ...asStringArray(item.affiliations),
    ...asStringArray(item.dcAffiliations),
    ...asStringArray(item.prismAffiliations)
  ];
  const firstAffiliation = candidates.map(normalizeField).find((value) => value.length > 0);
  return firstAffiliation || parseTaylorFrancisFirstAffiliation(item);
}

function normalizeMetadataText(item: ParserItem): string | undefined {
  const text = [
    ...asStringArray(item.dcCreators),
    ...asStringArray(item.authors),
    ...asStringArray(item.creator),
    ...asStringArray(item.author),
    ...asStringArray(item.affiliations),
    ...asStringArray(item.dcAffiliations),
    ...asStringArray(item.prismAffiliations)
  ]
    .map(normalizeField)
    .filter(Boolean)
    .join(" ");

  return text || undefined;
}

function normalizeDate(item: ParserItem): Date | null {
  if (isTaylorFrancisItem(item)) {
    const taylorFrancisDate = parseDateValue(item.prismCoverDate ?? item.prismPublicationDate);
    if (taylorFrancisDate) {
      return taylorFrancisDate;
    }
  }

  const rawDate =
    item.isoDate ?? item.pubDate ?? item.date ?? item.dcDate ?? item.prismPublicationDate ?? item.prismCoverDate;
  const publishedAt = parseDateValue(rawDate);
  if (publishedAt) {
    return publishedAt;
  }

  return parseScienceDirectPublicationDate(item);
}

function parseDateValue(value: string | undefined): Date | null {
  const publishedAt = value ? new Date(value) : null;
  return publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null;
}

function parseScienceDirectPublicationDate(item: ParserItem): Date | null {
  if (!isScienceDirectItem(item)) {
    return null;
  }

  const match = itemText(item).match(
    /(?:^|\n|\s)Publication date:\s*(.+?)(?=\s*(?:Source:|Author\(s\):|Abstract:|Summary:|Description:|$))/i
  );
  const value = match?.[1]?.trim();
  if (!value) {
    return null;
  }

  const monthYear = value.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (monthYear?.[1] && monthYear[2]) {
    const monthIndex = new Date(`${monthYear[1]} 1, 2000`).getMonth();
    if (!Number.isNaN(monthIndex)) {
      return new Date(Date.UTC(Number(monthYear[2]), monthIndex, 1));
    }
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeFeedItem(journal: string, item: ParserItem): FeedPaper | null {
  const title = stripHtml(item.title ?? "");
  const url = (item.link ?? item.guid ?? "").trim();

  if (!title || !url) {
    return null;
  }

  const authors = normalizeAuthors(item);
  const firstAffiliation = normalizeFirstAffiliation(item);
  const metadataText = normalizeMetadataText(item);

  return {
    journal,
    title,
    abstract: normalizeAbstract(item),
    url,
    publishedAt: normalizeDate(item),
    ...(authors ? { authors } : {}),
    ...(firstAffiliation ? { firstAffiliation } : {}),
    ...(metadataText ? { metadataText } : {})
  };
}

function looksLikeFeedXml(value: string): boolean {
  return /^\s*(?:<\?xml\b[^>]*>\s*)?<(?:rss|rdf:RDF|feed)\b/i.test(value);
}

function isXmlContentType(contentType: string | null): boolean {
  return Boolean(contentType?.toLowerCase().match(/\b(?:rss|rdf|atom|xml)\b/));
}

function isRetryableRssError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const status = message.match(/^Status code (\d+)$/)?.[1];
  if (status) {
    const code = Number(status);
    return code === 403 || code === 429 || code >= 500;
  }

  return message.startsWith("Expected RSS/XML feed but received ");
}

function publisherBlockReason(error: unknown): string | undefined {
  const message = error instanceof Error ? error.message : String(error);
  const status = message.match(/^Status code (\d+)$/)?.[1];
  if (status) {
    const code = Number(status);
    if (code === 403 || code === 429) {
      return "publisher rejected request";
    }
  }

  if (message.startsWith("Expected RSS/XML feed but received ")) {
    return "publisher returned non-RSS response";
  }

  return undefined;
}

type FeedAttemptResult =
  | {
      status: "fulfilled";
      papers: FeedPaper[];
    }
  | {
      status: "rejected";
      error: unknown;
    };

async function fetchJournalFeedWithRetries(
  journal: FetchableFeed,
  retryCount: number,
  retryDelayMs: number,
  options: {
    deferPublisherBlocks?: boolean;
    startProfileIndex?: number;
  } = {}
): Promise<FeedAttemptResult> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    if (attempt > 0) {
      await wait(retryDelayMs);
    }

    try {
      const profile =
        RSS_HEADER_PROFILES[((options.startProfileIndex ?? 0) + attempt) % RSS_HEADER_PROFILES.length] ?? {};
      return {
        status: "fulfilled",
        papers: await fetchJournalFeedWithHeaders(journal, rssHeadersForProfile(profile))
      };
    } catch (error) {
      lastError = error;
      if (options.deferPublisherBlocks && publisherBlockReason(error)) {
        return {
          status: "rejected",
          error
        };
      }
      if (attempt >= retryCount || !isRetryableRssError(error)) {
        return {
          status: "rejected",
          error
        };
      }
    }
  }

  return {
    status: "rejected",
    error: lastError
  };
}

async function fetchJournalFeedWithHeaders(journal: FetchableFeed, headers: RssHeaders): Promise<FeedPaper[]> {
  const response = await fetch(journal.rss, {
    headers
  });

  if (!response.ok) {
    throw new Error(`Status code ${response.status}`);
  }

  const body = await response.text();
  const contentType = response.headers.get("content-type");
  if (!isXmlContentType(contentType) && !looksLikeFeedXml(body)) {
    throw new Error(`Expected RSS/XML feed but received ${contentType ?? "unknown content type"}`);
  }

  return parseFeedBody(journal, body);
}

async function parseFeedBody(journal: FetchableFeed, body: string): Promise<FeedPaper[]> {
  if (!looksLikeFeedXml(body)) {
    throw new Error("Expected RSS/XML feed but received non-XML body");
  }

  const feed = await parser.parseString(body);
  return feed.items
    .map((item) => normalizeFeedItem(feedLabel(journal), item))
    .filter((paper): paper is FeedPaper => paper !== null);
}

async function fetchJournalFeedWithCurl(journal: FetchableFeed): Promise<FeedPaper[]> {
  const headers = rssHeadersForProfile(RSS_HEADER_PROFILES[0] ?? {});
  const args = [
    "--location",
    "--fail-with-body",
    "--silent",
    "--show-error",
    "--connect-timeout",
    "10",
    "--max-time",
    "30"
  ];

  for (const [name, value] of Object.entries(headers)) {
    args.push("--header", `${name}: ${value}`);
  }
  args.push("--", journal.rss);

  const { stdout } = await execFileAsync("curl", args, {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    timeout: 45_000
  });
  return parseFeedBody(journal, stdout);
}

export async function fetchJournalFeed(journal: FetchableFeed): Promise<FeedPaper[]> {
  return fetchJournalFeedWithHeaders(journal, nextRssHeaders());
}

export async function fetchJournalFeeds(
  journals: FetchableFeed[],
  options: FetchJournalFeedsOptions = {}
): Promise<FeedPaper[]> {
  const progress = createProgress("RSS", { total: journals.length });
  const retryCount = options.retryCount ?? DEFAULT_RSS_RETRY_COUNT;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RSS_RETRY_DELAY_MS;
  const deferredRetryDelayMs = options.deferredRetryDelayMs ?? DEFAULT_RSS_DEFERRED_RETRY_DELAY_MS;
  const curlFallbackEnabled = options.curlFallback ?? process.env.GITHUB_ACTIONS === "true";
  const curlFetcher = options.curlFetcher ?? fetchJournalFeedWithCurl;
  const crossrefFetcher = options.crossrefFetcher ?? fetchCrossrefJournalWorks;
  const papers: FeedPaper[] = [];
  const scheduledJournals = interleaveFeedsByPublisher(journals);
  const deferred: Array<{ journal: FetchableFeed; error: unknown }> = [];

  for (const [index, journal] of scheduledJournals.entries()) {
    if (index > 0) {
      await wait(nextFeedDelayMs(options));
    }

    const logLabel = feedLogLabel(journal);
    const result = await fetchJournalFeedWithRetries(journal, retryCount, retryDelayMs, {
      deferPublisherBlocks: scheduledJournals.length > 1
    });
    if (result.status === "fulfilled") {
      papers.push(...result.papers);
      progress.step(`${logLabel}: ${result.papers.length} papers`);
      continue;
    }

    if (publisherBlockReason(result.error)) {
      deferred.push({ journal, error: result.error });
      continue;
    }

    progress.step(`${logLabel} failed: ${String(result.error)}`);
  }

  if (deferred.length > 0) {
    await wait(deferredRetryDelayMs);
  }

  for (const [index, { journal, error: originalError }] of deferred.entries()) {
    if (index > 0) {
      await wait(nextFeedDelayMs(options));
    }

    const logLabel = feedLogLabel(journal);
    const result = await fetchJournalFeedWithRetries(journal, 0, retryDelayMs, { startProfileIndex: 1 });
    if (result.status === "fulfilled") {
      papers.push(...result.papers);
      progress.step(`${logLabel}: ${result.papers.length} papers`);
      continue;
    }

    if (curlFallbackEnabled && publisherBlockReason(result.error)) {
      try {
        const fallbackPapers = await curlFetcher(journal);
        papers.push(...fallbackPapers);
        progress.step(`${logLabel}: ${fallbackPapers.length} papers (curl fallback)`);
        continue;
      } catch (error) {
        console.log(
          `[RSS] ${logLabel} curl fallback failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      if (journal.issn) {
        try {
          const works = await crossrefFetcher(journal.issn);
          const fallbackPapers = works
            .filter((work): work is CrossrefMetadata & { title: string } => Boolean(work.title))
            .map((work) => ({
              journal: feedLabel(journal),
              title: work.title,
              abstract: work.abstract ?? "",
              url: work.url ?? `https://doi.org/${work.doi}`,
              doi: work.doi,
              publishedAt: work.publishedAt ?? null,
              ...(work.authors?.length ? { authors: work.authors } : {})
            }));
          if (fallbackPapers.length > 0) {
            papers.push(...fallbackPapers);
            progress.step(`${logLabel}: ${fallbackPapers.length} papers (Crossref fallback)`);
            continue;
          }
        } catch (error) {
          console.log(
            `[RSS] ${logLabel} Crossref fallback failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }

    const blockReason = publisherBlockReason(result.error) ?? publisherBlockReason(originalError);
    progress.step(blockReason ? `${logLabel}: 0 papers (${blockReason})` : `${logLabel} failed: ${String(result.error)}`);
  }

  return papers;
}

export function filterRecentPapers(papers: FeedPaper[], maxAgeDays: number, now = new Date()): FeedPaper[] {
  const oldest = now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000;
  return papers.filter((paper) => paper.publishedAt === null || paper.publishedAt.getTime() >= oldest);
}
