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
