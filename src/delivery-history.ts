import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { FeedPaper } from "./types.js";

const DELIVERY_HISTORY_PATH = ".delivery-history.json";
const DEFAULT_DELIVERY_HISTORY_SALT = "paper-daily-feed:v1:delivery-history";
const DELIVERY_HISTORY_RETENTION_DAYS = 180;

type DeliveryHistoryEntry = {
  fingerprint: string;
  deliveredAt: string;
};

type DeliveryHistory = {
  version: 1;
  delivered: DeliveryHistoryEntry[];
};

type Env = Record<string, string | undefined>;

export type DeliveryHistorySession = {
  filterUndeliveredPapers<T extends Pick<FeedPaper, "title" | "url">>(papers: T[]): T[];
  confirmSuccessfulDelivery(
    papers: Pick<FeedPaper, "title" | "url">[],
    deliveredAt?: Date
  ): void;
};

type OpenDeliveryHistoryOptions = {
  path?: string;
  env?: Env;
};

function emptyHistory(): DeliveryHistory {
  return { version: 1, delivered: [] };
}

function normalizeTitle(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.toLowerCase();

    for (const key of [...url.searchParams.keys()]) {
      const normalizedKey = key.toLowerCase();
      if (normalizedKey.startsWith("utm_") || normalizedKey === "dgcid") {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.sort();
    return url.toString().toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
}

function historySalt(env: Env): string {
  return env.DELIVERY_HISTORY_SALT?.trim() || DEFAULT_DELIVERY_HISTORY_SALT;
}

function isValidEntry(value: unknown): value is DeliveryHistoryEntry {
  if (!value || typeof value !== "object") {
    return false;
  }
  const entry = value as Partial<DeliveryHistoryEntry>;
  return (
    typeof entry.fingerprint === "string" &&
    /^[a-f0-9]{64}$/.test(entry.fingerprint) &&
    typeof entry.deliveredAt === "string" &&
    !Number.isNaN(new Date(entry.deliveredAt).getTime())
  );
}

function createPaperFingerprint(paper: Pick<FeedPaper, "title" | "url">, env: Env = process.env): string {
  return new Bun.CryptoHasher("sha256")
    .update(`${historySalt(env)}::${normalizeUrl(paper.url)}::${normalizeTitle(paper.title)}`)
    .digest("hex");
}

function loadDeliveryHistory(path = DELIVERY_HISTORY_PATH): DeliveryHistory {
  if (!existsSync(path)) {
    return emptyHistory();
  }

  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<DeliveryHistory>;
    const delivered = Array.isArray(parsed.delivered) ? parsed.delivered.filter(isValidEntry) : [];
    return { version: 1, delivered };
  } catch {
    return emptyHistory();
  }
}

function saveDeliveryHistory(path: string, history: DeliveryHistory): void {
  writeFileSync(path, `${JSON.stringify(history, null, 2)}\n`);
}

function filterUndeliveredPapers<T extends Pick<FeedPaper, "title" | "url">>(
  papers: T[],
  history: DeliveryHistory,
  env: Env = process.env
): T[] {
  const delivered = new Set(history.delivered.map((entry) => entry.fingerprint));
  return papers.filter((paper) => !delivered.has(createPaperFingerprint(paper, env)));
}

function recordDeliveredPapers(
  history: DeliveryHistory,
  papers: Pick<FeedPaper, "title" | "url">[],
  deliveredAt: Date,
  env: Env = process.env
): DeliveryHistory {
  const retentionCutoff = deliveredAt.getTime() - DELIVERY_HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const records = history.delivered.filter((entry) => new Date(entry.deliveredAt).getTime() >= retentionCutoff);
  const seen = new Set(records.map((entry) => entry.fingerprint));

  for (const paper of papers) {
    const fingerprint = createPaperFingerprint(paper, env);
    if (!seen.has(fingerprint)) {
      seen.add(fingerprint);
      records.push({ fingerprint, deliveredAt: deliveredAt.toISOString() });
    }
  }

  return { version: 1, delivered: records };
}

export function openDeliveryHistory(options: OpenDeliveryHistoryOptions = {}): DeliveryHistorySession {
  const path = options.path ?? DELIVERY_HISTORY_PATH;
  const env = options.env ?? process.env;
  let history = loadDeliveryHistory(path);

  return {
    filterUndeliveredPapers<T extends Pick<FeedPaper, "title" | "url">>(papers: T[]): T[] {
      return filterUndeliveredPapers(papers, history, env);
    },
    confirmSuccessfulDelivery(
      papers: Pick<FeedPaper, "title" | "url">[],
      deliveredAt = new Date()
    ): void {
      const updated = recordDeliveredPapers(history, papers, deliveredAt, env);
      try {
        saveDeliveryHistory(path, updated);
        history = updated;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Delivery may have succeeded, but Delivery History could not be saved: ${message}`);
      }
    }
  };
}
