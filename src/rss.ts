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

type RssHeaders = Record<string, string>;

const RSS_COMMON_HEADERS = {
  Accept: "application/rss+xml, application/rdf+xml, application/atom+xml, application/xml, text/xml, */*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
  DNT: "1",
  Pragma: "no-cache",
  Priority: "u=0, i",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1"
} satisfies RssHeaders;

const RSS_BROWSER_HEADER_PROFILES: RssHeaders[] = [
  {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Sec-CH-UA": '"Chromium";v="126", "Google Chrome";v="126", "Not-A.Brand";v="99"',
    "Sec-CH-UA-Mobile": "?0",
    "Sec-CH-UA-Platform": '"Windows"'
  },
  {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15"
  },
  {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0"
  }
];

let rssHeaderProfileIndex = 0;

function nextRssHeaders(): RssHeaders {
  const profile = RSS_BROWSER_HEADER_PROFILES[rssHeaderProfileIndex % RSS_BROWSER_HEADER_PROFILES.length] ?? {};
  rssHeaderProfileIndex += 1;
  return {
    ...RSS_COMMON_HEADERS,
    ...profile
  };
}

type FetchableFeed = Journal | FeedSource;

type FetchJournalFeedsOptions = {
  delayMs?: number;
};

const DEFAULT_RSS_REQUEST_DELAY_MS = 500;

function wait(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
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

export async function fetchJournalFeed(journal: FetchableFeed): Promise<FeedPaper[]> {
  const response = await fetch(journal.rss, {
    headers: nextRssHeaders()
  });

  if (!response.ok) {
    throw new Error(`Status code ${response.status}`);
  }

  const body = await response.text();
  const contentType = response.headers.get("content-type");
  if (!isXmlContentType(contentType) && !looksLikeFeedXml(body)) {
    throw new Error(`Expected RSS/XML feed but received ${contentType ?? "unknown content type"}`);
  }

  const feed = await parser.parseString(body);
  return feed.items
    .map((item) => normalizeFeedItem(feedLabel(journal), item))
    .filter((paper): paper is FeedPaper => paper !== null);
}

export async function fetchJournalFeeds(
  journals: FetchableFeed[],
  options: FetchJournalFeedsOptions = {}
): Promise<FeedPaper[]> {
  const progress = createProgress("RSS", { total: journals.length });
  const delayMs = options.delayMs ?? DEFAULT_RSS_REQUEST_DELAY_MS;
  const papers: FeedPaper[] = [];

  for (const [index, journal] of journals.entries()) {
    if (index > 0) {
      await wait(delayMs);
    }

    const logLabel = feedLogLabel(journal);
    console.log(`[RSS] start ${index + 1}/${journals.length}: ${logLabel}`);

    try {
      const feedPapers = await fetchJournalFeed(journal);
      papers.push(...feedPapers);
      progress.step(`${logLabel}: ${feedPapers.length} papers`);
    } catch (error) {
      progress.step(`${logLabel} failed: ${String(error)}`);
    }
  }

  return papers;
}

export function filterRecentPapers(papers: FeedPaper[], maxAgeDays: number, now = new Date()): FeedPaper[] {
  const oldest = now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000;
  return papers.filter((paper) => paper.publishedAt === null || paper.publishedAt.getTime() >= oldest);
}
