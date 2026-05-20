export type Journal = {
  name: string;
  abbr?: string;
  rss: string;
};

export type FeedSource = {
  kind: "catalog" | "custom";
  name: string;
  rss: string;
};

export type FeedPaper = {
  journal: string;
  title: string;
  abstract: string;
  url: string;
  publishedAt: Date | null;
  authors?: string[];
  firstAffiliation?: string;
  metadataText?: string;
};

export type InterestPolarity = "positive" | "negative";

export type InterestKind = "summary" | "topic" | "method" | "reference-paper" | "zotero-paper" | "favorite-journal";

export type InterestDocument = {
  source: "profile" | "zotero" | "reference-paper";
  title: string;
  text: string;
  topics: string[];
  kind?: InterestKind;
  label?: string;
  polarity?: InterestPolarity;
};

export type MatchContext = {
  bestMatchSource: "profile" | "zotero" | "reference-paper";
  bestMatchTitle: string | null;
  bestMatchTopics: string[];
};

export type CorpusPaper = {
  title: string;
  abstract: string;
  paths: string[];
};

export type RecommendedPaper = FeedPaper & {
  score: number;
  matchContext: MatchContext | null;
  tldr?: string;
};
