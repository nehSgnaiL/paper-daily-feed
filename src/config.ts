import yaml from "js-yaml";
import { existsSync, readFileSync } from "node:fs";

export type AppConfig = {
  zotero: {
    userId: string;
    apiKey: string;
    libraryType: "user" | "group";
    includePath: string[] | null;
    excludePath: string[] | null;
  };
  email: {
    sender: string;
    senderPassword: string;
    receiver: string;
    smtpServer: string;
    smtpPort: number;
  };
  maxPaperAgeDays: number;
  maxPapers: number;
  debug: boolean;
  subscriptions: string[] | null;
  embedding: EmbeddingConfig;
  generation: GenerationConfig | null;
  sendEmpty: boolean;
};

export type EmbeddingConfig = {
  provider: "api" | "local";
  apiKey?: string;
  baseUrl?: string;
  model: string;
  batchSize: number | null;
};

export type GenerationConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  language: string;
  maxTokens: number | null;
};

type Env = Record<string, string | undefined>;
type UnknownRecord = Record<string, unknown>;

function required(env: Env, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Expected a number, got ${String(value)}.`);
  }
  return parsed;
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : {};
}

function asString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value).trim();
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

function asStringArray(value: unknown): string[] | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return [String(value).trim()].filter(Boolean);
}

function interpolateEnv(value: string, env: Env): string {
  return value.replace(/\$\{oc\.env:([A-Za-z_][A-Za-z0-9_]*)\}/g, (_match, name: string) => env[name] ?? "");
}

function parseYamlConfig(configText: string, env: Env): UnknownRecord {
  const interpolated = interpolateEnv(configText, env);
  const parsed = yaml.load(interpolated);
  return asRecord(parsed);
}

function mergeConfig(base: unknown, override: unknown): unknown {
  if (Array.isArray(base) || Array.isArray(override)) {
    return override ?? base;
  }
  if (!base || typeof base !== "object" || !override || typeof override !== "object") {
    return override ?? base;
  }

  const merged: UnknownRecord = { ...(base as UnknownRecord) };
  for (const [key, value] of Object.entries(override as UnknownRecord)) {
    merged[key] = mergeConfig(merged[key], value);
  }
  return merged;
}

function loadYamlConfig(env: Env, configText: string, overrideConfigText?: string): AppConfig {
  const config = overrideConfigText
    ? (mergeConfig(parseYamlConfig(configText, env), parseYamlConfig(overrideConfigText, env)) as UnknownRecord)
    : parseYamlConfig(configText, env);
  const zotero = asRecord(config.zotero);
  const email = asRecord(config.email);
  const llm = asRecord(config.llm);
  const llmApi = asRecord(llm.api);
  const generationKwargs = asRecord(llm.generation_kwargs);
  const reranker = asRecord(config.reranker);
  const rerankerApi = asRecord(reranker.api);
  const rerankerLocal = asRecord(reranker.local);
  const executor = asRecord(config.executor);
  const executorReranker = asString(executor.reranker) ?? "local";
  const embeddingBaseUrl = asString(rerankerApi.base_url);
  const apiEmbeddingModel = asString(rerankerApi.model);
  const localEmbeddingModel = asString(rerankerLocal.model);

  return {
    zotero: {
      userId: asString(zotero.user_id) ?? required(env, "ZOTERO_ID"),
      apiKey: asString(zotero.api_key) ?? required(env, "ZOTERO_KEY"),
      libraryType: asString(zotero.library_type) === "group" ? "group" : "user",
      includePath: asStringArray(zotero.include_path),
      excludePath: asStringArray(zotero.exclude_path)
    },
    email: {
      sender: asString(email.sender) ?? required(env, "SENDER"),
      senderPassword: asString(email.sender_password) ?? required(env, "SENDER_PASSWORD"),
      receiver: asString(email.receiver) ?? required(env, "RECEIVER"),
      smtpServer: asString(email.smtp_server) ?? required(env, "SMTP_SERVER"),
      smtpPort: optionalNumber(email.smtp_port) ?? 465
    },
    maxPaperAgeDays: optionalNumber(executor.max_paper_age_days) ?? 7,
    maxPapers: optionalNumber(executor.max_paper_num) ?? 10,
    debug: asBoolean(executor.debug, false),
    subscriptions: asStringArray(executor.source),
    embedding:
      executorReranker === "api" && embeddingBaseUrl
        ? {
            provider: "api",
            apiKey: asString(rerankerApi.key) ?? "",
            baseUrl: embeddingBaseUrl,
            model: apiEmbeddingModel || "text-embedding-3-small",
            batchSize: optionalNumber(rerankerApi.batch_size)
          }
        : {
            provider: "local",
            model: localEmbeddingModel || "jinaai/jina-embeddings-v5-text-nano",
            batchSize: optionalNumber(rerankerLocal.batch_size)
          },
    generation: asString(llmApi.key)
      ? {
          apiKey: asString(llmApi.key) ?? "",
          baseUrl: asString(llmApi.base_url) || "https://api.openai.com/v1",
          model: asString(generationKwargs.model) || "gpt-4o-mini",
          language: asString(llm.language) || "English",
          maxTokens: optionalNumber(generationKwargs.max_tokens)
        }
      : null,
    sendEmpty: asBoolean(executor.send_empty, false)
  };
}

function readConfigFile(path: string): string | undefined {
  return existsSync(path) ? readFileSync(path, "utf8") : undefined;
}

function nonExamplePathFor(path: string): string | null {
  return path.endsWith(".example.yaml") ? path.replace(".example.yaml", ".yaml") : null;
}

export function loadConfig(env: Env = process.env, customConfigText?: string, overrideConfigText?: string): AppConfig {
  const configPath = process.argv[2];
  const configPathText = configPath ? readConfigFile(configPath) : undefined;
  const configPathOverrideText = configPath ? readConfigFile(nonExamplePathFor(configPath) ?? "") : undefined;
  const customYaml = readConfigFile("config/custom.yaml");
  const customExampleYaml = readConfigFile("config/custom.example.yaml");
  const yamlConfig =
    customConfigText ??
    env.CUSTOM_CONFIG ??
    configPathText ??
    customExampleYaml ??
    customYaml;
  if (yamlConfig?.trim()) {
    return loadYamlConfig(
      env,
      yamlConfig,
      overrideConfigText ??
        (customConfigText || env.CUSTOM_CONFIG
          ? undefined
          : configPath
            ? configPathOverrideText
            : customExampleYaml
              ? customYaml
              : undefined)
    );
  }
  throw new Error("Missing config. Set CUSTOM_CONFIG or create config/custom.yaml.");
}
