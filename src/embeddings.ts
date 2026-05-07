import type { MatchingConfig } from "./app-config.js";

export type EmbedTexts = (texts: string[]) => Promise<number[][]>;

function batchSizeOrDefault(batchSize: number | undefined, defaultValue: number): number {
  return Number.isFinite(batchSize) && batchSize && batchSize > 0 ? batchSize : defaultValue;
}

export async function createOpenAICompatibleEmbedder(
  config: MatchingConfig["api"],
  apiKey: string
): Promise<EmbedTexts> {
  return async (texts: string[]) => {
    const endpoint = `${config.baseUrl.replace(/\/+$/, "")}/embeddings`;
    const batchSize = batchSizeOrDefault(config.batchSize, texts.length || 1);
    const embeddings: number[][] = [];

    for (let start = 0; start < texts.length; start += batchSize) {
      const batch = texts.slice(start, start + batchSize);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
        },
        body: JSON.stringify({
          model: config.model,
          input: batch,
          encoding_format: "float"
        })
      });

      if (!response.ok) {
        throw new Error(`Embedding API request failed (${response.status} ${response.statusText}).`);
      }

      const payload = (await response.json()) as {
        data?: Array<{ index: number; embedding: number[] }>;
      };

      const sorted = [...(payload.data ?? [])].sort((left, right) => left.index - right.index);
      if (sorted.length !== batch.length) {
        throw new Error(`Embedding API returned ${sorted.length} vectors for ${batch.length} texts.`);
      }

      embeddings.push(...sorted.map((item) => item.embedding));
    }

    return embeddings;
  };
}

export async function createLocalEmbedder(config: MatchingConfig["local"]): Promise<EmbedTexts> {
  let extractor: Awaited<ReturnType<typeof import("@huggingface/transformers").pipeline>>;
  try {
    const { env, pipeline } = await import("@huggingface/transformers");
    const hfEndpoint = process.env.HF_ENDPOINT?.trim();
    if (hfEndpoint) {
      env.remoteHost = hfEndpoint.endsWith("/") ? hfEndpoint : `${hfEndpoint}/`;
    }
    extractor = await pipeline("feature-extraction", config.model, {
      dtype: "fp32"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to load local embedding model "${config.model}". Set matching.api.apiKey/EMBEDDING_API_KEY for API embeddings, or make sure the local model is already cached or reachable from Hugging Face. Cause: ${message}`
    );
  }

  return async (texts: string[]) => {
    const batchSize = batchSizeOrDefault(config.batchSize, 16);
    const embeddings: number[][] = [];

    for (let start = 0; start < texts.length; start += batchSize) {
      const batch = texts.slice(start, start + batchSize);
      const output = await extractor(batch, { pooling: "mean", normalize: true });
      embeddings.push(...output.tolist());
    }

    return embeddings;
  };
}

export async function createEmbedder(
  config: MatchingConfig,
  _env: Record<string, string | undefined> = process.env
): Promise<EmbedTexts> {
  const apiKey = config.api.apiKey.trim();
  if (config.provider === "api" && apiKey && config.api.baseUrl) {
    return createOpenAICompatibleEmbedder(config.api, apiKey);
  }

  return createLocalEmbedder(config.local);
}

