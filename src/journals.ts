import type { Journal } from "./types.js";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function filterSubscribedJournals(journals: Journal[], subscriptions: string[] | null): Journal[] {
  if (subscriptions === null || subscriptions.length === 0) {
    return journals;
  }

  const journalsByName = new Map<string, Journal>();
  for (const journal of journals) {
    journalsByName.set(normalize(journal.name), journal);
    if (journal.abbr) {
      journalsByName.set(normalize(journal.abbr), journal);
    }
  }

  return subscriptions.map((subscription) => {
    const journal = journalsByName.get(normalize(subscription));
    if (!journal) {
      throw new Error(`Unknown journal subscription: ${subscription}`);
    }
    return journal;
  });
}
