import type { EmbeddingConfig } from "./config.js";
import type { CorpusPaper, FeedPaper, RankedPaper } from "./types.js";

type EmbedTexts = (texts: string[]) => Promise<number[][]>;

function paperText(paper: Pick<CorpusPaper, "title" | "abstract">): string {
  return `${paper.title}\n\n${paper.abstract}`;
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

export async function createOpenAIEmbedder(config: EmbeddingConfig): Promise<EmbedTexts> {
  return async (texts: string[]) => {
    const endpoint = `${config.baseUrl!.replace(/\/$/, "")}/embeddings`;
    const batchSize = config.batchSize ?? texts.length;
    const embeddings: number[][] = [];

    for (let start = 0; start < texts.length; start += batchSize) {
      const batch = texts.slice(start, start + batchSize);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {})
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

export async function createLocalEmbedder(config: EmbeddingConfig): Promise<EmbedTexts> {
  const { pipeline } = await import("@huggingface/transformers");
  const extractor = await pipeline("feature-extraction", config.model, {
    dtype: "fp32"
  });

  return async (texts: string[]) => {
    const batchSize = config.batchSize ?? 16;
    const embeddings: number[][] = [];

    for (let start = 0; start < texts.length; start += batchSize) {
      const batch = texts.slice(start, start + batchSize);
      const output = await extractor(batch, { pooling: "mean", normalize: true });
      embeddings.push(...output.tolist());
    }

    return embeddings;
  };
}

export async function rankCandidates(
  config: EmbeddingConfig,
  candidates: FeedPaper[],
  corpus: CorpusPaper[],
  maxPapers: number,
  embedTextsMock?: EmbedTexts
): Promise<RankedPaper[]> {
  const uniqueCandidates = dedupeCandidates(candidates);
  if (uniqueCandidates.length === 0 || corpus.length === 0) {
    return [];
  }

  const embedTexts = embedTextsMock ?? (config.provider === "api"
    ? await createOpenAIEmbedder(config)
    : await createLocalEmbedder(config));

  const candidateTexts = uniqueCandidates.map((candidate) => paperText(candidate));
  const corpusTexts = corpus.map((paper) => paperText(paper));
  const embeddings = await embedTexts([...candidateTexts, ...corpusTexts]);
  const candidateEmbeddings = embeddings.slice(0, uniqueCandidates.length);
  const corpusEmbeddings = embeddings.slice(uniqueCandidates.length);

  return uniqueCandidates
    .map((candidate, candidateIndex) => {
      let bestScore = 0;
      let matchedZoteroTitle: string | null = null;

      corpusEmbeddings.forEach((corpusEmbedding, corpusIndex) => {
        const score = cosineSimilarity(candidateEmbeddings[candidateIndex] ?? [], corpusEmbedding);
        if (score > bestScore) {
          bestScore = score;
          matchedZoteroTitle = corpus[corpusIndex]?.title ?? null;
        }
      });

      return {
        ...candidate,
        score: Math.round(bestScore * 1000) / 1000,
        matchedZoteroTitle
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, maxPapers);
}
