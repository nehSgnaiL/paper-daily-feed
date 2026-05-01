import type { MatchingConfig } from "./app-config.js";
import type { FeedPaper, InterestDocument, MatchContext, RecommendedPaper } from "./types.js";

export type EmbedTexts = (texts: string[]) => Promise<number[][]>;

function paperText(paper: Pick<FeedPaper, "title" | "abstract">): string {
  return `${paper.title}\n\n${paper.abstract}`;
}

function interestText(interest: InterestDocument): string {
  return `${interest.title}\n\n${interest.text}`;
}

function dedupeCandidates(candidates: FeedPaper[]): FeedPaper[] {
  const seen = new Set<string>();
  const unique: FeedPaper[] = [];

  for (const candidate of candidates) {
    const key = `${candidate.url.trim().toLowerCase()}::${candidate.title.trim().toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(candidate);
    }
  }

  return unique;
}

function cosineSimilarity(left: number[], right: number[]): number {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  const length = Math.min(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftNorm += leftValue * leftValue;
    rightNorm += rightValue * rightValue;
  }

  if (leftNorm === 0 || rightNorm === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function toMatchContext(interest: InterestDocument | undefined): MatchContext | null {
  if (!interest) {
    return null;
  }

  return {
    bestMatchSource: interest.source,
    bestMatchTitle: interest.title || null,
    bestMatchTopics: interest.topics
  };
}

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
    const { pipeline } = await import("@huggingface/transformers");
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

export async function rankPapers(
  config: MatchingConfig,
  candidates: FeedPaper[],
  interests: InterestDocument[],
  env: Record<string, string | undefined>,
  embedTextsMock?: EmbedTexts
): Promise<RecommendedPaper[]> {
  const uniqueCandidates = dedupeCandidates(candidates);
  if (uniqueCandidates.length === 0 || interests.length === 0) {
    return [];
  }

  const embedTexts = embedTextsMock ?? (await createEmbedder(config, env));
  const candidateTexts = uniqueCandidates.map((candidate) => paperText(candidate));
  const interestTexts = interests.map((interest) => interestText(interest));
  const embeddings = await embedTexts([...candidateTexts, ...interestTexts]);
  const candidateEmbeddings = embeddings.slice(0, uniqueCandidates.length);
  const interestEmbeddings = embeddings.slice(uniqueCandidates.length);

  return uniqueCandidates
    .map((candidate, candidateIndex) => {
      let bestScore = Number.NEGATIVE_INFINITY;
      let bestInterest: InterestDocument | undefined;

      interestEmbeddings.forEach((interestEmbedding, interestIndex) => {
        const score = cosineSimilarity(candidateEmbeddings[candidateIndex] ?? [], interestEmbedding);
        if (score > bestScore) {
          bestScore = score;
          bestInterest = interests[interestIndex];
        }
      });

      return {
        ...candidate,
        score: bestScore === Number.NEGATIVE_INFINITY ? 0 : bestScore,
        matchContext: toMatchContext(bestInterest)
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, config.paperLimit);
}
