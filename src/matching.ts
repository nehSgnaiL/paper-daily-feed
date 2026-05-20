import type { MatchingConfig } from "./app-config.js";
import { createEmbedder, type EmbedTexts } from "./embeddings.js";
import type { FeedPaper, InterestDocument, MatchContext, RecommendedPaper } from "./types.js";

export { createEmbedder, createLocalEmbedder, createOpenAICompatibleEmbedder, type EmbedTexts } from "./embeddings.js";

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

function clampScore(score: number): number {
  return Math.min(1, Math.max(0, score));
}

function centroid(vectors: number[][]): number[] {
  const length = Math.max(...vectors.map((vector) => vector.length), 0);
  if (length === 0 || vectors.length === 0) {
    return [];
  }

  const values = Array.from({ length }, () => 0);
  for (const vector of vectors) {
    for (let index = 0; index < length; index += 1) {
      values[index] = (values[index] ?? 0) + (vector[index] ?? 0);
    }
  }

  return values.map((value) => value / vectors.length);
}

type InterestCluster = {
  id: number;
  interests: InterestDocument[];
  embeddings: number[][];
  centroid: number[];
  weight: number;
};

function interestWeight(interest: InterestDocument): number {
  if (interest.source === "zotero") {
    return 0.65;
  }
  if (interest.source === "reference-paper") {
    return 0.9;
  }
  if (interest.kind === "favorite-journal") {
    return 0.6;
  }
  if (interest.kind === "summary") {
    return 1;
  }
  return 1.15;
}

function clusterWeight(interests: InterestDocument[]): number {
  return interests.reduce((highest, interest) => Math.max(highest, interestWeight(interest)), 0);
}

function buildInterestClusters(
  interests: InterestDocument[],
  embeddings: number[][],
  threshold: number
): InterestCluster[] {
  const clusters: InterestCluster[] = [];

  interests.forEach((interest, index) => {
    const embedding = embeddings[index] ?? [];
    const matchingCluster = clusters.find((cluster) => cosineSimilarity(embedding, cluster.centroid) >= threshold);
    if (matchingCluster) {
      matchingCluster.interests.push(interest);
      matchingCluster.embeddings.push(embedding);
      matchingCluster.centroid = centroid(matchingCluster.embeddings);
      matchingCluster.weight = clusterWeight(matchingCluster.interests);
      return;
    }

    clusters.push({
      id: clusters.length,
      interests: [interest],
      embeddings: [embedding],
      centroid: embedding,
      weight: interestWeight(interest)
    });
  });

  return clusters;
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

function bestInterestInCluster(candidateEmbedding: number[], cluster: InterestCluster): InterestDocument | undefined {
  let bestScore = Number.NEGATIVE_INFINITY;
  let bestInterest: InterestDocument | undefined;

  cluster.embeddings.forEach((interestEmbedding, index) => {
    const score = cosineSimilarity(candidateEmbedding, interestEmbedding);
    if (score > bestScore) {
      bestScore = score;
      bestInterest = cluster.interests[index];
    }
  });

  return bestInterest;
}

type ScoredPaper = RecommendedPaper & {
  clusterId: number;
};

function paperKey(paper: Pick<FeedPaper, "title" | "url">): string {
  return `${paper.url.trim().toLowerCase()}::${paper.title.trim().toLowerCase()}`;
}

function selectHybridClusterDiverse(papers: ScoredPaper[], limit: number): RecommendedPaper[] {
  const byCluster = new Map<number, ScoredPaper[]>();
  for (const paper of papers) {
    const clusterPapers = byCluster.get(paper.clusterId) ?? [];
    clusterPapers.push(paper);
    byCluster.set(paper.clusterId, clusterPapers);
  }

  const selected = new Set<string>();
  const output: ScoredPaper[] = [];
  const clusterOrder = [...byCluster.values()].sort((left, right) => (right[0]?.score ?? 0) - (left[0]?.score ?? 0));

  for (const clusterPapers of clusterOrder) {
    const paper = clusterPapers[0];
    if (!paper || output.length >= limit) {
      break;
    }
    selected.add(paperKey(paper));
    output.push(paper);
  }

  for (const paper of papers) {
    if (output.length >= limit) {
      break;
    }
    if (!selected.has(paperKey(paper))) {
      selected.add(paperKey(paper));
      output.push(paper);
    }
  }

  return output.map(({ clusterId: _clusterId, ...paper }) => paper);
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
  const positiveInterests = interests.filter((interest) => interest.polarity !== "negative");
  const negativeInterests = interests.filter((interest) => interest.polarity === "negative");
  const positiveEmbeddings = interestEmbeddings.filter((_, index) => interests[index]?.polarity !== "negative");
  const negativeEmbeddings = interestEmbeddings.filter((_, index) => interests[index]?.polarity === "negative");
  const positiveClusters = buildInterestClusters(positiveInterests, positiveEmbeddings, config.clusterSimilarityThreshold);
  const negativeClusters = buildInterestClusters(negativeInterests, negativeEmbeddings, config.clusterSimilarityThreshold);
  console.log(
    `Interest clustering: ${positiveInterests.length} positive atoms -> ${positiveClusters.length} clusters; ${negativeInterests.length} avoid atoms -> ${negativeClusters.length} clusters.`
  );

  if (positiveClusters.length === 0) {
    return [];
  }

  const scored = uniqueCandidates
    .map((candidate, candidateIndex) => {
      let bestScore = Number.NEGATIVE_INFINITY;
      let bestCluster: InterestCluster | undefined;
      const candidateEmbedding = candidateEmbeddings[candidateIndex] ?? [];

      positiveClusters.forEach((cluster) => {
        const score = cosineSimilarity(candidateEmbedding, cluster.centroid) * cluster.weight;
        if (score > bestScore) {
          bestScore = score;
          bestCluster = cluster;
        }
      });

      const avoidPenalty = negativeClusters.reduce(
        (highest, cluster) => Math.max(highest, cosineSimilarity(candidateEmbedding, cluster.centroid)),
        0
      );
      const finalScore =
        (bestScore === Number.NEGATIVE_INFINITY ? 0 : bestScore) -
        config.avoidPenaltyWeight * Math.max(0, avoidPenalty);
      const bestInterest = bestCluster ? bestInterestInCluster(candidateEmbedding, bestCluster) : undefined;

      return {
        ...candidate,
        score: clampScore(finalScore),
        matchContext: toMatchContext(bestInterest),
        clusterId: bestCluster?.id ?? -1
      };
    })
    .sort((left, right) => right.score - left.score)
    .filter((paper) => paper.score >= config.minScore);

  return selectHybridClusterDiverse(scored, config.paperLimit);
}
