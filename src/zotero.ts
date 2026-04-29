import type { AppConfig } from "./config.js";
import type { CorpusPaper } from "./types.js";

type ZoteroItem = {
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

function globToRegExp(pattern: string): RegExp {
  let source = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    const next = pattern[index + 1];
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

function matchesAnyPath(paths: string[], patterns: string[] | null): boolean {
  if (!patterns || patterns.length === 0) {
    return false;
  }
  return paths.some((path) => patterns.some((pattern) => globToRegExp(pattern).test(path)));
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

function zoteroLibraryPath(config: AppConfig): string {
  const libraryPath = config.zotero.libraryType === "group" ? "groups" : "users";
  return `https://api.zotero.org/${libraryPath}/${config.zotero.userId}`;
}

async function fetchZoteroPage(config: AppConfig, resource: string, start: number): Promise<unknown[]> {
  const url = new URL(`${zoteroLibraryPath(config)}/${resource}`);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "100");
  url.searchParams.set("start", String(start));

  const response = await fetch(url, {
    headers: {
      "Zotero-API-Key": config.zotero.apiKey
    }
  });

  if (!response.ok) {
    throw new Error(`Zotero API request failed (${response.status} ${response.statusText}).`);
  }

  return (await response.json()) as unknown[];
}

async function fetchAllZoteroPages<T>(config: AppConfig, resource: string): Promise<T[]> {
  const allItems: T[] = [];
  const pageSize = 100;

  for (let start = 0; ; start += pageSize) {
    const items = (await fetchZoteroPage(config, resource, start)) as T[];
    allItems.push(...items);
    if (items.length < pageSize) {
      break;
    }
  }

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

export async function fetchZoteroCorpus(config: AppConfig): Promise<CorpusPaper[]> {
  const corpus: CorpusPaper[] = [];
  const [items, collections] = await Promise.all([
    fetchAllZoteroPages<ZoteroItem>(config, "items/top"),
    fetchAllZoteroPages<ZoteroCollection>(config, "collections")
  ]);
  const collectionPaths = buildCollectionPathMap(collections);

  corpus.push(
    ...items
      .map((item) =>
        normalizeZoteroItem({
          ...item,
          paths: (item.data?.collections ?? []).map((key) => collectionPaths.get(key) ?? key)
        })
      )
      .filter((paper): paper is CorpusPaper => paper !== null)
  );

  return filterCorpusByPath(corpus, config.zotero.includePath, config.zotero.excludePath);
}
