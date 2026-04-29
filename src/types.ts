export type Journal = {
  name: string;
  abbr?: string;
  rss: string;
};

export type FeedPaper = {
  journal: string;
  title: string;
  abstract: string;
  url: string;
  publishedAt: Date | null;
};

export type CorpusPaper = {
  title: string;
  abstract: string;
  paths: string[];
};

export type RankedPaper = FeedPaper & {
  score: number;
  matchedZoteroTitle: string | null;
  tldr?: string;
};
