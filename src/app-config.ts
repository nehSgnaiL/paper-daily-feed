import { existsSync, readFileSync } from "node:fs";

export type AppConfig = {
  interests: {
    profile: ProfileInterestConfig;
    zotero: ZoteroInterestConfig;
  };
  feeds: {
    catalogSelections: string[];
    customRss: CustomRssFeedConfig[];
  };
  matching: MatchingConfig;
  summary: SummaryConfig;
  delivery: DeliveryConfig;
  runtime: {
    debug: boolean;
    sendEmpty: boolean;
  };
};

export type ProfileInterestConfig = {
  enabled: boolean;
  summary: string;
  topics: string[];
  methods: string[];
  favoriteJournals: string[];
  avoidTopics: string[];
  referencePapers: ReferencePaperConfig[];
};

export type ZoteroInterestConfig = {
  enabled: boolean;
  userId: string;
  apiKey: string;
  libraryType: "user" | "group";
  includeCollections: string[];
  excludeCollections: string[];
};

export type ReferencePaperConfig = {
  title: string;
  abstract?: string;
  notes?: string;
};

export type CustomRssFeedConfig = {
  name: string;
  rss: string;
};

export type MatchingConfig = {
  provider: "api" | "local";
  api: {
    baseUrl: string;
    model: string;
    apiKey: string;
    batchSize: number;
  };
  local: {
    model: string;
    batchSize: number;
  };
  paperLimit: number;
  maxPaperAgeDays: number;
};

export type SummaryConfig = {
  enabled: boolean;
  baseUrl: string;
  model: string;
  apiKey: string;
  language: string;
  maxTokens: number;
};

export type DeliveryConfig = {
  mode: "smtp";
  from: string;
  to: string;
  smtpHost: string;
  smtpPort: number;
  smtpPassword: string;
};

type Env = Record<string, string | undefined>;
type UnknownRecord = Record<string, unknown>;

const ENV_REFERENCE = /^\$\{oc\.env:([A-Z0-9_]+)\}$/;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : {};
}

function asString(value: unknown, defaultValue: string): string {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  return String(value);
}

function asOptionalString(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  return String(value);
}

function asBoolean(value: unknown, defaultValue: boolean): boolean {
  if (value === null || value === undefined || value === "") {
    return defaultValue;
  }
  if (typeof value === "boolean") {
    return value;
  }
  return ["1", "true", "yes", "y"].includes(String(value).trim().toLowerCase());
}

function asNumber(value: unknown, defaultValue: number): number {
  if (value === null || value === undefined || value === "") {
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Expected a number, got ${String(value)}.`);
  }
  return parsed;
}

function asStringArray(value: unknown, defaultValue: string[]): string[] {
  if (value === null || value === undefined || value === "") {
    return defaultValue;
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  return [String(value)];
}

function asReferencePapers(value: unknown): ReferencePaperConfig[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const paper = asRecord(item);
    const abstract = asOptionalString(paper.abstract);
    const notes = asOptionalString(paper.notes);

    return {
      title: asString(paper.title, ""),
      ...(abstract === undefined ? {} : { abstract }),
      ...(notes === undefined ? {} : { notes })
    };
  });
}

function asCustomRssFeeds(value: unknown): CustomRssFeedConfig[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const feed = asRecord(item);

    return {
      name: asString(feed.name, ""),
      rss: asString(feed.rss, "")
    };
  });
}

function asLibraryType(value: unknown): "user" | "group" {
  return value === "group" ? "group" : "user";
}

function asProvider(value: unknown): "api" | "local" {
  return value === "local" ? "local" : "api";
}

function parseAppConfigJson(configText: string): UnknownRecord {
  try {
    return asRecord(JSON.parse(configText));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid app config JSON: ${message}`);
  }
}

function resolveEnvReference(value: string, env: Env): string {
  const match = value.match(ENV_REFERENCE);
  if (!match) {
    return value;
  }

  const envName = match[1];
  const resolved = env[envName];
  if (resolved === undefined) {
    throw new Error(`Missing environment variable for app config secret reference: ${envName}.`);
  }

  return resolved;
}

