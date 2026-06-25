import type { ZoteroInterestConfig } from "./app-config.js";
import { createProgress } from "./progress.js";
import type { CorpusPaper, InterestDocument } from "./types.js";

export type ZoteroItem = {
  data?: {
    itemType?: string;
    title?: string;
    abstractNote?: string;
    collections?: string[];
  };
  paths?: string[];
};

type ZoteroCollection = {
  key: string;
  data?: {
    name?: string;
    parentCollection?: string | false;
  };
};

type ZoteroLibraryConfig = {
  userId: string;
  apiKey: string;
  libraryType: "user" | "group";
};

type ZoteroPage<T> = {
  items: T[];
  totalResults?: number;
};

const SUPPORTED_ITEM_TYPES = new Set(["journalArticle", "conferencePaper", "preprint"]);

export function normalizeZoteroItem(item: ZoteroItem): CorpusPaper | null {
  const data = item.data;
  const title = data?.title?.trim() ?? "";
  const abstract = data?.abstractNote?.trim() ?? "";

  if (!data?.itemType || !SUPPORTED_ITEM_TYPES.has(data.itemType) || !title || !abstract) {
    return null;
  }

  return { title, abstract, paths: item.paths ?? [] };
}

export function zoteroCorpusPaperToInterestDocument(paper: CorpusPaper): InterestDocument {
  return {
    source: "zotero",
    title: paper.title,
    text: [`Title: ${paper.title}`, `Abstract: ${paper.abstract}`].join("\n"),
    topics: [],
    kind: "zotero-paper",
    label: paper.title,
    polarity: "positive"
  };
}

export function normalizeZoteroInterestDocument(item: ZoteroItem): InterestDocument | null {
  const paper = normalizeZoteroItem(item);
  if (!paper) {
    return null;
  }

  return zoteroCorpusPaperToInterestDocument(paper);
}

function globToRegExp(pattern: string): RegExp {
  let source = "";
  const normalizedPattern = normalizeCollectionPath(pattern);
  for (let index = 0; index < normalizedPattern.length; index += 1) {
    const char = normalizedPattern[index];
    const next = normalizedPattern[index + 1];
    if (char === "*" && next === "*") {
      source += ".*";
      index += 1;
    } else if (char === "*") {
      source += "[^/]*";
    } else {
      source += char?.replace(/[.+^${}()|[\]\\]/g, "\\$&") ?? "";
    }
  }
  return new RegExp(`^${source}$`);
}

function normalizeCollectionPath(path: string): string {
  return path.trim().replace(/\/+$/g, "");
}

function matchesAnyPath(paths: string[], patterns: string[] | null): boolean {
  if (!patterns || patterns.length === 0) {
    return false;
  }
  return paths.some((path) => patterns.some((pattern) => globToRegExp(pattern).test(normalizeCollectionPath(path))));
}

export function filterCorpusByPath(
  corpus: CorpusPaper[],
  includePath: string[] | null,
  excludePath: string[] | null
): CorpusPaper[] {
  return corpus.filter((paper) => {
    if (includePath && includePath.length > 0 && !matchesAnyPath(paper.paths, includePath)) {
      return false;
    }
    if (excludePath && excludePath.length > 0 && matchesAnyPath(paper.paths, excludePath)) {
      return false;
    }
    return true;
  });
}

function zoteroLibraryPath(config: ZoteroLibraryConfig): string {
  const libraryPath = config.libraryType === "group" ? "groups" : "users";
  return `https://api.zotero.org/${libraryPath}/${config.userId}`;
}

async function fetchZoteroPage<T>(config: ZoteroLibraryConfig, resource: string, start: number): Promise<ZoteroPage<T>> {
  const url = new URL(`${zoteroLibraryPath(config)}/${resource}`);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "100");
  url.searchParams.set("start", String(start));

  const response = await fetch(url, {
    headers: {
      "Zotero-API-Key": config.apiKey
    }
  });

  if (!response.ok) {
    throw new Error(`Zotero API request failed (${response.status} ${response.statusText}).`);
  }

  const totalResultsHeader = response.headers.get("total-results");
  const totalResults = totalResultsHeader === null ? undefined : Number(totalResultsHeader);
  return {
    items: (await response.json()) as T[],
    ...(totalResults !== undefined && Number.isFinite(totalResults) ? { totalResults } : {})
  };
}

async function fetchAllZoteroPages<T>(config: ZoteroLibraryConfig, resource: string): Promise<T[]> {
  const allItems: T[] = [];
  const pageSize = 100;
  let progress: ReturnType<typeof createProgress> | undefined;

  for (let start = 0; ; start += pageSize) {
    const page = await fetchZoteroPage<T>(config, resource, start);
    const items = page.items;
    if (!progress) {
      const totalPages = page.totalResults === undefined ? undefined : Math.max(Math.ceil(page.totalResults / pageSize), 1);
      progress = createProgress(`Zotero ${resource}`, totalPages === undefined ? {} : { total: totalPages });
    }
    allItems.push(...items);
    progress.step(`page ${start / pageSize + 1}: ${items.length} items, ${allItems.length} total`);
    if (items.length < pageSize) {
      break;
    }
  }

  progress?.done(`${allItems.length} total items`);
  return allItems;
}

function buildCollectionPathMap(collections: ZoteroCollection[]): Map<string, string> {
  const byKey = new Map(collections.map((collection) => [collection.key, collection]));
  const cache = new Map<string, string>();

  function pathFor(key: string): string {
    if (cache.has(key)) {
      return cache.get(key) ?? "";
    }

    const collection = byKey.get(key);
    const name = collection?.data?.name ?? key;
    const parent = collection?.data?.parentCollection;
    const path = parent ? `${pathFor(parent)}/${name}` : name;
    cache.set(key, path);
    return path;
  }

  for (const collection of collections) {
    pathFor(collection.key);
  }

  return cache;
}

export async function fetchZoteroInterestDocuments(
  config: ZoteroInterestConfig,
  _env: Record<string, string | undefined> = process.env
): Promise<InterestDocument[]> {
  const userId = config.userId.trim();
  const apiKey = config.apiKey.trim();
  if (!config.enabled || !userId || !apiKey) {
    return [];
  }

  const libraryConfig: ZoteroLibraryConfig = {
    userId,
    apiKey,
    libraryType: config.libraryType
  };
  const [items, collections] = await Promise.all([
    fetchAllZoteroPages<ZoteroItem>(libraryConfig, "items/top"),
    fetchAllZoteroPages<ZoteroCollection>(libraryConfig, "collections")
  ]);
  const collectionPaths = buildCollectionPathMap(collections);
  const corpus = items
    .map((item) =>
      normalizeZoteroItem({
        ...item,
        paths: (item.data?.collections ?? []).map((key) => collectionPaths.get(key) ?? key)
      })
    )
    .filter((paper): paper is CorpusPaper => paper !== null);

  return filterCorpusByPath(corpus, config.includeCollections, config.excludeCollections).map(
    zoteroCorpusPaperToInterestDocument
  );
}
