import type { AppConfig, ZoteroInterestConfig } from "./app-config.js";
import { buildProfileInterestDocuments } from "./interest-profile.js";
import type { InterestDocument } from "./types.js";
import { fetchZoteroInterestDocuments } from "./zotero.js";

export async function buildInterestCorpus(
  interests: AppConfig["interests"],
  env: Record<string, string | undefined>,
  fetchZoteroDocuments: (
    config: ZoteroInterestConfig,
    env: Record<string, string | undefined>
  ) => Promise<InterestDocument[]> = fetchZoteroInterestDocuments
): Promise<InterestDocument[]> {
  const documents = buildProfileInterestDocuments(interests.profile);
  console.log(`Built ${documents.length} profile interest documents.`);

  if (interests.zotero.enabled) {
    console.log("Fetching Zotero interest documents...");
    const zoteroDocuments = await fetchZoteroDocuments(interests.zotero, env);
    console.log(`Fetched ${zoteroDocuments.length} Zotero interest documents.`);
    documents.push(...zoteroDocuments);
  } else {
    console.log("Skipping Zotero interest documents.");
  }

  return documents;
}
