import { stripHtml } from "./text.js";

type Fetcher = typeof fetch;

export type CrossrefMetadata = {
  doi: string;
  title?: string;
  abstract?: string;
  authors?: string[];
  journal?: string;
  publishedAt?: Date;
  url?: string;
};

type CrossrefDate = {
  "date-parts"?: number[][];
};

type CrossrefAuthor = {
  given?: string;
  family?: string;
  name?: string;
};

type CrossrefWorkMessage = {
  DOI?: string;
  title?: string[];
  abstract?: string;
  author?: CrossrefAuthor[];
  "container-title"?: string[];
  "published-print"?: CrossrefDate;
  "published-online"?: CrossrefDate;
  published?: CrossrefDate;
  issued?: CrossrefDate;
  URL?: string;
};

type CrossrefWorkResponse = {
  message?: CrossrefWorkMessage;
};

type CrossrefWorksResponse = {
  message?: {
    items?: CrossrefWorkMessage[];
  };
};

type FetchCrossrefOptions = {
  fetcher?: Fetcher;
  mailto?: string;
};

const DOI_PATTERN = /\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i;

export function findDoi(text: string | undefined): string | undefined {
  const match = text?.match(DOI_PATTERN)?.[0];
  return match?.replace(/[.,;:)\]]+$/g, "");
}

function firstNonEmpty(values: Array<string | undefined>): string | undefined {
  return values.map((value) => value?.trim()).find((value): value is string => Boolean(value));
}

function normalizeAuthor(author: CrossrefAuthor): string | undefined {
  return firstNonEmpty([
    [author.given, author.family].filter(Boolean).join(" "),
    author.name
  ]);
}

function parseCrossrefDate(date: CrossrefDate | undefined): Date | undefined {
  const parts = date?.["date-parts"]?.[0];
  const year = parts?.[0];
  if (!year) {
    return undefined;
  }

  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function normalizeWork(message: CrossrefWorkMessage): CrossrefMetadata | null {
  const doi = findDoi(message.DOI);
  if (!doi) {
    return null;
  }

  const authors = message.author?.map(normalizeAuthor).filter((author): author is string => Boolean(author));
  const publishedAt =
    parseCrossrefDate(message["published-print"]) ??
    parseCrossrefDate(message["published-online"]) ??
    parseCrossrefDate(message.published) ??
    parseCrossrefDate(message.issued);
  const abstract = message.abstract ? stripHtml(message.abstract).replace(/\s+([.,;:!?])/g, "$1") : undefined;

  return {
    doi,
    ...(firstNonEmpty(message.title ?? []) ? { title: firstNonEmpty(message.title ?? []) } : {}),
    ...(abstract ? { abstract } : {}),
    ...(authors?.length ? { authors } : {}),
    ...(firstNonEmpty(message["container-title"] ?? []) ? { journal: firstNonEmpty(message["container-title"] ?? []) } : {}),
    ...(publishedAt ? { publishedAt } : {}),
    ...(message.URL ? { url: message.URL } : {})
  };
}

export async function fetchCrossrefWork(
  doi: string,
  { fetcher = fetch, mailto = "" }: FetchCrossrefOptions = {}
): Promise<CrossrefMetadata | null> {
  const url = new URL(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
  if (mailto.trim()) {
    url.searchParams.set("mailto", mailto.trim());
  }

  const response = await fetcher(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "paper-daily-feed/0.1.3 (+https://github.com/nehSgnaiL/paper-daily-feed)"
    }
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as CrossrefWorkResponse;
  return payload.message ? normalizeWork(payload.message) : null;
}

export async function fetchCrossrefJournalWorks(
  issn: string,
  { fetcher = fetch, mailto = "" }: FetchCrossrefOptions = {}
): Promise<CrossrefMetadata[]> {
  const fromDate = new Date();
  fromDate.setUTCDate(fromDate.getUTCDate() - 90);
  const url = new URL(`https://api.crossref.org/journals/${encodeURIComponent(issn)}/works`);
  url.searchParams.set("filter", `from-pub-date:${fromDate.toISOString().slice(0, 10)}`);
  url.searchParams.set("rows", "100");
  url.searchParams.set("sort", "published");
  url.searchParams.set("order", "desc");
  if (mailto.trim()) {
    url.searchParams.set("mailto", mailto.trim());
  }

  const response = await fetcher(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "paper-daily-feed/0.1.3 (+https://github.com/nehSgnaiL/paper-daily-feed)"
    }
  });
  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as CrossrefWorksResponse;
  return (payload.message?.items ?? [])
    .map(normalizeWork)
    .filter((work): work is CrossrefMetadata => work !== null);
}
