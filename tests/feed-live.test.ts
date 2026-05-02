import { describe, expect, it } from "vitest";
import journals from "../data/journals.config.js";
import { fetchJournalFeed } from "../src/rss.js";
import type { Journal } from "../src/types.js";

type PublisherSmokeTarget = {
  family: string;
  selection: string;
};

const LIVE_RSS_ENABLED = process.env.PAPER_FEED_LIVE === "1";

const targets: PublisherSmokeTarget[] = [
  { family: "Nature/Springer Nature", selection: "Nature" },
  { family: "Science/AAAS", selection: "Science" },
  { family: "PNAS", selection: "PNAS" },
  { family: "Taylor & Francis", selection: "AAAG" },
  { family: "ScienceDirect/Elsevier", selection: "CEUS" },
  { family: "IEEE Xplore", selection: "IEEE T-ITS" }
];

function findJournal(selection: string): Journal {
  const journal = journals.find((candidate) => candidate.name === selection || candidate.abbr === selection);
  if (!journal) {
    throw new Error(`Missing live RSS smoke target: ${selection}`);
  }
  return journal;
}

const describeLive = LIVE_RSS_ENABLED ? describe : describe.skip;

describeLive("live RSS smoke tests", () => {
  it(
    "fetches at least one valid paper from each current publisher family",
    async () => {
      const results = [];

      for (const target of targets) {
        const journal = findJournal(target.selection);
        const papers = await fetchJournalFeed(journal);
        const firstPaper = papers[0];

        expect(firstPaper, `${target.family} returned no valid papers`).toBeDefined();
        expect(firstPaper?.journal).toBeTruthy();
        expect(firstPaper?.title).toBeTruthy();
        expect(firstPaper?.url).toMatch(/^https?:\/\//);

        results.push({
          family: target.family,
          journal: firstPaper?.journal ?? "",
          date: Boolean(firstPaper?.publishedAt),
          authors: Boolean(firstPaper?.authors?.length),
          firstAffiliation: Boolean(firstPaper?.firstAffiliation)
        });
      }

      console.table(results);
    },
    60_000
  );
});

