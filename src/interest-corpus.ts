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

  if (interests.zotero.enabled) {
    documents.push(...(await fetchZoteroDocuments(interests.zotero, env)));
  }

  return documents;
}
