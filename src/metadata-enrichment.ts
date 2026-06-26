import type { MetadataEnrichmentConfig } from "./app-config.js";
import { fetchCrossrefWork, findDoi, type CrossrefMetadata } from "./crossref.js";
import type { FeedPaper } from "./types.js";

type EnrichmentDependencies = {
  fetchCrossref?: (doi: string) => Promise<CrossrefMetadata | null>;
};

function paperDoi(paper: FeedPaper): string | undefined {
  return paper.doi ?? findDoi([paper.url, paper.metadataText, paper.title].filter(Boolean).join(" "));
}

function meaningfulAbstract(value: string | undefined): value is string {
  return Boolean(value && /[A-Za-z0-9]/.test(value) && value.replace(/\W/g, "").length >= 20);
}

function mergeCrossrefMetadata(paper: FeedPaper, metadata: CrossrefMetadata): FeedPaper {
  return {
    ...paper,
    doi: metadata.doi,
    title: metadata.title ?? paper.title,
    journal: metadata.journal ?? paper.journal,
    abstract: meaningfulAbstract(metadata.abstract) ? metadata.abstract : paper.abstract,
    publishedAt: metadata.publishedAt ?? paper.publishedAt,
    ...(metadata.authors?.length ? { authors: metadata.authors } : {})
  };
}

export async function enrichFeedPapers(
  papers: FeedPaper[],
  config: MetadataEnrichmentConfig,
  dependencies: EnrichmentDependencies = {}
): Promise<FeedPaper[]> {
  if (!config.enabled || !config.crossref.enabled || papers.length === 0) {
    return papers;
  }

  const fetchCrossref =
    dependencies.fetchCrossref ?? ((doi: string) => fetchCrossrefWork(doi, { mailto: config.crossref.mailto }));
  const enriched: FeedPaper[] = [];
  let repaired = 0;

  for (const paper of papers) {
    const doi = paperDoi(paper);
    if (!doi) {
      enriched.push(paper);
      continue;
    }

    try {
      const metadata = await fetchCrossref(doi);
      if (metadata) {
        enriched.push(mergeCrossrefMetadata(paper, metadata));
        repaired += 1;
      } else {
        enriched.push(paper);
      }
    } catch (error) {
      console.log(`[metadata-enrichment] Crossref skipped for ${doi}: ${error instanceof Error ? error.message : String(error)}`);
      enriched.push(paper);
    }
  }

  console.log(`[metadata-enrichment] Crossref enriched ${repaired}/${papers.length} papers`);
  return enriched;
}