function resolveConfigReferences(value: unknown, env: Env): unknown {
  if (typeof value === "string") {
    return resolveEnvReference(value, env);
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveConfigReferences(item, env));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
        key,
        resolveConfigReferences(nestedValue, env)
      ])
    );
  }

  return value;
}

function readLocalConfig(): string | undefined {
  return existsSync("config/app.json") ? readFileSync("config/app.json", "utf8") : undefined;
}

function normalizeAppConfig(rawConfig: UnknownRecord): AppConfig {
  const interests = asRecord(rawConfig.interests);
  const profile = asRecord(interests.profile);
  const zotero = asRecord(interests.zotero);
  const feeds = asRecord(rawConfig.feeds);
  const matching = asRecord(rawConfig.matching);
  const matchingApi = asRecord(matching.api);
  const matchingLocal = asRecord(matching.local);
  const summary = asRecord(rawConfig.summary);
  const delivery = asRecord(rawConfig.delivery);
  const runtime = asRecord(rawConfig.runtime);

  return {
    interests: {
      profile: {
        enabled: asBoolean(profile.enabled, false),
        summary: asString(profile.summary, ""),
        topics: asStringArray(profile.topics, []),
        methods: asStringArray(profile.methods, []),
        favoriteJournals: asStringArray(profile.favoriteJournals, []),
        avoidTopics: asStringArray(profile.avoidTopics, []),
        referencePapers: asReferencePapers(profile.referencePapers)
      },
      zotero: {
        enabled: asBoolean(zotero.enabled, false),
        userId: asString(zotero.userId, ""),
        apiKey: asString(zotero.apiKey, ""),
        libraryType: asLibraryType(zotero.libraryType),
        includeCollections: asStringArray(zotero.includeCollections, []),
        excludeCollections: asStringArray(zotero.excludeCollections, [])
      }
    },
    feeds: {
      catalogSelections: asStringArray(feeds.catalogSelections, []),
      customRss: asCustomRssFeeds(feeds.customRss)
    },
    matching: {
      provider: asProvider(matching.provider),
      api: {
        baseUrl: asString(matchingApi.baseUrl, "https://api.openai.com/v1"),
        model: asString(matchingApi.model, "text-embedding-3-small"),
        apiKey: asString(matchingApi.apiKey, ""),
        batchSize: asNumber(matchingApi.batchSize, 32)
      },
      local: {
        model: asString(matchingLocal.model, "Xenova/all-MiniLM-L6-v2"),
        batchSize: asNumber(matchingLocal.batchSize, 16)
      },
      paperLimit: asNumber(matching.paperLimit, 10),
      maxPaperAgeDays: asNumber(matching.maxPaperAgeDays, 7)
    },
    summary: {
      enabled: asBoolean(summary.enabled, false),
      baseUrl: asString(summary.baseUrl, "https://api.openai.com/v1"),
      model: asString(summary.model, "gpt-4o-mini"),
      apiKey: asString(summary.apiKey, ""),
      language: asString(summary.language, "English"),
      maxTokens: asNumber(summary.maxTokens, 1024)
    },
    delivery: {
      mode: "smtp",
      from: asString(delivery.from, ""),
      to: asString(delivery.to, ""),
      smtpHost: asString(delivery.smtpHost, ""),
      smtpPort: asNumber(delivery.smtpPort, 465),
      smtpPassword: asString(delivery.smtpPassword, "")
    },
    runtime: {
      debug: asBoolean(runtime.debug, false),
      sendEmpty: asBoolean(runtime.sendEmpty, false)
    }
  };
}

export function loadAppConfig(env: Env = process.env, explicitConfigText?: string): AppConfig {
  const configText = explicitConfigText ?? (env.APP_CONFIG?.trim() ? env.APP_CONFIG : undefined) ?? readLocalConfig();

  if (configText === undefined) {
    throw new Error("Missing app config. Set APP_CONFIG or provide a local config file.");
  }

  return normalizeAppConfig(asRecord(resolveConfigReferences(parseAppConfigJson(configText), env)));
}
