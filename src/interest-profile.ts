import type { ProfileInterestConfig } from "./app-config.js";
import type { InterestDocument } from "./types.js";

function joinNonEmptyLines(lines: Array<string | undefined>): string {
  return lines.filter((line): line is string => line !== undefined && line.trim() !== "").join("\n");
}

function optionalLine(label: string, value: string | undefined): string | undefined {
  return value === undefined || value.trim() === "" ? undefined : `${label}: ${value}`;
}

export function buildProfileInterestDocuments(profile: ProfileInterestConfig): InterestDocument[] {
  if (!profile.enabled) {
    return [];
  }

  const summaryDocument: InterestDocument[] = profile.summary.trim()
    ? [
        {
          source: "profile",
          title: "Interest summary",
          text: optionalLine("Summary", profile.summary) ?? profile.summary,
          topics: profile.topics,
          kind: "summary",
          label: "Interest summary",
          polarity: "positive"
        }
      ]
    : [];

  const topicDocuments: InterestDocument[] = profile.topics.map((topic) => ({
    source: "profile",
    title: topic,
    text: `Topic: ${topic}`,
    topics: [topic],
    kind: "topic",
    label: topic,
    polarity: "positive"
  }));

  const methodDocuments: InterestDocument[] = profile.methods.map((method) => ({
    source: "profile",
    title: method,
    text: `Method: ${method}`,
    topics: profile.topics,
    kind: "method",
    label: method,
    polarity: "positive"
  }));

  const favoriteJournalDocuments: InterestDocument[] = profile.favoriteJournals.map((journal) => ({
    source: "profile",
    title: journal,
    text: `Favorite journal: ${journal}`,
    topics: profile.topics,
    kind: "favorite-journal",
    label: journal,
    polarity: "positive"
  }));

  const avoidDocuments: InterestDocument[] = profile.avoidTopics.map((topic) => ({
    source: "profile",
    title: topic,
    text: `Avoid topic: ${topic}`,
    topics: [topic],
    kind: "topic",
    label: topic,
    polarity: "negative"
  }));

  const referenceDocuments: InterestDocument[] = profile.referencePapers.map((reference) => ({
    source: "reference-paper",
    title: reference.title,
    text: joinNonEmptyLines([
      optionalLine("Title", reference.title),
      optionalLine("Abstract", reference.abstract),
      optionalLine("Notes", reference.notes)
    ]),
    topics: profile.topics,
    kind: "reference-paper",
    label: reference.title,
    polarity: "positive"
  }));

  return [
    ...summaryDocument,
    ...topicDocuments,
    ...methodDocuments,
    ...favoriteJournalDocuments,
    ...avoidDocuments,
    ...referenceDocuments
  ];
}
