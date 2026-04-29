# Paper Feed Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the paper feed pipeline into a fork-friendly app with a new JSON config model, equal profile and Zotero onboarding paths, unified matching, configurable feeds, explicit CLI modes, and a redesigned email digest.

**Architecture:** Replace the current Zotero-first runtime with a normalized interest-corpus pipeline. Build the refactor around a clean config boundary, then route feed loading, ranking, summaries, and delivery through that new model. Keep the branch temporarily breakable during the rewrite, but finish with one coherent runtime and test suite.

**Tech Stack:** TypeScript, Node.js 20+, Vitest, Nodemailer, RSS Parser, js-yaml or JSON parsing utilities, `@huggingface/transformers`, GitHub Actions

---

## File Structure

**Create:**
- `docs/superpowers/specs/2026-04-30-paper-feed-refactor-design.md`
- `docs/superpowers/plans/2026-04-30-paper-feed-refactor.md`
- `src/app-config.ts`
- `src/interest-profile.ts`
- `src/interest-corpus.ts`
- `src/feed-sources.ts`
- `src/matching.ts`
- `src/cli.ts`
- `tests/app-config.test.ts`
- `tests/interest-corpus.test.ts`
- `tests/feed-sources.test.ts`
- `tests/matching.test.ts`
- `tests/cli.test.ts`

**Modify:**
- `src/index.ts`
- `src/email.ts`
- `src/rss.ts`
- `src/summary.ts`
- `src/types.ts`
- `src/zotero.ts`
- `package.json`
- `.github/workflows/daily.yml`
- `.github/workflows/test.yml`
- `.github/workflows/ci.yml`
- `README.md`
- `data/journals.config.ts`

**Delete or stop importing:**
- `src/config.ts`
- `src/recommender.ts`
- `src/embeddingRanker.ts`
- `tests/config.test.ts`
- `tests/recommender.test.ts`

### Task 1: Define The New Domain Types

**Files:**
- Modify: `src/types.ts`
- Test: `tests/matching.test.ts`

- [ ] **Step 1: Write the failing type-shape test**

```ts
import { describe, expect, it } from "vitest";
import type { InterestDocument, FeedSource, RecommendedPaper } from "../src/types.js";

describe("new domain types", () => {
  it("supports neutral interest and recommendation shapes", () => {
    const interest: InterestDocument = {
      source: "profile",
      title: "Urban climate adaptation",
      text: "Mobility justice and climate resilience",
      topics: ["mobility", "climate"]
    };

    const feed: FeedSource = {
      name: "Nature Cities",
      rss: "https://example.test/feed.xml",
      kind: "catalog"
    };

    const paper: RecommendedPaper = {
      journal: "Nature Cities",
      title: "Transit accessibility improves climate resilience",
      abstract: "Abstract",
      url: "https://example.test/paper",
      publishedAt: null,
      score: 0.91,
      matchContext: {
        bestMatchSource: "profile",
        bestMatchTitle: "Urban climate adaptation",
        bestMatchTopics: ["mobility"]
      }
    };

    expect(interest.source).toBe("profile");
    expect(feed.kind).toBe("catalog");
    expect(paper.matchContext?.bestMatchTitle).toBe("Urban climate adaptation");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/matching.test.ts`
Expected: FAIL because `InterestDocument`, `FeedSource`, and `RecommendedPaper` do not exist with the new shape.

- [ ] **Step 3: Write minimal implementation**

```ts
export type FeedSource = {
  kind: "catalog" | "custom";
  name: string;
  rss: string;
};

export type InterestDocument = {
  source: "profile" | "zotero" | "reference-paper";
  title: string;
  text: string;
  topics: string[];
};

export type MatchContext = {
  bestMatchSource: "profile" | "zotero" | "reference-paper";
  bestMatchTitle: string | null;
  bestMatchTopics: string[];
};

export type RecommendedPaper = FeedPaper & {
  score: number;
  matchContext: MatchContext | null;
  tldr?: string;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/matching.test.ts`
