# Paper Feed Refactor Design

## Goal

Refactor the repo from a Zotero-centric personal script into a fork-friendly paper recommendation pipeline with two equal onboarding paths: interest-profile setup and Zotero setup. The refactor should make configuration friendlier, make matching API-first with a practical local fallback for GitHub Actions, and redesign the email into a branded but email-safe research digest.

## Product Shape

The refactored product keeps one core workflow:

1. Load app configuration.
2. Build an interest corpus from enabled sources.
3. Load feed sources from the bundled catalog and direct RSS definitions.
4. Rank recent papers against the interest corpus.
5. Optionally generate TLDR summaries.
6. Render and optionally send an email digest.

The product should expose two first-class ways to express interests:

- `interestSources.profile`
- `interestSources.zotero`

If both are enabled, the run merges them into one normalized interest corpus. Neither source is treated as a fallback.

## Configuration Model

The current YAML and legacy naming model should be replaced by a clean-break JSON config model. The primary distribution path is a canonical JSON blob in a GitHub repository variable. Secrets remain separate and are injected through GitHub Secrets or local environment variables.

The new config should use a professional but friendly shape:

```json
{
  "interests": {
    "profile": {
      "enabled": true,
      "summary": "Research interest summary",
      "topics": ["mobility", "climate adaptation"],
      "methods": ["causal inference", "GIS"],
      "favoriteJournals": ["Nature Cities"],
      "avoidTopics": ["protein folding"],
      "referencePapers": [
        {
          "title": "Example paper title",
          "abstract": "Optional abstract",
          "notes": "Optional note about why it matters"
        }
      ]
    },
    "zotero": {
      "enabled": false,
      "userId": "",
      "apiKeyEnv": "ZOTERO_KEY",
      "libraryType": "user",
      "includeCollections": [],
      "excludeCollections": []
    }
  },
  "feeds": {
    "catalogSelections": ["Nature", "Science"],
    "customRss": [
      {
        "name": "Example Feed",
        "rss": "https://example.test/feed.xml"
      }
    ]
  },
  "matching": {
    "provider": "api",
    "api": {
      "baseUrl": "https://api.openai.com/v1",
      "model": "text-embedding-3-small",
      "apiKeyEnv": "EMBEDDING_API_KEY",
      "batchSize": 32
    },
    "local": {
      "model": "Xenova/all-MiniLM-L6-v2",
      "batchSize": 16
    },
    "paperLimit": 10,
    "maxPaperAgeDays": 7
  },
  "summary": {
    "enabled": true,
    "baseUrl": "https://api.openai.com/v1",
    "model": "gpt-4o-mini",
    "apiKeyEnv": "OPENAI_API_KEY",
    "language": "English",
    "maxTokens": 1024
  },
  "delivery": {
    "mode": "smtp",
    "fromEnv": "SENDER",
    "toEnv": "RECEIVER",
    "smtpHostEnv": "SMTP_SERVER",
    "smtpPortEnv": "SMTP_PORT",
    "smtpPasswordEnv": "SENDER_PASSWORD"
  },
  "runtime": {
    "debug": false,
    "sendEmpty": false
  }
}
```

The loader should accept the canonical JSON blob and may continue to support a local file path for developer convenience, but the GitHub variable path is primary.

## Domain Model

The refactor should remove Zotero-specific naming from shared types. Internally, the main concepts become:

- `InterestDocument`: one normalized unit of user interest text
- `InterestCorpus`: all normalized interest documents for a run
- `FeedSource`: either a bundled catalog entry or direct custom RSS
- `RecommendedPaper`: ranked paper plus temporary explanation metadata

The ranking result should return temporary metadata used only inside the run, such as:

- `bestMatchSource`
- `bestMatchTitle`
- `bestMatchTopics`

This metadata exists to improve the email digest without creating a separate explanation-generation subsystem.

## Matching Architecture

Matching should remain embedding-based, but the implementation should be unified into one module. The repo currently duplicates embedding logic. The refactor should replace that with one matching service that:

- chooses `api` first when API credentials and base URL are present
- falls back to `local` when API matching is unavailable
- is tuned for GitHub-hosted runners, where cold downloads and CPU inference matter

The API provider should target an OpenAI-compatible embeddings endpoint with configurable base URL and model. The local fallback should optimize for practical runtime on GitHub Actions rather than benchmark-maximal quality.

## Feed Architecture

Feeds should become first-class configuration rather than an implicit checked-in dataset plus filter. The bundled catalog remains useful and should stay in the repo, but users must also be able to define direct RSS feeds in config.

The fetch phase should resolve enabled feed sources into one normalized list of feeds before making RSS requests.

## Email Design

The email should become a portfolio-inspired research bulletin that borrows the theme direction from the GitHub site while remaining email-safe. Exact browser-style liquid glass is not reliable in email clients, so the implementation should approximate that style using:

- a light editorial palette
- rounded cards
- soft borders and highlights
- restrained gradients when safe
- strong heading hierarchy

The email should show:

- paper title
- journal and date
- recommendation score
- optional lightweight explanation line from temporary ranking metadata
- TLDR when available
- otherwise a truncated abstract excerpt

## CLI Modes

The refactor should replace the current single opaque run path with explicit modes:

- `run`
- `preview-email`
- `setup-profile`
- `test-config`

These modes improve fork usability and make GitHub Actions and local testing easier to understand.

## Workflows And Distribution

The GitHub Actions workflows should be updated to read the canonical JSON config variable and existing secrets. The docs should present two equal setup paths:

1. interest-profile setup
2. Zotero setup

The docs should not frame the profile path as a fallback. Both are first-class onboarding choices.

## Risks

- The biggest risk is scope concentration: config, domain, workflows, matching, and email all move together.
- Local fallback quality is constrained by GitHub Actions cold starts.
- Email-client rendering differences require restraint in the visual redesign.

## Non-Goals

- Backward compatibility with the old config schema
- A theme engine for multiple email skins
- LLM-generated explanation paragraphs
- Full provider abstraction for multiple embedding APIs in the first pass
