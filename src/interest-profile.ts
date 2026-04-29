import type { ProfileInterestConfig } from "./app-config.js";
import type { InterestDocument } from "./types.js";

function joinNonEmptyLines(lines: Array<string | undefined>): string {
  return lines.filter((line): line is string => line !== undefined && line.trim() !== "").join("\n");
}

function listLine(label: string, values: string[]): string | undefined {
  return values.length === 0 ? undefined : `${label}: ${values.join(", ")}`;
}

function optionalLine(label: string, value: string | undefined): string | undefined {
  return value === undefined || value.trim() === "" ? undefined : `${label}: ${value}`;
}

export function buildProfileInterestDocuments(profile: ProfileInterestConfig): InterestDocument[] {
  if (!profile.enabled) {
    return [];
  }

  const profileDocument: InterestDocument = {
    source: "profile",
    title: "Interest profile",
    text: joinNonEmptyLines([
      optionalLine("Summary", profile.summary),
      listLine("Topics", profile.topics),
      listLine("Methods", profile.methods),
      listLine("Favorite journals", profile.favoriteJournals),
      listLine("Avoid topics", profile.avoidTopics)
    ]),
    topics: profile.topics
  };

  const referenceDocuments: InterestDocument[] = profile.referencePapers.map((reference) => ({
    source: "reference-paper",
    title: reference.title,
    text: joinNonEmptyLines([
      optionalLine("Title", reference.title),
      optionalLine("Abstract", reference.abstract),
      optionalLine("Notes", reference.notes)
    ]),
    topics: profile.topics
  }));

  return [profileDocument, ...referenceDocuments];
}