Expected: PASS for the new type-shape assertions.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts tests/matching.test.ts
git commit -m "refactor: define neutral recommendation domain types"
```

### Task 2: Replace Legacy Config Loading With A Canonical App Config Loader

**Files:**
- Create: `src/app-config.ts`
- Create: `tests/app-config.test.ts`
- Modify: `package.json`
- Delete or stop importing: `src/config.ts`, `tests/config.test.ts`

- [ ] **Step 1: Write the failing config-loader tests**

```ts
import { describe, expect, it } from "vitest";
import { loadAppConfig } from "../src/app-config.js";

describe("loadAppConfig", () => {
  it("loads the primary JSON blob from APP_CONFIG", () => {
    const config = loadAppConfig({
      APP_CONFIG: JSON.stringify({
        interests: { profile: { enabled: true, summary: "mobility", topics: [], methods: [], favoriteJournals: [], avoidTopics: [], referencePapers: [] } },
        feeds: { catalogSelections: ["Nature"], customRss: [] },
        matching: { provider: "api", api: { baseUrl: "https://example.test/v1", model: "text-embedding-3-small", apiKeyEnv: "EMBEDDING_API_KEY", batchSize: 8 }, local: { model: "Xenova/all-MiniLM-L6-v2", batchSize: 8 }, paperLimit: 5, maxPaperAgeDays: 7 },
        summary: { enabled: false, baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", apiKeyEnv: "OPENAI_API_KEY", language: "English", maxTokens: 512 },
        delivery: { mode: "smtp", fromEnv: "SENDER", toEnv: "RECEIVER", smtpHostEnv: "SMTP_SERVER", smtpPortEnv: "SMTP_PORT", smtpPasswordEnv: "SENDER_PASSWORD" },
        runtime: { debug: true, sendEmpty: true }
      })
    });

    expect(config.interests.profile?.enabled).toBe(true);
    expect(config.feeds.catalogSelections).toEqual(["Nature"]);
    expect(config.matching.provider).toBe("api");
  });

  it("throws when no app config is provided", () => {
    expect(() => loadAppConfig({})).toThrow("Missing app config. Set APP_CONFIG or provide a local config file.");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/app-config.test.ts`
Expected: FAIL because `loadAppConfig` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export function loadAppConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const raw = env.APP_CONFIG?.trim();
  if (!raw) {
    throw new Error("Missing app config. Set APP_CONFIG or provide a local config file.");
  }

  return JSON.parse(raw) as AppConfig;
}
```

- [ ] **Step 4: Expand implementation to support local file fallback and validation**

```ts
import { existsSync, readFileSync } from "node:fs";

function readLocalConfig(): string | null {
  const path = "config/app.json";
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

export function loadAppConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const raw = env.APP_CONFIG?.trim() || readLocalConfig()?.trim();
  if (!raw) {
    throw new Error("Missing app config. Set APP_CONFIG or provide a local config file.");
  }
  const parsed = JSON.parse(raw) as AppConfig;
  return parsed;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/app-config.test.ts`
Expected: PASS for JSON-blob loading and missing-config failure.

- [ ] **Step 6: Commit**

```bash
git add src/app-config.ts tests/app-config.test.ts package.json
git commit -m "refactor: replace legacy config loader with app config"
```

### Task 3: Build Profile Interest Documents

**Files:**
- Create: `src/interest-profile.ts`
- Create: `tests/interest-corpus.test.ts`

- [ ] **Step 1: Write the failing profile-normalization test**

```ts
import { describe, expect, it } from "vitest";
import { buildProfileInterestDocuments } from "../src/interest-profile.js";

describe("buildProfileInterestDocuments", () => {
  it("turns profile fields and reference papers into interest documents", () => {
    const documents = buildProfileInterestDocuments({
      enabled: true,
      summary: "Mobility justice",
      topics: ["mobility"],
      methods: ["GIS"],
      favoriteJournals: ["Nature Cities"],
      avoidTopics: ["protein folding"],
      referencePapers: [{ title: "Transit justice", abstract: "Access inequity", notes: "Very aligned" }]
    });

    expect(documents).toHaveLength(2);
    expect(documents[0]?.source).toBe("profile");
    expect(documents[1]?.source).toBe("reference-paper");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/interest-corpus.test.ts`
Expected: FAIL because `buildProfileInterestDocuments` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export function buildProfileInterestDocuments(profile: ProfileInterestConfig): InterestDocument[] {
  if (!profile.enabled) {
    return [];
  }

  const base: InterestDocument = {
    source: "profile",
    title: "Interest profile",
    text: [
      profile.summary,
      `Topics: ${profile.topics.join(", ")}`,
      `Methods: ${profile.methods.join(", ")}`,
      `Favorite journals: ${profile.favoriteJournals.join(", ")}`,
      `Avoid topics: ${profile.avoidTopics.join(", ")}`
    ].filter(Boolean).join("\n"),
    topics: profile.topics
  };

  const references = profile.referencePapers.map((paper) => ({
    source: "reference-paper" as const,
    title: paper.title,
    text: [paper.title, paper.abstract, paper.notes].filter(Boolean).join("\n\n"),
    topics: profile.topics
  }));

  return [base, ...references];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/interest-corpus.test.ts`
Expected: PASS for profile normalization.

- [ ] **Step 5: Commit**

```bash
git add src/interest-profile.ts tests/interest-corpus.test.ts
git commit -m "feat: normalize profile interests into documents"
```

### Task 4: Build A Unified Interest Corpus From Profile And Zotero

**Files:**
- Create: `src/interest-corpus.ts`
- Modify: `src/zotero.ts`
- Modify: `tests/interest-corpus.test.ts`
- Modify: `tests/zotero.test.ts`

- [ ] **Step 1: Write the failing corpus-builder test**

```ts
import { describe, expect, it, vi } from "vitest";
import { buildInterestCorpus } from "../src/interest-corpus.js";

describe("buildInterestCorpus", () => {
  it("merges enabled profile and zotero sources", async () => {
    const fetchZoteroDocuments = vi.fn().mockResolvedValue([
      { source: "zotero", title: "Urban transport equity", text: "Abstract text", topics: [] }
    ]);

    const corpus = await buildInterestCorpus(
      {
        profile: { enabled: true, summary: "mobility", topics: ["mobility"], methods: [], favoriteJournals: [], avoidTopics: [], referencePapers: [] },
        zotero: { enabled: true, userId: "123", apiKeyEnv: "ZOTERO_KEY", libraryType: "user", includeCollections: [], excludeCollections: [] }
      },
      { ZOTERO_KEY: "key" },
      fetchZoteroDocuments
    );

    expect(corpus).toHaveLength(2);
    expect(corpus.map((item) => item.source)).toEqual(["profile", "zotero"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/interest-corpus.test.ts`
Expected: FAIL because `buildInterestCorpus` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export async function buildInterestCorpus(
  interests: AppConfig["interests"],
  env: Record<string, string | undefined>,
  fetchZoteroDocuments: typeof fetchZoteroInterestDocuments = fetchZoteroInterestDocuments
): Promise<InterestDocument[]> {
  const profileDocuments = interests.profile ? buildProfileInterestDocuments(interests.profile) : [];
  const zoteroDocuments = interests.zotero?.enabled
    ? await fetchZoteroDocuments(interests.zotero, env)
    : [];

  return [...profileDocuments, ...zoteroDocuments];
}
```

- [ ] **Step 4: Update `src/zotero.ts` to return neutral interest documents**

```ts
export async function fetchZoteroInterestDocuments(
  config: ZoteroInterestConfig,
  env: Record<string, string | undefined>
): Promise<InterestDocument[]> {
  const apiKey = env[config.apiKeyEnv]?.trim();
  if (!config.enabled || !apiKey) {
    return [];
  }

  return fetchedItems.map((item) => ({
    source: "zotero",
    title: item.data.title,
    text: `${item.data.title}\n\n${item.data.abstractNote ?? ""}`.trim(),
    topics: []
  }));
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- tests/interest-corpus.test.ts tests/zotero.test.ts`
Expected: PASS for merged corpus behavior and updated Zotero normalization.

- [ ] **Step 6: Commit**

```bash
git add src/interest-corpus.ts src/zotero.ts tests/interest-corpus.test.ts tests/zotero.test.ts
git commit -m "feat: merge profile and zotero interest sources"
```

### Task 5: Resolve Feed Sources From Catalog And Custom RSS

**Files:**
- Create: `src/feed-sources.ts`
- Create: `tests/feed-sources.test.ts`
- Modify: `data/journals.config.ts`
- Modify: `src/journals.ts`

- [ ] **Step 1: Write the failing feed-source resolution test**

```ts
import { describe, expect, it } from "vitest";
import { resolveFeedSources } from "../src/feed-sources.js";

describe("resolveFeedSources", () => {
  it("merges catalog selections with custom rss feeds", () => {
    const feeds = resolveFeedSources(
      [
        { name: "Nature", abbr: "Nature", rss: "https://nature.test/rss" }
      ],
      {
        catalogSelections: ["Nature"],
        customRss: [{ name: "My Lab Feed", rss: "https://lab.test/rss" }]
      }
    );

    expect(feeds.map((feed) => feed.name)).toEqual(["Nature", "My Lab Feed"]);
    expect(feeds.map((feed) => feed.kind)).toEqual(["catalog", "custom"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/feed-sources.test.ts`
Expected: FAIL because `resolveFeedSources` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export function resolveFeedSources(catalog: Journal[], config: AppConfig["feeds"]): FeedSource[] {
  const selected = filterSubscribedJournals(catalog, config.catalogSelections).map((journal) => ({
    kind: "catalog" as const,
    name: journal.name,
    rss: journal.rss
  }));

  const custom = config.customRss.map((feed) => ({
    kind: "custom" as const,
    name: feed.name,
    rss: feed.rss
  }));

  return [...selected, ...custom];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/feed-sources.test.ts`
Expected: PASS for feed resolution.

- [ ] **Step 5: Commit**

```bash
git add src/feed-sources.ts src/journals.ts data/journals.config.ts tests/feed-sources.test.ts
git commit -m "feat: support catalog and custom rss feed sources"
```

### Task 6: Collapse Matching Into One Module With Temporary Match Metadata

**Files:**
- Create: `src/matching.ts`
- Create: `tests/matching.test.ts`
- Delete or stop importing: `src/recommender.ts`, `src/embeddingRanker.ts`, `tests/recommender.test.ts`

- [ ] **Step 1: Write the failing ranking test**

```ts
import { describe, expect, it } from "vitest";
import { rankPapers } from "../src/matching.js";

describe("rankPapers", () => {
  it("returns ranked papers with temporary match metadata", async () => {
    const ranked = await rankPapers(
      {
        provider: "api",
        api: { baseUrl: "https://example.test/v1", model: "text-embedding-3-small", apiKeyEnv: "EMBEDDING_API_KEY", batchSize: 8 },
        local: { model: "local-model", batchSize: 8 },
        paperLimit: 3,
        maxPaperAgeDays: 7
      },
      [{ journal: "Nature", title: "Transit resilience", abstract: "mobility climate", url: "https://paper.test/1", publishedAt: null }],
      [{ source: "profile", title: "Mobility justice", text: "mobility climate", topics: ["mobility"] }],
      { EMBEDDING_API_KEY: "key" },
      async () => [[1, 0], [1, 0]]
    );

    expect(ranked[0]?.score).toBe(1);
    expect(ranked[0]?.matchContext?.bestMatchSource).toBe("profile");
    expect(ranked[0]?.matchContext?.bestMatchTopics).toEqual(["mobility"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/matching.test.ts`
Expected: FAIL because `rankPapers` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export async function rankPapers(
  config: MatchingConfig,
  candidates: FeedPaper[],
  interests: InterestDocument[],
  env: Record<string, string | undefined>,
  embedTexts?: EmbedTexts
): Promise<RecommendedPaper[]> {
  const embed = embedTexts ?? (await createEmbedder(config, env));
  const candidateTexts = candidates.map((paper) => `${paper.title}\n\n${paper.abstract}`);
  const interestTexts = interests.map((doc) => doc.text);
  const vectors = await embed([...candidateTexts, ...interestTexts]);
  const candidateVectors = vectors.slice(0, candidates.length);
  const interestVectors = vectors.slice(candidates.length);

  return candidates.map((candidate, candidateIndex) => {
    let bestScore = 0;
    let bestDocument: InterestDocument | null = null;

    interestVectors.forEach((interestVector, interestIndex) => {
      const score = cosineSimilarity(candidateVectors[candidateIndex] ?? [], interestVector);
      if (score > bestScore) {
        bestScore = score;
        bestDocument = interests[interestIndex] ?? null;
      }
    });

    return {
      ...candidate,
      score: Math.round(bestScore * 1000) / 1000,
      matchContext: bestDocument
        ? {
            bestMatchSource: bestDocument.source,
            bestMatchTitle: bestDocument.title,
            bestMatchTopics: bestDocument.topics
          }
        : null
    };
  }).sort((left, right) => right.score - left.score).slice(0, config.paperLimit);
}
```

- [ ] **Step 4: Add provider selection with API-first fallback**

```ts
export async function createEmbedder(config: MatchingConfig, env: Record<string, string | undefined>): Promise<EmbedTexts> {
  const apiKey = env[config.api.apiKeyEnv]?.trim();
  if (config.provider === "api" && apiKey && config.api.baseUrl) {
    return createOpenAICompatibleEmbedder(config.api, apiKey);
  }
  return createLocalEmbedder(config.local);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/matching.test.ts`
Expected: PASS for ranked outputs and temporary match metadata.

- [ ] **Step 6: Commit**

```bash
git add src/matching.ts tests/matching.test.ts
git rm src/recommender.ts src/embeddingRanker.ts tests/recommender.test.ts
git commit -m "refactor: unify embedding matching pipeline"
```

### Task 7: Redesign The Email Around The New Match Context

**Files:**
- Modify: `src/email.ts`
- Modify: `tests/email.test.ts`

- [ ] **Step 1: Write the failing email-render test**

```ts
import { describe, expect, it } from "vitest";
import { renderEmail } from "../src/email.js";

describe("renderEmail", () => {
  it("renders editorial cards with lightweight match context and abstract excerpt fallback", () => {
    const html = renderEmail([
      {
        journal: "Nature Cities",
        title: "Transit resilience",
        abstract: "A long abstract about urban climate adaptation and mobility justice.",
        url: "https://paper.test/1",
        publishedAt: new Date("2026-04-30"),
        score: 0.912,
        matchContext: {
          bestMatchSource: "profile",
          bestMatchTitle: "Mobility justice",
          bestMatchTopics: ["mobility", "climate"]
        }
      }
    ]);

    expect(html).toContain("Daily paper feeds");
    expect(html).toContain("Matched your interests");
    expect(html).toContain("Mobility justice");
    expect(html).toContain("Nature Cities");
    expect(html).toContain("urban climate adaptation");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/email.test.ts`
Expected: FAIL because the current template does not render the new copy or metadata.

- [ ] **Step 3: Write minimal implementation**

```ts
function renderMatchContext(paper: RecommendedPaper): string {
  if (paper.matchContext?.bestMatchTitle) {
    return `<p style="margin: 8px 0 0; color: #4b5563; font-size: 13px;">Matched your interests: ${escapeHtml(paper.matchContext.bestMatchTitle)}</p>`;
  }
  if (paper.matchContext?.bestMatchTopics.length) {
    return `<p style="margin: 8px 0 0; color: #4b5563; font-size: 13px;">Matched topics: ${escapeHtml(paper.matchContext.bestMatchTopics.join(", "))}</p>`;
  }
  return "";
}
```

- [ ] **Step 4: Expand the template into the branded bulletin layout**

```ts
return `<!doctype html>
<html>
  <body style="margin:0; background:#f4f1ea; color:#172033;">
    <div style="max-width:720px; margin:0 auto; padding:32px 20px;">
      <h1 style="margin:0 0 8px; font-size:28px; line-height:1.1;">Daily paper feeds</h1>
      <p style="margin:0 0 24px; color:#556070;">A compact research briefing.</p>
      ${cards}
    </div>
  </body>
</html>`;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/email.test.ts`
Expected: PASS for match-context rendering and abstract excerpt fallback.

- [ ] **Step 6: Commit**

```bash
git add src/email.ts tests/email.test.ts
git commit -m "feat: redesign digest email around new recommendation model"
```

### Task 8: Add Explicit CLI Modes And Rewire The Entry Point

**Files:**
- Create: `src/cli.ts`
- Modify: `src/index.ts`
- Create: `tests/cli.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing CLI-mode test**

```ts
import { describe, expect, it } from "vitest";
import { parseCliMode } from "../src/cli.js";

describe("parseCliMode", () => {
  it("defaults to run and supports preview-email, setup-profile, and test-config", () => {
    expect(parseCliMode([])).toBe("run");
    expect(parseCliMode(["preview-email"])).toBe("preview-email");
    expect(parseCliMode(["setup-profile"])).toBe("setup-profile");
    expect(parseCliMode(["test-config"])).toBe("test-config");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/cli.test.ts`
Expected: FAIL because `parseCliMode` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export type CliMode = "run" | "preview-email" | "setup-profile" | "test-config";

export function parseCliMode(args: string[]): CliMode {
  const mode = args[0] as CliMode | undefined;
  return mode ?? "run";
}
```

- [ ] **Step 4: Rewire the runtime through the new pipeline**

```ts
const config = loadAppConfig();
const mode = parseCliMode(process.argv.slice(2));

if (mode === "test-config") {
  console.log("Config is valid.");
  return;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/cli.test.ts`
Expected: PASS for CLI parsing.

- [ ] **Step 6: Commit**

```bash
git add src/cli.ts src/index.ts tests/cli.test.ts package.json
git commit -m "feat: add explicit cli modes"
```

### Task 9: Update GitHub Actions And README For The New Setup Model

**Files:**
- Modify: `.github/workflows/daily.yml`
- Modify: `.github/workflows/test.yml`
- Modify: `.github/workflows/ci.yml`
- Modify: `README.md`

- [ ] **Step 1: Write the failing documentation checklist in the plan review**

```md
- README documents both profile and Zotero setup as equal first-class paths.
- Workflow examples read `APP_CONFIG` rather than writing `CUSTOM_CONFIG` YAML.
- `APP_CONFIG` is stored as a secret because Actions logs can expose non-secret environment values.
```

- [ ] **Step 2: Update the workflow environment model**

```yaml
env:
  APP_CONFIG: ${{ secrets.APP_CONFIG }}
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  EMBEDDING_API_KEY: ${{ secrets.EMBEDDING_API_KEY }}
  ZOTERO_KEY: ${{ secrets.ZOTERO_KEY }}
  SENDER: ${{ secrets.SENDER }}
```

- [ ] **Step 3: Update README setup sections**

```md
## Setup Option 1: Interest Profile

Set `APP_CONFIG` with a `profile` interest source and at least one feed source.

## Setup Option 2: Zotero

Set `APP_CONFIG` with a `zotero` interest source and add `ZOTERO_KEY` as a secret.
```

- [ ] **Step 4: Run verification commands**

Run: `npm run build`
Expected: PASS with no TypeScript errors.

Run: `npm test`
Expected: PASS with updated config, matching, email, and CLI tests.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/daily.yml .github/workflows/test.yml .github/workflows/ci.yml README.md
git commit -m "docs: update workflows and setup guide for app config"
```

### Task 10: Final Cleanup And Removal Of Dead Files

**Files:**
- Modify: `src/index.ts`
- Delete: `src/config.ts`
- Delete: `tests/config.test.ts`
- Review: all imports across `src/` and `tests/`

- [ ] **Step 1: Remove dead imports and legacy names**

```ts
import { loadAppConfig } from "./app-config.js";
import { buildInterestCorpus } from "./interest-corpus.js";
import { resolveFeedSources } from "./feed-sources.js";
import { rankPapers } from "./matching.js";
```

- [ ] **Step 2: Delete obsolete files**

```bash
git rm src/config.ts tests/config.test.ts
```

- [ ] **Step 3: Run full verification**

Run: `npm run build`
Expected: PASS

Run: `npm test`
Expected: PASS

Run: `npm start -- test-config`
Expected: `Config is valid.`

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "refactor: remove legacy config and runtime paths"
```

## Self-Review

- Spec coverage: the plan covers the new config model, equal profile and Zotero paths, feed configuration, unified matching, temporary match metadata, email redesign, CLI modes, workflows, and docs.
- Placeholder scan: the plan uses exact files, explicit commands, and concrete test/code snippets for each task.
- Type consistency: the plan consistently uses `AppConfig`, `InterestDocument`, `FeedSource`, `RecommendedPaper`, `matchContext`, and `rankPapers` as the new neutral surface.
